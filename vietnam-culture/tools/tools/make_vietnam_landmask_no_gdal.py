#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Make Vietnam landmask from Natural Earth 'ne_10m_land' using only shapely + pyshp (no GDAL).
- Đọc trực tiếp từ .zip (shapefile) HOẶC từ file .shp đã giải nén.
- Cắt theo bbox (GeoJSON polygon(s) hoặc 4 số xmin,ymin,xmax,ymax).
- (Tuỳ chọn) buffer mask vài km để khớp bờ biển với ranh tỉnh khi dùng làm landmask.

Cần: pip install shapely pyshp
python make_vietnam_landmask_no_gdal.py --shp ../data/ne_10m_land/ne_10m_land.shp --bbox-file ../data/bbox_vn_plus_islands.geojson --buffer-deg 0.02 --out ../data/landmask_vietnam.geojson
"""

import io, json, argparse, zipfile
from pathlib import Path
import shapefile  # pyshp
from shapely.geometry import Polygon, MultiPolygon, box, shape, mapping, GeometryCollection
from shapely.ops import unary_union

def signed_area(coords):
    a = 0.0
    n = len(coords)
    if n < 3: return 0.0
    for i in range(n):
        x1,y1 = coords[i]
        x2,y2 = coords[(i+1) % n]
        a += x1*y2 - x2*y1
    return 0.5*a  # >0 ~ CCW, <0 ~ CW (trong hệ lon/lat)

def rings_to_multipolygon(rings):
    """
    Chuyển list[r] (mỗi r là list[(lon,lat)]) -> MultiPolygon.
    Dựa vào orientation: outer ~ clockwise (area<0), hole ~ counterclockwise (area>0).
    Gán hole vào outer chứa nó (theo representative_point).
    """
    outers = []
    holes  = []
    for r in rings:
        if len(r) < 4:  # cần >=4 điểm (điểm đầu = điểm cuối)
            continue
        poly = Polygon(r)
        if not poly.is_valid:
            poly = poly.buffer(0)  # sửa tự động nếu có self-touch
        if poly.is_empty: 
            continue
        if signed_area(r) < 0:
            outers.append({"poly": poly, "ring": r})
        else:
            holes.append({"poly": poly, "ring": r})

    polys = []
    for o in outers:
        o_poly = o["poly"]
        o_holes = []
        for h in holes:
            if o_poly.contains(h["poly"].representative_point()):
                o_holes.append(h["ring"])
        try:
            polys.append(Polygon(o["ring"], holes=o_holes))
        except Exception:
            polys.append(o_poly)

    if not polys:
        # nếu dữ liệu lạ orientation, thử union tất cả rồi trả về
        merged = unary_union([Polygon(r) for r in rings if len(r) >= 4])
        return merged
    if len(polys) == 1:
        return polys[0]
    return MultiPolygon(polys)

def read_land_from_zip(zip_path: Path, shp_name_hint: str = ""):
    """
    Đọc ne_10m_land trực tiếp từ .zip bằng pyshp (không cần giải nén).
    Trả về shapely geometry (unary_union tất cả record).
    """
    with zipfile.ZipFile(zip_path, "r") as zf:
        # Tìm file .shp
        shp_candidates = [n for n in zf.namelist() if n.lower().endswith(".shp")]
        if not shp_candidates:
            raise RuntimeError("Không tìm thấy .shp trong zip")
        if shp_name_hint:
            shp_name = next((n for n in shp_candidates if Path(n).name == shp_name_hint), shp_candidates[0])
        else:
            shp_name = shp_candidates[0]
        base = Path(shp_name).with_suffix("")

        def _read(name):
            return io.BytesIO(zf.read(name))

        shp = _read(str(base) + ".shp")
        shx = _read(str(base) + ".shx")
        dbf = _read(str(base) + ".dbf")

        r = shapefile.Reader(shp=shp, shx=shx, dbf=dbf)
        geoms = []
        for sh in r.shapes():
            pts = sh.points
            parts = list(sh.parts) + [len(pts)]
            rings = []
            for i in range(len(parts)-1):
                seg = pts[parts[i]:parts[i+1]]
                # đảm bảo đóng vòng
                if seg and seg[0] != seg[-1]:
                    seg = seg + [seg[0]]
                rings.append(seg)
            g = rings_to_multipolygon(rings)
            geoms.append(g)
        return unary_union(geoms)

def read_land_from_shp(shp_path: Path):
    """
    Đọc từ .shp đã giải nén (pyshp). Trả về shapely geometry (union).
    """
    r = shapefile.Reader(str(shp_path))
    geoms = []
    for sh in r.shapes():
        pts = sh.points
        parts = list(sh.parts) + [len(pts)]
        rings = []
        for i in range(len(parts)-1):
            seg = pts[parts[i]:parts[i+1]]
            if seg and seg[0] != seg[-1]:
                seg = seg + [seg[0]]
            rings.append(seg)
        g = rings_to_multipolygon(rings)
        geoms.append(g)
    return unary_union(geoms)

def load_bbox_geom(bbox_file: str = "", bbox_nums: str = ""):
    """
    - Nếu bbox_file: đọc GeoJSON (có thể nhiều polygon) -> union.
    - Nếu bbox_nums: 'xmin,ymin,xmax,ymax' -> hộp.
    """
    if bbox_file:
        gj = json.loads(Path(bbox_file).read_text(encoding="utf-8"))
        feats = gj["features"] if gj.get("type")=="FeatureCollection" else [gj]
        geoms = [shape(f["geometry"]) for f in feats if f.get("geometry")]
        return unary_union(geoms)
    if bbox_nums:
        xmin, ymin, xmax, ymax = map(float, bbox_nums.split(","))
        return box(xmin, ymin, xmax, ymax)
    raise RuntimeError("Cần --bbox-file hoặc --bbox")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--zip", help="Đường dẫn ne_10m_land.zip (không cần giải nén)")
    ap.add_argument("--shp", help="Đường dẫn ne_10m_land.shp (nếu đã giải nén)")
    ap.add_argument("--shpname-hint", default="", help="Tên .shp bên trong zip (nếu zip có nhiều layer)")
    ap.add_argument("--bbox-file", default="", help="GeoJSON polygon(s) làm bbox cắt (khuyên dùng)")
    ap.add_argument("--bbox", default="", help="xmin,ymin,xmax,ymax (tuỳ chọn nếu không có bbox-file)")
    ap.add_argument("--buffer-deg", type=float, default=0.02, help="Nới mask (độ) để khớp bờ (vd 0.02~2km)")
    ap.add_argument("--out", required=True, help="landmask_vietnam.geojson")
    args = ap.parse_args()

    if not args.zip and not args.shp:
        raise SystemExit("Cần --zip hoặc --shp")

    # 1) Đọc Land
    if args.zip:
        land = read_land_from_zip(Path(args.zip), shp_name_hint=args.shpname_hint)
    else:
        land = read_land_from_shp(Path(args.shp))

    # 2) Bbox
    bbox_geom = load_bbox_geom(args.bbox_file, args.bbox)

    # 3) Clip + buffer
    vn_land = land.intersection(bbox_geom)
    if args.buffer_deg != 0.0:
        vn_land = vn_land.buffer(args.buffer_deg)

    # 4) Xuất GeoJSON
    out = {
        "type":"FeatureCollection",
        "features":[{"type":"Feature","properties":{"name":"Vietnam landmask"},
                     "geometry": mapping(vn_land)}]
    }
    Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    Path(args.out).write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
    print(f"[DONE] Wrote landmask: {args.out}")

if __name__ == "__main__":
    main()
