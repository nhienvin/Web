#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build provinces SVG + CSV from GeoJSON (OSM/Overpass Turbo export)
Usage:
  - Put *.geojson (1 province per file) into: osm_pipeline_demo/input/
  - Run: python build_provinces_svg.py
Outputs:
  - osm_pipeline_demo/provinces_from_osm.csv
  - osm_pipeline_demo/map/svg/<PROVINCE_ID>.svg

Notes:
  - No external deps required. If Shapely is installed, it will be used for nicer label placement.
  - Projection: Web Mercator (spherical), then auto-fit to a fixed SVG viewBox (800x1400) with padding.
  - Credits: If you use OSM data, remember attribution: © OpenStreetMap contributors (ODbL).
"""

import os, json, math, csv, re, sys
from pathlib import Path

# --------- Optional: Shapely support (better centroid/label point) ----------
try:
    from shapely.geometry import shape
    from shapely.ops import unary_union
    HAS_SHAPELY = True
except Exception:
    HAS_SHAPELY = False

# -------------------------- Configs -----------------------------------------
BASE_DIR = Path("../Data/osm_pipeline_demo")
INPUT_DIR = BASE_DIR / "input"
SVG_DIR   = BASE_DIR / "map" / "svg"
CSV_OUT   = BASE_DIR / "provinces_from_osm.csv"

VIEW_W, VIEW_H = 800, 1400
PADDING = 40  # px
DEFAULT_SNAP_TOLERANCE = 18
DEFAULT_DIFFICULTY = 3

# --------------------- Geometry helper (planar fallback) --------------------
def polygon_area(coords):
    # coords: list of [x,y], first point may or may not equal last; shoelace
    if not coords:
        return 0.0
    if coords[0] != coords[-1]:
        coords = coords + [coords[0]]
    a = 0.0
    for i in range(len(coords)-1):
        x1, y1 = coords[i]
        x2, y2 = coords[i+1]
        a += x1*y2 - x2*y1
    return 0.5 * a

def polygon_centroid(coords):
    # centroid of ring (x,y) using shoelace
    if not coords:
        return (0.0, 0.0)
    if coords[0] != coords[-1]:
        coords = coords + [coords[0]]
    A = 0.0; Cx = 0.0; Cy = 0.0
    for i in range(len(coords)-1):
        x1, y1 = coords[i]; x2, y2 = coords[i+1]
        cross = x1*y2 - x2*y1
        A  += cross
        Cx += (x1 + x2) * cross
        Cy += (y1 + y2) * cross
    A *= 0.5
    if abs(A) < 1e-12:
        # fallback: average
        n = max(1, len(coords)-1)
        sx = sum(p[0] for p in coords[:-1])
        sy = sum(p[1] for p in coords[:-1])
        return (sx/n, sy/n)
    return (Cx/(6*A), Cy/(6*A))

# --------------------------- Projection (Mercator) ---------------------------
def mercator_xy(lon, lat):
    """
    lon/lat in degrees -> pseudo-mercator (unitless)
    """
    x = math.radians(lon)  # proportional to lon
    # clamp lat to prevent infinity
    lat = max(min(lat, 85.05112878), -85.05112878)
    y = math.log(math.tan(math.pi/4.0 + math.radians(lat)/2.0))
    return (x, y)

# -------------------------- GeoJSON parsing ---------------------------------
def iter_polygons(geometry):
    """
    Yield polygons as list of rings; each ring is list of [lon, lat] (outer ring then holes)
    """
    if not geometry: 
        return
    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if gtype == "Polygon":
        yield coords
    elif gtype == "MultiPolygon":
        for poly in coords:
            yield poly

def extract_props(props):
    """
    Extract province_id, name_vi, name_en from properties/tags.
    - province_id: prefer ISO3166-2 suffix (VN-XX -> XX). Fallback to file stem (set later).
    - name_vi: name or name:vi
    - name_en: name:en or same as name_vi
    """
    if not isinstance(props, dict):
        props = {}
    # Overpass->GeoJSON usually flattens tags into properties directly.
    # Sometimes tags may be nested under 'tags' (rare in some tools)
    tags = props.get("tags") if isinstance(props.get("tags"), dict) else props

    iso = tags.get("ISO3166-2") or tags.get("ISO3166_2") or ""
    pid = ""
    if isinstance(iso, str) and iso.upper().startswith("VN-"):
        pid = iso.split("-", 1)[1].upper().replace(" ", "")
        # Some are numeric like VN-26; keep as is, but remove leading zeros
        pid = re.sub(r"^0+","", pid)

    name_vi = tags.get("name:vi") or tags.get("name") or ""
    name_en = tags.get("name:en") or name_vi or ""

    return pid, name_vi, name_en

# --------------------- Load all features & project fit -----------------------
def collect_all_projected_points(features):
    """
    Project all polygon vertices using Mercator, return list of (mx,my)
    """
    mm = []
    for feat in features:
        geom = feat.get("geometry") or {}
        for poly in iter_polygons(geom):
            # outer + holes
            for ring in poly:
                for lon, lat in ring:
                    mm.append(mercator_xy(lon, lat))
    return mm

def compute_fit_transform(projected_pts):
    """
    Compute scale + translate to fit all mercator points into fixed VIEW_W x VIEW_H with padding
    """
    xs = [p[0] for p in projected_pts]; ys = [p[1] for p in projected_pts]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    spanx = maxx - minx or 1e-9
    spany = maxy - miny or 1e-9
    scale_x = (VIEW_W - 2*PADDING) / spanx
    scale_y = (VIEW_H - 2*PADDING) / spany
    scale = min(scale_x, scale_y)
    tx = -minx * scale + PADDING + (VIEW_W - 2*PADDING - spanx*scale)/2
    # SVG y grows downward; we want maxy at top padding
    ty = maxy * scale + PADDING + (VIEW_H - 2*PADDING - spany*scale)/2
    return scale, tx, ty, (minx, miny, maxx, maxy)

def to_px(mx, my, scale, tx, ty):
    x = mx * scale + tx
    y = -my * scale + ty
    return (x, y)

# -------------------------- SVG path builder ---------------------------------
def ring_to_path(ring, scale, tx, ty):
    pts = []
    for lon, lat in ring:
        mx, my = mercator_xy(lon, lat)
        x, y = to_px(mx, my, scale, tx, ty)
        pts.append((x, y))
    if not pts:
        return ""
    d = "M " + " L ".join(f"{x:.2f},{y:.2f}" for x,y in pts) + " Z"
    return d

def geometry_to_svg_path_d(geometry, scale, tx, ty):
    # Build single path with multiple subpaths (outer + holes), use fill-rule="evenodd"
    parts = []
    for poly in iter_polygons(geometry):
        for ring in poly:
            parts.append(ring_to_path(ring, scale, tx, ty))
    return " ".join(p for p in parts if p)

# ---------------------------- Centroid / label point -------------------------
def centroid_lonlat(geometry):
    """
    Compute centroid lon/lat. If Shapely present -> geometry.centroid.
    Else use area-weighted centroid across polygons (planar in lon/lat, acceptable for VN).
    """
    if HAS_SHAPELY:
        try:
            shp = shape(geometry)
            c = shp.centroid
            return (c.x, c.y)
        except Exception:
            pass

    # Fallback planar centroid
    tot_area = 0.0
    cx = 0.0; cy = 0.0
    for poly in iter_polygons(geometry):
        if not poly: 
            continue
        outer = poly[0]
        area = abs(polygon_area(outer))
        if area < 1e-12:
            continue
        lon, lat = polygon_centroid(outer)
        tot_area += area
        cx += lon * area
        cy += lat * area
    if tot_area == 0:
        # last resort: average all outer ring points
        xs = []; ys = []
        for poly in iter_polygons(geometry):
            if poly:
                for lon, lat in poly[0]:
                    xs.append(lon); ys.append(lat)
        if xs:
            return (sum(xs)/len(xs), sum(ys)/len(ys))
        return (0.0, 0.0)
    return (cx/tot_area, cy/tot_area)

def label_point_px(geometry, scale, tx, ty):
    """
    Pixel position for label anchor.
    If Shapely available -> representative_point() (guaranteed inside).
    Else -> projected centroid.
    """
    if HAS_SHAPELY:
        try:
            shp = shape(geometry)
            rp = shp.representative_point()
            mx, my = mercator_xy(rp.x, rp.y)
            return to_px(mx, my, scale, tx, ty)
        except Exception:
            pass
    # fallback: centroid
    lon, lat = centroid_lonlat(geometry)
    mx, my = mercator_xy(lon, lat)
    return to_px(mx, my, scale, tx, ty)

# ------------------------------- Main process --------------------------------
def main():
    INPUT_DIR.mkdir(parents=True, exist_ok=True)
    SVG_DIR.mkdir(parents=True, exist_ok=True)
    # Load all GeoJSON features (assume each file is ONE province relation)
    features = []
    file_entries = []  # keep mapping file->feature
    for gj_path in sorted(INPUT_DIR.glob("*.geojson")):
        try:
            gj = json.loads(gj_path.read_text(encoding="utf-8"))
        except Exception as e:
            print(f"[WARN] Cannot read {gj_path.name}: {e}")
            continue
        # Accept Feature or FeatureCollection
        feats = []
        if gj.get("type") == "Feature":
            feats = [gj]
        elif gj.get("type") == "FeatureCollection":
            feats = gj.get("features") or []
        else:
            print(f"[WARN] Unsupported GeoJSON in {gj_path.name}")
            continue

        # Pick first polygon feature
        picked = None
        for f in feats:
            geom = f.get("geometry") or {}
            if geom.get("type") in ("Polygon","MultiPolygon"):
                picked = f
                break
        if not picked:
            print(f"[WARN] No polygon in {gj_path.name}")
            continue

        features.append(picked)
        file_entries.append((gj_path, picked))

    if not features:
        print("[ERROR] No GeoJSON polygon features found in input/.")
        sys.exit(1)

    # Compute projection fit over ALL provinces (consistent viewBox)
    proj_pts = collect_all_projected_points(features)
    scale, tx, ty, bboxm = compute_fit_transform(proj_pts)
    print(f"[INFO] Fit Mercator bbox: {bboxm}, scale={scale:.2f}, tx={tx:.2f}, ty={ty:.2f}")

    # Prepare CSV header
    fields = [
        "province_id","name_vi","name_en","region_code","region_name",
        "lat","lon","svg_path_file","label_anchor_px_x","label_anchor_px_y",
        "snap_tolerance_px","difficulty_1to5"
    ]
    rows = []

    # Process each province
    for gj_path, feat in file_entries:
        props = feat.get("properties") or {}
        geometry = feat.get("geometry") or {}

        pid, name_vi, name_en = extract_props(props)
        if not pid:
            # fallback: filename stem
            pid = gj_path.stem.upper()

        # Clean names
        name_vi = name_vi or pid
        name_en = name_en or name_vi

        # Centroid (lon/lat)
        clon, clat = centroid_lonlat(geometry)

        # Label anchor in PX
        ax, ay = label_point_px(geometry, scale, tx, ty)

        # SVG path
        d = geometry_to_svg_path_d(geometry, scale, tx, ty)
        svg_path = SVG_DIR / f"{pid}.svg"
        svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VIEW_W} {VIEW_H}">
  <path d="{d}" fill="#E5E7EB" stroke="#374151" stroke-width="1" fill-rule="evenodd"/>
</svg>'''
        svg_path.write_text(svg, encoding="utf-8")

        row = {
            "province_id": pid,
            "name_vi": name_vi,
            "name_en": name_en,
            "region_code": "",         # TODO: điền sau bằng bảng tra
            "region_name": "",         # TODO: điền sau bằng bảng tra
            "lat": f"{clat:.6f}",
            "lon": f"{clon:.6f}",
            "svg_path_file": f"map/svg/{pid}.svg",
            "label_anchor_px_x": f"{ax:.1f}",
            "label_anchor_px_y": f"{ay:.1f}",
            "snap_tolerance_px": DEFAULT_SNAP_TOLERANCE,
            "difficulty_1to5": DEFAULT_DIFFICULTY
        }
        rows.append(row)
        print(f"[OK] {pid:>6}  {name_vi}  ->  {svg_path}")

    # Write CSV
    with open(CSV_OUT, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow(r)

    print(f"\n[DONE] Wrote CSV: {CSV_OUT}  ({len(rows)} provinces)")
    print("      SVG files in:", SVG_DIR)

if __name__ == "__main__":
    main()
