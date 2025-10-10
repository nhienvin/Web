#!/usr/bin/env python3
import json, csv, os, math, argparse
from pathlib import Path
from typing import Dict, Tuple, List
from shapely.geometry import shape, mapping, Polygon, MultiPolygon
from shapely.ops import unary_union
from shapely.strtree import STRtree
from shapely import intersection
from pyproj import Transformer

'''
python tools/rebuild_from_geojson.py --in ./data/osm_pipeline_demo/input/VN_Tinh-34.geojson --vw 1200 --vh 1800 --id-field ISO3166-2 --name-field "name:vi" --snap 24
'''
# ---------- helpers ----------
def to_svg_path(geom, sx=1.0, sy=1.0, tx=0.0, ty=0.0) -> str:
    """Convert (Multi)Polygon in projected coords to SVG path 'd' string after affine (sx, sy, tx, ty)."""
    def ring_to_str(coords):
        return " ".join([f"{(x*sx+tx):.1f},{(y*sy+ty):.1f}" for x,y in coords])
    parts = []
    if isinstance(geom, Polygon):
        geoms = [geom]
    else:
        geoms = list(geom.geoms)
    for g in geoms:
        ext = list(g.exterior.coords)
        parts.append("M " + ring_to_str(ext) + " Z")
        for hole in g.interiors:
            h = list(hole.coords)
            parts.append("M " + ring_to_str(h) + " Z")
    return " ".join(parts)

def bbox_of(geom):
    minx, miny, maxx, maxy = geom.bounds
    return minx, miny, maxx, maxy

def normalize_and_fit(geoms, vw, vh):
    """Return affine (sx,sy,tx,ty) to fit all geoms into viewBox [0,vw]x[0,vh], preserving aspect, y-down."""
    minx = min(g.bounds[0] for g in geoms)
    miny = min(g.bounds[1] for g in geoms)
    maxx = max(g.bounds[2] for g in geoms)
    maxy = max(g.bounds[3] for g in geoms)
    w = maxx - minx
    h = maxy - miny
    if w == 0 or h == 0:
        raise RuntimeError("Invalid extent (zero)")
    # y-down for SVG: we flip Y later
    sx = vw / w
    sy = vh / h
    s = min(sx, sy)
    # x,y in projected space -> SVG:
    # Xsvg = (x - minx)*s
    # Ysvg = (maxy - y)*s   (flip so north-up becomes top on screen)
    return s, s, -minx*s, maxy*s

def proj_wgs84_to_mercator():
    # EPSG:4326 (lon,lat) -> EPSG:3857 (x,y meters)
    return Transformer.from_crs("EPSG:4326", "EPSG:3857", always_xy=True)

def centroid_px(geom, sx, sy, tx, ty):
    c = geom.representative_point()  # robust label point
    return (c.x*sx+tx, c.y*sy+ty)

def read_geojson(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)

# ---------- main ----------
def main():
    ap = argparse.ArgumentParser(description="Rebuild atlas / province svgs / anchors / neighbors from a Vietnam GeoJSON")
    ap.add_argument("--in", dest="infile", default="./data/osm_pipeline_demo/input/VN_Tinh-34.geojson")
    ap.add_argument("--landmask", default="", help="Optional landmask GeoJSON to clip provinces")
    ap.add_argument("--outdir", default="osm_pipeline_demo/output")
    ap.add_argument("--vw", type=int, default=1200)
    ap.add_argument("--vh", type=int, default=1800)
    ap.add_argument("--id-field", default="ISO3166-2")
    ap.add_argument("--name-field", default="name:vi")
    ap.add_argument("--snap", type=float, default=24.0)
    ap.add_argument("--slots-json", default="./data/slots.json", help="Where to write slots.json (anchors)")
    ap.add_argument("--assets-provinces", default="./data/osm_pipeline_demo/map/svg", help="Where to write per-province SVGs")
    ap.add_argument("--atlas-svg", default="./data/osm_pipeline_demo/atlas.svg")
    ap.add_argument("--board-svg", default="./data/osm_pipeline_demo/board_blank_outline.svg")
    ap.add_argument("--neighbors-csv", default="./data/osm_pipeline_demo/output/province_neighbors.csv")
    ap.add_argument("--meta-csv", default="./data/osm_pipeline_demo/output/provinces_from_geojson.csv")
    args = ap.parse_args()

    infile = Path(args.infile)
    if not infile.exists():
        raise SystemExit(f"[ERROR] GeoJSON not found: {infile}")

    data = read_geojson(str(infile))
    feats = data["features"]
    if not feats:
        raise SystemExit("[ERROR] No features in GeoJSON")

    # Load landmask if any
    landmask = None
    if args.landmask:
        lm = read_geojson(args.landmask)
        geoms_lm = []
        for f in lm["features"]:
            g = shape(f["geometry"])
            if not g.is_valid: g = g.buffer(0)
            geoms_lm.append(g)
        landmask = unary_union(geoms_lm)

    # Build province geometries (WGS84 -> 3857 projected)
    tr = proj_wgs84_to_mercator()
    provinces = []  # list of dict: id, name, geom3857, rawprops
    for f in feats:
        props = f.get("properties", {})
        pid = props.get(args.id_field) or props.get("ma_tinh") or props.get("code") or props.get("NAME_1")
        name = props.get(args.name_field) or props.get("ten_tinh") or props.get("NAME_1")
        if not pid or not name:
            # Try constructing pid from name (last resort)
            raise SystemExit(f"[ERROR] Missing id/name for feature: props={props}")
        g = shape(f["geometry"])
        if not g.is_valid:
            g = g.buffer(0)
        # clip by landmask
        if landmask is not None:
            g = g.intersection(landmask)
            if g.is_empty:
                print(f"[WARN] {pid} clipped fully by landmask; skip")
                continue
        # project to 3857
        def proj_geom(geom):
            def _proj_coords(coords):
                for (x,y) in coords:
                    X,Y = tr.transform(x, y)
                    yield (X,Y)
            if isinstance(geom, Polygon):
                ext = list(_proj_coords(geom.exterior.coords))
                inters = [list(_proj_coords(r.coords)) for r in geom.interiors]
                return Polygon(ext, inters)
            elif isinstance(geom, MultiPolygon):
                parts = [proj_geom(p) for p in geom.geoms]
                return MultiPolygon(parts)
            else:
                return geom
        g2 = proj_geom(g)
        provinces.append({"id": str(pid), "name": str(name), "geom": g2, "props": props})

    # Fit to viewBox
    geoms = [p["geom"] for p in provinces]
    sx, sy, tx, ty = normalize_and_fit(geoms, args.vw, args.vh)

    # Prepare output
    outdir = Path(args.outdir); ensure_dir(outdir)
    assets_prov = Path(args.assets_provinces); ensure_dir(assets_prov)
    Path("public/assets").mkdir(parents=True, exist_ok=True)

    # 1) atlas.svg + board_blank_outline.svg
    atlas_path = Path(args.atlas_svg)
    board_path = Path(args.board_svg)

    def write_svg(paths: List[Tuple[str,str]], out_path: Path, stroke="#94a3b8", fill="none"):
        out_path.parent.mkdir(parents=True, exist_ok=True)
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {args.vw} {args.vh}">\n')
            for pid, d in paths:
                f.write(f'  <path id="{pid}" d="{d}" fill="{fill}" stroke="{stroke}" stroke-width="1"/>\n')
            f.write('</svg>\n')

    atlas_paths = []
    for p in provinces:
        d = to_svg_path(p["geom"], sx, -sy, tx, ty)  # note -sy & ty for y-down
        atlas_paths.append((p["id"], d))
    write_svg(atlas_paths, atlas_path, stroke="#64748b", fill="none")  # atlas as outline
    write_svg(atlas_paths, board_path, stroke="#94a3b8", fill="none")  # board outline

    # 2) per-province SVG (same viewBox as board), also compute anchors (centroid of clipped geom)
    anchors = []
    for p in provinces:
        d = to_svg_path(p["geom"], sx, -sy, tx, ty)
        # write province svg
        out_svg = assets_prov / f'{p["id"]}.svg'
        with open(out_svg, "w", encoding="utf-8") as f:
            f.write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {args.vw} {args.vh}">\n')
            f.write(f'  <path d="{d}" fill="#ffffff" stroke="#334155" stroke-width="1"/>\n')
            f.write('</svg>\n')
        # anchor (representative point) in px
        ax, ay = centroid_px(p["geom"], sx, -sy, tx, ty)
        anchors.append({"province_id": p["id"], "anchor_x": round(ax,1), "anchor_y": round(ay,1)})

    # 3) slots.json
    slots_path = Path(args.slots_json); slots_path.parent.mkdir(parents=True, exist_ok=True)
    with open(slots_path, "w", encoding="utf-8") as f:
        json.dump(anchors, f, ensure_ascii=False, indent=2)

    # 4) metadata CSV
    meta_csv = Path(args.meta_csv); meta_csv.parent.mkdir(parents=True, exist_ok=True)
    with open(meta_csv, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["province_id","name_vi","region_code","region_name","anchor_x","anchor_y","snap_tolerance_px","svg_path_file"])
        for p in provinces:
            # region_code/name để trống; bạn có thể fill_regions sau
            ax = next(a for a in anchors if a["province_id"]==p["id"])["anchor_x"]
            ay = next(a for a in anchors if a["province_id"]==p["id"])["anchor_y"]
            w.writerow([p["id"], p["name"], "", "", ax, ay, args.snap, f"/map/svg/{p['id']}.svg"])

    # 5) neighbors (kề ranh theo tiếp xúc đường biên > ngưỡng)
    #    Dùng STRtree cho nhanh
    EPS = 1e-6
    geoms_list = [p["geom"].buffer(0) for p in provinces]
    tree = STRtree(geoms_list)
    id_by_geom = {geoms_list[i]: provinces[i]["id"] for i in range(len(provinces))}
    neigh = {}  # pid -> set(pid)
    for i,g in enumerate(geoms_list):
        pid = provinces[i]["id"]
        neigh.setdefault(pid, set())
        for j in tree.query(g):
            if geoms_list[j] is g: continue
            other = geoms_list[j]
            inter = g.boundary.intersection(other.boundary)
            if inter.is_empty:
                continue
            # nếu chung đường (LineString/MultiLineString) với chiều dài đáng kể -> kề ranh
            length = inter.length
            if length > 1000:  # ~1km trong 3857; chỉnh nếu cần
                neigh[pid].add(provinces[j]["id"])
    # viết CSV
    neighbors_csv = Path(args.neighbors_csv)
    with open(neighbors_csv, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["province_id","neighbors"])
        for pid in sorted(neigh.keys()):
            w.writerow([pid, ",".join(sorted(neigh[pid]))])

    print("[OK] Wrote:")
    print("  -", atlas_path)
    print("  -", board_path)
    print("  -", slots_path)
    print("  -", meta_csv)
    print("  -", neighbors_csv)
    print("  -", assets_prov, "/*.svg")

if __name__ == "__main__":
    main()
