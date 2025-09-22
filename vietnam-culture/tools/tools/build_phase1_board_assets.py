#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 1 board assets builder (from province GeoJSON)
- Có inset "quần đảo xa" để không làm co map chính.
- Đọc lại anchors từ provinces_from_osm.csv nếu có (giữ đúng anchor đã duyệt).
- Cố định viewBox 800x1400 để khớp 1:1 giữa board và các mảnh tỉnh.

Outputs:
  - osm_pipeline_demo/board_with_borders.svg
  - osm_pipeline_demo/board_blank_outline.svg
  - osm_pipeline_demo/labels_level3.svg
  - osm_pipeline_demo/slots.json
  - osm_pipeline_demo/atlas.svg
Usage:
  python build_phase1_board_assets.py --input osm_pipeline_demo/input \
      --anchors-csv osm_pipeline_demo/provinces_from_osm.csv
"""

import os, json, math, argparse, csv, re
from pathlib import Path

# Optional: shapely cho representative_point() (điểm nằm trong polygon)
try:
    from shapely.geometry import shape
    HAS_SHAPELY = True
except Exception:
    HAS_SHAPELY = False

# ----------------- Cấu hình khung vẽ & inset mặc định -----------------
VIEW_W, VIEW_H = 800, 1400
PADDING = 40          # padding quanh map chính
FONT_SIZE = 12        # px cho labels
# Inset box mặc định (góc dưới phải)
INSET_X = 1000         # toạ độ góc trái-trên của inset (px)
INSET_Y = 1120
INSET_W = 240         # kích thước inset (px)
INSET_H = 240
INSET_PAD = 8         # padding trong inset (px)
# Quy tắc phát hiện "vòng xa" để đưa vào inset:
INSET_LON_MIN = 110.5 # các ring có kinh độ tâm > ngưỡng này coi là "xa" (ví dụ Hoàng Sa/Trường Sa)

# ----------------- Tiện ích chuỗi/id -----------------
def canon_pid(s: str) -> str:
    """Chuẩn hoá id: bỏ 'VN-' đầu, bỏ số 0 đầu, uppercase."""
    s = (s or "").strip().upper()
    if s.startswith("VN-"):
        s = s[3:]
    s = re.sub(r"^0+", "", s)
    return s

# ----------------- Chiếu Mercator -----------------
def mercator_xy(lon, lat):
    x = math.radians(lon)
    lat = max(min(lat, 85.05112878), -85.05112878)
    y = math.log(math.tan(math.pi/4 + math.radians(lat)/2))
    return x, y

def to_px(mx, my, scale, tx, ty):
    return mx*scale + tx, -my*scale + ty

# ----------------- Hình học fallback -----------------
def polygon_area(coords):
    if not coords: return 0.0
    if coords[0] != coords[-1]:
        coords = coords + [coords[0]]
    a = 0.0
    for i in range(len(coords)-1):
        x1,y1 = coords[i]; x2,y2 = coords[i+1]
        a += x1*y2 - x2*y1
    return 0.5*a

def polygon_centroid(coords):
    if not coords: return (0.0, 0.0)
    if coords[0] != coords[-1]:
        coords = coords + [coords[0]]
    A=0.0; Cx=0.0; Cy=0.0
    for i in range(len(coords)-1):
        x1,y1 = coords[i]; x2,y2 = coords[i+1]
        cross = x1*y2 - x2*y1
        A += cross; Cx += (x1+x2)*cross; Cy += (y1+y2)*cross
    A *= 0.5
    if abs(A) < 1e-12:
        n = max(1, len(coords)-1)
        sx = sum(p[0] for p in coords[:-1]); sy = sum(p[1] for p in coords[:-1])
        return sx/n, sy/n
    return Cx/(6*A), Cy/(6*A)

# ----------------- GeoJSON helpers -----------------
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
    # lọc feature có polygon/multipolygon
    ok = []
    for f in feats:
        for _ in iter_polygons(f.get("geometry") or {}):
            ok.append(f); break
    return ok

def props_to_ids(props, fallback_id):
    tags = props.get("tags") if isinstance(props.get("tags"), dict) else props
    iso = (tags.get("ISO3166-2") or tags.get("ISO3166_2") or "").strip()
    pid = canon_pid(iso) or canon_pid(fallback_id)
    name_vi = tags.get("name:vi") or tags.get("name") or pid
    name_en = tags.get("name:en") or name_vi
    return pid, name_vi, name_en, iso.upper()

# ----------------- Fit map chính & inset -----------------
def collect_pts_for_fit(features, lon_threshold=INSET_LON_MIN):
    """Chỉ gom các điểm KHÔNG 'xa' để fit map chính (loại các ring có tâm lon > threshold)."""
    pts = []
    for f in features:
        geom = f.get("geometry") or {}
        for poly in iter_polygons(geom):
            # tâm ring theo lon/lat
            for ring in poly:
                cx, cy = polygon_centroid(ring)
                if cx > lon_threshold:
                    continue  # ring 'xa' -> cho vào inset, không tính vào fit chính
                for lon,lat in ring:
                    pts.append(mercator_xy(lon, lat))
    return pts

def compute_fit(projected_pts, width, height, padding):
    xs = [p[0] for p in projected_pts]; ys = [p[1] for p in projected_pts]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    spanx = maxx-minx or 1e-9
    spany = maxy-miny or 1e-9
    sx = (width - 2*padding)/spanx
    sy = (height - 2*padding)/spany
    scale = min(sx, sy)
    tx = -minx*scale + padding + (width - 2*padding - spanx*scale)/2
    ty =  maxy*scale + padding + (height- 2*padding - spany*scale)/2
    return scale, tx, ty, (minx, miny, maxx, maxy)

def ring_to_path(ring, scale, tx, ty):
    pts = []
    for lon,lat in ring:
        mx,my = mercator_xy(lon, lat)
        x,y = to_px(mx, my, scale, tx, ty)
        pts.append((x,y))
    if not pts: return ""
    return "M " + " L ".join(f"{x:.2f},{y:.2f}" for x,y in pts) + " Z"

def bbox_px_of_rings(rings_px):
    xs, ys = [], []
    for ring in rings_px:
        for x,y in ring:
            xs.append(x); ys.append(y)
    if not xs: return (0,0,0,0)
    return (min(xs), min(ys), max(xs)-min(xs), max(ys)-min(ys))

# ----------------- Đọc anchors CSV (tuỳ chọn) -----------------
def load_anchor_overrides(csv_path: Path):
    """Trả về dict pid -> (ax, ay) nếu CSV tồn tại và có cột label_anchor_px_x/y."""
    if not csv_path or not csv_path.exists():
        return {}
    anchors = {}
    # Hỗ trợ BOM/sep=,
    with open(csv_path, "r", encoding="utf-8-sig") as f:
        first = f.readline()
        if not first.startswith("province_id"):
            # có thể là dòng "sep=," → đọc lại từ đầu
            f.seek(0)
        reader = csv.DictReader(f)
        for row in reader:
            pid = canon_pid(row.get("province_id",""))
            ax = row.get("label_anchor_px_x")
            ay = row.get("label_anchor_px_y")
            if pid and ax and ay:
                try:
                    anchors[pid] = (float(ax), float(ay))
                except Exception:
                    pass
    return anchors

# ----------------- Main -----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", default="osm_pipeline_demo/input", help="Folder chứa *.geojson (mỗi tỉnh 1 file)")
    ap.add_argument("--anchors-csv", default="osm_pipeline_demo/provinces_from_osm.csv",
                    help="CSV anchors để giữ nguyên label (tùy chọn)")
    ap.add_argument("--viewbox", default=f"{VIEW_W}x{VIEW_H}", help="VD: 800x1400")
    ap.add_argument("--inset-box", default=f"{INSET_X},{INSET_Y},{INSET_W},{INSET_H}",
                    help="x,y,w,h cho inset (px). VD: 520,1060,240,240")
    ap.add_argument("--inset-lon-min", type=float, default=INSET_LON_MIN,
                    help="ngưỡng lon (deg) để coi ring là 'xa' → đưa vào inset")
    ap.add_argument("--inset-pad", type=float, default=INSET_PAD, help="padding trong inset (px)")
    args = ap.parse_args()

    # viewBox
    try:
        vw, vh = map(int, args.viewbox.lower().split("x"))
    except Exception:
        vw, vh = VIEW_W, VIEW_H

    # inset box
    try:
        ix, iy, iw, ih = map(float, args.inset_box.split(","))
    except Exception:
        ix, iy, iw, ih = INSET_X, INSET_Y, INSET_W, INSET_H

    in_dir = Path(args.input)
    out_dir = Path("../Data/osm_pipeline_demo")
    svg_dir = out_dir / "map" / "svg"
    out_dir.mkdir(parents=True, exist_ok=True)
    svg_dir.mkdir(parents=True, exist_ok=True)

    # 1) Đọc anchors override
    anchors = load_anchor_overrides(Path(args.anchors_csv))
    if anchors:
        print(f"[INFO] Loaded anchor overrides from {args.anchors_csv}: {len(anchors)} entries")

    # 2) Tìm file GeoJSON
    files = []
    for pat in ("*.geojson","*.GeoJSON","*.json","*.JSON"):
        files += list(in_dir.glob(pat))
    files = sorted(set(files))
    if not files:
        print("[ERROR] Không thấy file GeoJSON nào trong:", in_dir.resolve()); return

    # 3) Đọc features
    all_feats = []
    per_file = []
    for fp in files:
        try:
            gj = json.loads(fp.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[WARN] {fp.name}: không đọc được ({e})"); continue
        feats = extract_features_any(gj)
        if not feats:
            print(f"[WARN] {fp.name}: không có Polygon/MultiPolygon"); continue
        all_feats.extend(feats)
        per_file.append((fp, feats))

    if not all_feats:
        print("[ERROR] Không có feature polygon."); return

    # 4) Fit map CHÍNH (không tính các ring 'xa')
    proj_pts_main = collect_pts_for_fit(all_feats, lon_threshold=args.inset_lon_min)
    if not proj_pts_main:
        # fallback: fit theo tất cả (hiếm)
        from itertools import chain
        proj_pts_main = []
        for f in all_feats:
            geom = f.get("geometry") or {}
            for poly in iter_polygons(geom):
                for ring in poly:
                    proj_pts_main.extend([mercator_xy(lon, lat) for lon,lat in ring])

    scale, tx, ty, bboxm = compute_fit(proj_pts_main, vw, vh, PADDING)
    print(f"[INFO] Main fit scale={scale:.2f}, tx={tx:.1f}, ty={ty:.1f}")

    # 5) Gom RING 'XA' cho INSET
    inset_rings_lonlat = []   # list of rings (lonlat) toàn quốc
    provinces_data = []       # mỗi tỉnh: d_main, d_inset, anchors, bbox…
    label_text_elems = []
    atlas_symbols = []
    paths_for_board_main = []
    paths_for_board_stroked = []
    slots = []

    # Thu thập tất cả ring xa (lon centroid > threshold)
    def ring_is_remote(ring):
        cx, cy = polygon_centroid(ring)
        return cx > args.inset_lon_min

    # Tính bbox Mercator cho các ring inset để fit vào ô inset
    for fp, feats in per_file:
        for f in feats:
            geom = f.get("geometry") or {}
            for poly in iter_polygons(geom):
                for ring in poly:
                    if ring_is_remote(ring):
                        inset_rings_lonlat.append(ring)

    # Nếu có ring cho inset → tính fit riêng cho inset box
    if inset_rings_lonlat:
        xs=[]; ys=[]
        for ring in inset_rings_lonlat:
            for lon,lat in ring:
                mx,my = mercator_xy(lon, lat); xs.append(mx); ys.append(my)
        minx,maxx = min(xs), max(xs); miny,maxy = min(ys), max(ys)
        spanx = maxx-minx or 1e-9; spany = maxy-miny or 1e-9
        sx = (iw - 2*args.inset_pad)/spanx
        sy = (ih - 2*args.inset_pad)/spany
        inset_scale = min(sx, sy)
        inset_tx = -minx*inset_scale + ix + args.inset_pad + (iw - 2*args.inset_pad - spanx*inset_scale)/2
        inset_ty =  maxy*inset_scale + iy + args.inset_pad + (ih - 2*args.inset_pad - spany*inset_scale)/2
        print(f"[INFO] Inset fit rings={len(inset_rings_lonlat)} scale={inset_scale:.2f}")
    else:
        inset_scale = inset_tx = inset_ty = None

    # 6) Duyệt từng tỉnh → tạo path cho board & atlas, anchor & bbox, label
    for fp, feats in per_file:
        props0 = feats[0].get("properties") or {}
        pid, name_vi, name_en, iso_full = props_to_ids(props0, fallback_id=fp.stem)
        pid_canon = canon_pid(pid)

        d_main_parts = []
        d_inset_parts = []
        rings_px_for_bbox = []

        # gộp tất cả feature trong file
        for f in feats:
            geom = f.get("geometry") or {}
            for poly in iter_polygons(geom):
                for ring in poly:
                    if inset_rings_lonlat and ring_is_remote(ring) and inset_scale:
                        # ring cho inset
                        d_inset_parts.append(ring_to_path(ring, inset_scale, inset_tx, inset_ty))
                    else:
                        # ring cho map chính
                        d_main_parts.append(ring_to_path(ring, scale, tx, ty))
                # px cho bbox (map chính)
                ring_px = []
                for ring in poly:
                    if inset_rings_lonlat and ring_is_remote(ring) and inset_scale:
                        continue  # không tính vào bbox chính
                    mxmy = [mercator_xy(lon, lat) for lon,lat in ring]
                    ring_px.extend([to_px(mx, my, scale, tx, ty) for mx,my in mxmy])
                if ring_px:
                    rings_px_for_bbox.append(ring_px)

        d_main = " ".join(p for p in d_main_parts if p)
        d_inset = " ".join(p for p in d_inset_parts if p)

        # Anchor: ưu tiên CSV override nếu có
        ax = ay = None
        if pid_canon in anchors:
            ax, ay = anchors[pid_canon]
        else:
            # tính từ representative_point/centroid trên map chính
            if HAS_SHAPELY:
                try:
                    from shapely.ops import unary_union
                    shp = unary_union([shape(f["geometry"]) for f in feats])
                    rp = shp.representative_point()
                    mx,my = mercator_xy(rp.x, rp.y)
                    ax, ay = to_px(mx, my, scale, tx, ty)
                except Exception:
                    pass
            if ax is None:
                # fallback: centroid của outer ring lớn nhất (sau chiếu)
                # tìm ring KHÔNG thuộc inset (ưu tiên map chính)
                chosen = None; bestA = -1
                for f in feats:
                    geom = f.get("geometry") or {}
                    for poly in iter_polygons(geom):
                        if not poly: continue
                        outer = poly[0]
                        if inset_rings_lonlat and ring_is_remote(outer) and inset_scale:
                            continue
                        A = abs(polygon_area(outer))
                        if A > bestA:
                            bestA = A; chosen = outer
                if chosen is None:
                    # nếu tỉnh chỉ có ring inset (rất hiếm), lấy từ ring đó nhưng đặt anchor vào inset
                    chosen = feats[0].get("geometry", {}).get("coordinates", [[]])[0] or []
                    if inset_scale:
                        cx, cy = polygon_centroid(chosen)
                        ax, ay = to_px(*mercator_xy(cx, cy), inset_scale, inset_tx, inset_ty)
                else:
                    cx, cy = polygon_centroid(chosen)
                    ax, ay = to_px(*mercator_xy(cx, cy), scale, tx, ty)

        # BBOX px cho slot/hit-test
        bx, by, bw, bh = bbox_px_of_rings(rings_px_for_bbox)

        # Gom path cho board
        if d_main:
            paths_for_board_main.append(d_main)
            paths_for_board_stroked.append(d_main)
        if d_inset:
            paths_for_board_main.append(d_inset)       # bóng tổng cũng cần gồm phần inset
            paths_for_board_stroked.append(d_inset)    # và cả đường biên

        # Label (dùng name_vi)
        label_text_elems.append(
            f'<text x="{ax:.1f}" y="{ay:.1f}" font-family="system-ui, sans-serif" font-size="{FONT_SIZE}" '
            f'text-anchor="middle" fill="#475569">{name_vi}</text>'
        )

        # Atlas symbol (bao gồm cả main + inset để khớp với board)
        d_all = " ".join([d for d in (d_main, d_inset) if d])
        atlas_symbols.append(f'<symbol id="p-{pid_canon}" overflow="visible"><path d="{d_all}"/></symbol>')

        # Slot entry
        slots.append({
            "province_id": pid_canon,
            "name_vi": name_vi,
            "name_en": name_en,
            "anchor_x": round(ax,1),
            "anchor_y": round(ay,1),
            "bbox": {"x": round(bx,1), "y": round(by,1), "w": round(bw,1), "h": round(bh,1)}
        })

    # 7) Xuất board_with_borders.svg
    inset_box_rect = f'<rect x="{ix}" y="{iy}" width="{iw}" height="{ih}" fill="none" stroke="#94A3B8" stroke-dasharray="4 3" stroke-width="0.8"/>'
    inset_label = f'<text x="{ix+iw/2:.1f}" y="{iy-6:.1f}" font-family="system-ui, sans-serif" font-size="11" text-anchor="middle" fill="#64748B">Inset</text>'

    board_with_borders = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}">
  <g fill="#F8FAFC" stroke="#374151" stroke-width="0.8">
    {''.join(f'<path d="{d}"/>' for d in paths_for_board_stroked)}
  </g>
  {inset_box_rect}
  {inset_label}
</svg>'''
    (out_dir / "board_with_borders.svg").write_text(board_with_borders, encoding="utf-8")

    # 8) Xuất board_blank_outline.svg (bóng tổng)
    board_blank = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}">
  <g fill="#E5E7EB" stroke="none">
    {''.join(f'<path d="{d}"/>' for d in paths_for_board_main)}
  </g>
  {inset_box_rect}
  {inset_label}
</svg>'''
    (out_dir / "board_blank_outline.svg").write_text(board_blank, encoding="utf-8")

    # 9) Xuất labels_level3.svg
    labels_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}">
  <g>{''.join(label_text_elems)}</g>
</svg>'''
    (out_dir / "labels_level3.svg").write_text(labels_svg, encoding="utf-8")

    # 10) Xuất slots.json
    (out_dir / "slots.json").write_text(json.dumps(slots, ensure_ascii=False, indent=2), encoding="utf-8")

    # 11) Xuất atlas.svg
    atlas_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw} {vh}">
  <defs>
    {"".join(atlas_symbols)}
  </defs>
</svg>'''
    (out_dir / "atlas.svg").write_text(atlas_svg, encoding="utf-8")

    print("[DONE] Wrote:",
          out_dir / "board_with_borders.svg",
          out_dir / "board_blank_outline.svg",
          out_dir / "labels_level3.svg",
          out_dir / "slots.json",
          out_dir / "atlas.svg", sep="\n  ")

if __name__ == "__main__":
    main()
