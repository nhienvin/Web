#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build province neighbor lists (adjacency) from GeoJSON polygons, with optional landmask clipping.

- KHÔNG dùng extras-map. Đọc trực tiếp *.geojson trong --input.
- Nếu có --landmask và Shapely:
    * Union landmask -> (tuỳ chọn) buffer theo --landmask-buffer-deg
    * Mỗi tỉnh: geom = geom ∩ landmask; lọc mảnh nhỏ theo --min-polygon-area-deg2
- Nếu KHÔNG có Shapely:
    * BỎ QUA landmask (cảnh báo) và dùng fallback bbox overlap.

Outputs:
  --out-json  : { "HN": ["HP", ...], ... }
  --out-csv   : province_id,neighbor_id (UTF-8-BOM, có 'sep=,')

Usage:
python build_neighbors.py --input ../data/osm_pipeline_demo/input --landmask ../data/landmask_vietnam.geojson --landmask-buffer-deg 0.02 --min-polygon-area-deg2 1e-8 --mask-empty-policy keep-empty --mode rook --min-shared-len-deg 0.001 --out-json ../data/osm_pipeline_demo/neighbors.json --out-csv  ../data/osm_pipeline_demo/province_neighbors.csv
"""
import os, json, argparse, re, itertools, csv
from pathlib import Path

# Optional Shapely for precise topology & clipping
try:
    from shapely.geometry import shape, GeometryCollection, Polygon, MultiPolygon
    from shapely.ops import unary_union
    HAS_SHAPELY = True
except Exception:
    HAS_SHAPELY = False

# ----------------- utils -----------------
def canon_pid(s: str) -> str:
    s = (s or "").strip().upper()
    if s.startswith("VN-"):
        s = s[3:]
    s = re.sub(r"^0+","", s)
    return s

def iter_polygons(geometry):
    if not geometry: return
    t = geometry.get("type")
    if t == "Polygon":
        yield geometry["coordinates"]
    elif t == "MultiPolygon":
        for poly in geometry["coordinates"]:
            yield poly
    elif t == "GeometryCollection":
        for g in geometry.get("geometries", []):
            yield from iter_polygons(g)

def extract_features_any(gj):
    feats = []
    if gj.get("type") == "Feature":
        feats = [gj]
    elif gj.get("type") == "FeatureCollection":
        feats = gj.get("features") or []
    elif "geometry" in gj:
        feats = [gj]
    ok = []
    for f in feats:
        geom = f.get("geometry") or {}
        for _ in iter_polygons(geom):
            ok.append(f); break
    return ok

def props_to_id_and_name(props, fallback_id):
    tags = props.get("tags") if isinstance(props.get("tags"), dict) else props
    iso = (tags.get("ISO3166-2") or tags.get("ISO3166_2") or "").strip()
    pid = canon_pid(iso) or canon_pid(fallback_id)
    name_vi = tags.get("name:vi") or tags.get("name") or pid
    return pid, name_vi

# ----------------- loading geoms -----------------
def load_features_as_shapely(gj):
    feats = extract_features_any(gj)
    if not feats:
        return None
    geom = unary_union([shape(f["geometry"]) for f in feats])
    return geom

def load_geoms(input_dir: Path):
    files = []
    for pat in ("*.geojson","*.GeoJSON","*.json","*.JSON"):
        files += list(input_dir.glob(pat))
    files = sorted(set(files))
    if not files:
        raise SystemExit(f"[ERROR] No GeoJSON in {input_dir.resolve()}")

    entries = {}
    for fp in files:
        gj = json.loads(fp.read_text(encoding="utf-8"))
        feats = extract_features_any(gj)
        if not feats:
            print(f"[WARN] {fp.name}: no Polygon/MultiPolygon; skip")
            continue

        props0 = feats[0].get("properties") or {}
        pid, name_vi = props_to_id_and_name(props0, fallback_id=fp.stem)

        if HAS_SHAPELY:
            shp = unary_union([shape(f["geometry"]) for f in feats])
            entries[pid] = {"name": name_vi, "geom": shp, "bbox": shp.bounds}
        else:
            # store bbox only for fallback
            xs=[]; ys=[]
            for f in feats:
                for poly in iter_polygons(f.get("geometry") or {}):
                    for ring in poly:
                        for lon,lat in ring:
                            xs.append(lon); ys.append(lat)
            entries[pid] = {"name": name_vi, "geom": gj, "bbox": (min(xs), min(ys), max(xs), max(ys))}
        print(f"[LOAD] {pid:>6}  {name_vi}  ({fp.name})")
    return entries

# ----------------- landmask clipping -----------------
def drop_small_parts(geom, min_area):
    """Giữ lại Polygon/MultiPolygon, bỏ các phần có area < min_area (đơn vị 'độ^2')."""
    if geom.is_empty:
        return geom
    def _filter(g):
        if isinstance(g, Polygon):
            return g if g.area >= min_area else None
        return g
    if isinstance(geom, Polygon):
        return geom if geom.area >= min_area else GeometryCollection()
    if isinstance(geom, MultiPolygon):
        kept = [p for p in geom.geoms if p.area >= min_area]
        if not kept:
            return GeometryCollection()
        return MultiPolygon(kept)
    # GeometryCollection hoặc kiểu khác: cố gắng gom các polygon lại
    polys = []
    for g in getattr(geom, "geoms", []):
        if isinstance(g, Polygon) and g.area >= min_area:
            polys.append(g)
        elif isinstance(g, MultiPolygon):
            polys.extend([p for p in g.geoms if p.area >= min_area])
    if not polys:
        return GeometryCollection()
    return unary_union(polys)

def apply_landmask(entries, landmask_path: Path, buffer_deg: float, min_area_deg2: float, empty_policy: str):
    if not HAS_SHAPELY:
        print("[WARN] Shapely not available -> --landmask ignored; proceeding without clipping.")
        return entries

    if not landmask_path or not landmask_path.exists():
        print("[WARN] Landmask path not found -> skipping clipping.")
        return entries

    # load landmask geometry
    try:
        gj = json.loads(landmask_path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"[WARN] Cannot read landmask: {e}; skipping.")
        return entries
    lm = load_features_as_shapely(gj)
    if lm is None or lm.is_empty:
        print("[WARN] Landmask has no polygon; skipping.")
        return entries

    if buffer_deg and abs(buffer_deg) > 0:
        lm = lm.buffer(buffer_deg)  # độ -> xấp xỉ; dùng nhỏ (0.01–0.05)

    new_entries = {}
    for pid, info in entries.items():
        shp = info["geom"] if HAS_SHAPELY else None
        if shp is None or getattr(shp, "is_empty", False):
            new_entries[p] = info
            continue
        clipped = shp.intersection(lm)
        clipped = drop_small_parts(clipped, min_area_deg2)
        if clipped.is_empty:
            if empty_policy == "fallback-original":
                print(f"[MASK] {pid}: empty after clip -> fallback original (consider increasing --landmask-buffer-deg)")
                clipped = shp
            else:
                print(f"[MASK] {pid}: empty after clip (keep-empty).")
        new_entries[pid] = {
            "name": info["name"],
            "geom": clipped,
            "bbox": clipped.bounds if not clipped.is_empty else (0,0,0,0)
        }
    return new_entries

# ----------------- neighbors (Shapely) -----------------
def neighbors_with_shapely(entries, mode="rook", min_shared_len_deg=0.0):
    ids = sorted(entries.keys())
    geoms = {pid: entries[pid]["geom"] for pid in ids}
    nbrs = {pid:set() for pid in ids}

    def shared_len(g1, g2):
        inter = g1.boundary.intersection(g2.boundary)
        if inter.is_empty:
            return 0.0
        try:
            return inter.length
        except Exception:
            if isinstance(inter, GeometryCollection):
                return sum(getattr(g, "length", 0.0) for g in inter.geoms)
            return 0.0

    for i, j in itertools.combinations(ids, 2):
        g1, g2 = geoms[i], geoms[j]
        # bbox quick reject
        b1 = g1.bounds if hasattr(g1, "bounds") else None
        b2 = g2.bounds if hasattr(g2, "bounds") else None
        if not b1 or not b2:
            continue
        if b1[0] > b2[2] or b2[0] > b1[2] or b1[1] > b2[3] or b2[1] > b1[3]:
            continue

        if g1.is_empty or g2.is_empty:
            continue

        if mode == "rook":
            if shared_len(g1, g2) > float(min_shared_len_deg):
                nbrs[i].add(j); nbrs[j].add(i)
        else:  # queen
            if g1.touches(g2) or g1.intersects(g2):
                nbrs[i].add(j); nbrs[j].add(i)

    return {k: sorted(v) for k,v in nbrs.items()}

# ----------------- neighbors (fallback bbox) -----------------
def neighbors_fallback_bbox(entries, expand_deg=0.02):
    """
    Approximate: coi như giáp nếu bbox (mở rộng expand_deg) overlap.
    Landmask bị bỏ qua trong fallback (vì không có Shapely để cắt).
    """
    ids = sorted(entries.keys())
    bbox = {pid: entries[pid]["bbox"] for pid in ids}
    nbrs = {pid:set() for pid in ids}
    for i, j in itertools.combinations(ids, 2):
        minx1,miny1,maxx1,maxy1 = bbox[i]
        minx2,miny2,maxx2,maxy2 = bbox[j]
        minx1 -= expand_deg; miny1 -= expand_deg; maxx1 += expand_deg; maxy1 += expand_deg
        minx2 -= expand_deg; miny2 -= expand_deg; maxx2 += expand_deg; maxy2 += expand_deg
        if not (minx1 > maxx2 or minx2 > maxx1 or miny1 > maxy2 or miny2 > maxy1):
            nbrs[i].add(j); nbrs[j].add(i)
    return {k: sorted(v) for k,v in nbrs.items()}

# ----------------- write outputs -----------------
def write_outputs(nbr, out_json: Path, out_csv: Path):
    out_json.parent.mkdir(parents=True, exist_ok=True)
    out_json.write_text(json.dumps(nbr, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[DONE] neighbors.json -> {out_json}")

    out_csv.parent.mkdir(parents=True, exist_ok=True)
    with open(out_csv, "w", encoding="utf-8-sig", newline="") as f:
        f.write("sep=,\n")
        f.write("province_id,neighbor_id\n")
        for i, js in sorted(nbr.items()):
            for j in js:
                f.write(f"{i},{j}\n")
    print(f"[DONE] province_neighbors.csv -> {out_csv}")

# ----------------- main -----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="osm_pipeline_demo/input", help="Folder *.geojson (mỗi tỉnh 1 file)")
    ap.add_argument("--out-json", default="osm_pipeline_demo/neighbors.json")
    ap.add_argument("--out-csv",  default="osm_pipeline_demo/province_neighbors.csv")
    ap.add_argument("--mode", choices=["rook","queen"], default="rook", help="rook=chung cạnh; queen=chạm cạnh/đỉnh")
    ap.add_argument("--min-shared-len-deg", type=float, default=0.0005, help="(Shapely+rook) ngưỡng độ dài biên chung (độ)")
    ap.add_argument("--bbox-expand-deg", type=float, default=0.02, help="(fallback) mở rộng bbox khi không có Shapely")

    # Landmask options
    ap.add_argument("--landmask", default="", help="GeoJSON land mask (VN đất liền + đảo). YÊU CẦU Shapely.")
    ap.add_argument("--landmask-buffer-deg", type=float, default=0.0, help="Buffer mask (độ) để nới/ép bờ biển (ví dụ 0.02)")
    ap.add_argument("--min-polygon-area-deg2", type=float, default=1e-8, help="Bỏ mảnh nhỏ sau khi cắt (độ^2)")
    ap.add_argument("--mask-empty-policy", choices=["keep-empty","fallback-original"], default="keep-empty",
                    help="Khi clip xong rỗng: keep-empty (mặc định) hoặc fallback-original")

    args = ap.parse_args()

    entries = load_geoms(Path(args.input))

    # Apply landmask clipping if provided and Shapely available
    if args.landmask:
        if HAS_SHAPELY:
            entries = apply_landmask(entries, Path(args.landmask), args.landmask_buffer_deg,
                                     args.min_polygon_area_deg2, args.mask_empty_policy)
        else:
            print("[WARN] --landmask provided but Shapely not available -> skipping mask.")

    # Compute neighbors
    if HAS_SHAPELY:
        print("[INFO] Using Shapely for precise neighbors")
        nbr = neighbors_with_shapely(entries, mode=args.mode, min_shared_len_deg=args.min_shared_len_deg)
    else:
        print("[WARN] Shapely not installed; using bbox overlap fallback (approximate). Landmask ignored.")
        nbr = neighbors_fallback_bbox(entries, expand_deg=args.bbox_expand_deg)

    write_outputs(nbr, Path(args.out_json), Path(args.out_csv))

if __name__ == "__main__":
    main()
