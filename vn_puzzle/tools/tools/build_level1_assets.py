#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build Level 1 assets (two-panel layout):
- Left pane: map of provinces (SVG with borders)
- Right pane: vertical grid of name labels (start positions)
- Targets = representative_point() of each province projected into left pane

Usage (from repo root Web):
  python vn_puzzle/tools/build_level1_assets_v2.py \
    --adm1 sources/vn_level1_from_gadm3.geojson \
    --canvas 1280x720 \
    --padding 24 \
    --right-pane 400 \
    --gap 24 \
    --label-cols 1 \
    --out-map public/assets/map/level1_map.svg \
    --out-json public/assets/data/level1_pieces.json

Requires: pip install geopandas shapely fiona pyproj
"""
import argparse, json, os, re, unicodedata, math
from pathlib import Path
import geopandas as gpd
from shapely.ops import unary_union

CAND_FIELDS = ["NAME_1","name_1","ADM1_VI","ADM1_EN","NAME","name","NL_NAME_1","VARNAME_1"]

def slugify(s: str) -> str:
    s = s.lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s

def parse_wh(s):
    w, h = s.lower().split('x')
    return int(w), int(h)

def pick_name(props):
    for k in CAND_FIELDS:
        if k in props and isinstance(props[k], str) and props[k].strip():
            return props[k].strip()
    for k,v in props.items():
        if isinstance(v, str) and "name" in k.lower():
            return v.strip()
    return "Unknown"

def geom_to_paths(geom, proj):
    # Accept Polygon / MultiPolygon
    if geom.geom_type == "Polygon":
        polys = [geom]
    else:
        polys = list(getattr(geom, "geoms", [geom]))
    paths = []
    for poly in polys:
        if poly.is_empty: continue
        ext = list(poly.exterior.coords)
        d = []
        for i,(x,y) in enumerate(ext):
            X,Y = proj(x,y); d.append(("M" if i==0 else "L")+f"{X:.2f},{Y:.2f}")
        d.append("Z")
        for ring in poly.interiors:
            coords = list(ring.coords)
            for i,(x,y) in enumerate(coords):
                X,Y = proj(x,y); d.append(("M" if i==0 else "L")+f"{X:.2f},{Y:.2f}")
            d.append("Z")
        paths.append(' '.join(d))
    return paths

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--adm1', required=True)
    ap.add_argument('--canvas', default='1280x720')
    ap.add_argument('--padding', type=int, default=24, help='Outer padding on all sides (px)')
    ap.add_argument('--right-pane', type=int, default=400, help='Right panel width for label tray (px)')
    ap.add_argument('--gap', type=int, default=24, help='Gap between map and right panel (px)')
    ap.add_argument('--label-cols', type=int, default=1, help='Columns in right label tray (1-2 is typical)')
    ap.add_argument('--font-size', type=int, default=20)
    ap.add_argument('--out-map', default='public/assets/map/level1_map.svg')
    ap.add_argument('--out-json', default='public/assets/data/level1_pieces.json')
    args = ap.parse_args()

    W,H = parse_wh(args.canvas)
    PAD = args.padding
    RWIDTH = args.right_pane
    GAP = args.gap

    # compute panes
    map_x = PAD
    map_y = PAD
    map_w = W - PAD - GAP - RWIDTH - PAD
    map_h = H - 2*PAD
    panel_x = W - PAD - RWIDTH
    panel_y = PAD
    panel_w = RWIDTH
    panel_h = H - 2*PAD

    if map_w <= 0 or map_h <= 0:
        raise SystemExit("Left map area is too small. Increase canvas or reduce right-pane/gap/padding.")

    gdf = gpd.read_file(args.adm1)
    rows = [(pick_name(r), r.geometry) for _,r in gdf.iterrows() if r.geometry and not r.geometry.is_empty]

    # projector for left pane (north-up)
    union_all = unary_union([g for _,g in rows])
    minx,miny,maxx,maxy = union_all.bounds
    dx,dy = (maxx-minx),(maxy-miny)
    def proj(x,y):
        u = (x - minx) / dx if dx else 0.5
        v = (y - miny) / dy if dy else 0.5
        X = map_x + u * map_w
        Y = map_y + (1.0 - v) * map_h
        return X,Y

    # 1) SVG map (borders)
    os.makedirs(os.path.dirname(args.out_map), exist_ok=True)
    path_cmds = []
    for name, geom in rows:
        for d in geom_to_paths(geom, proj):
            path_cmds.append(f'<path d="{d}" />')
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f8fbff"/>
      <stop offset="100%" stop-color="#f2f6ff"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="{W}" height="{H}" fill="url(#bg)"/>
  <g fill="#f7f9fc" stroke="#b8c0ff" stroke-width="1.4">
    {''.join(path_cmds)}
  </g>
  <!-- right panel backdrop (for menu preview; gameplay scene vẽ riêng) -->
  <rect x="{panel_x}" y="{panel_y}" width="{panel_w}" height="{panel_h}" fill="#ffffff" opacity="0.0"/>
</svg>'''
    open(args.out_map, 'w', encoding='utf-8').write(svg)

    # 2) pieces (labels)
    from shapely.geometry import Point
    name_to_target = {}
    for name, geom in rows:
        rp = geom.representative_point()   # always inside polygon
        x,y = proj(rp.x, rp.y)
        name_to_target[name] = (x,y)
    names = sorted([n for n,_ in rows], key=lambda s: unicodedata.normalize('NFD', s))
    n = len(names)

    # right-panel grid: label-cols x rows
    cols = max(1, args.label_cols)
    rows_count = math.ceil(n / cols)
    cell_w = panel_w / cols
    cell_h = panel_h / rows_count
    starts = []
    idx = 0
    for r in range(rows_count):
        for c in range(cols):
            if idx >= n: break
            sx = panel_x + (c + 0.5) * cell_w
            sy = panel_y + (r + 0.5) * cell_h
            starts.append((sx, sy)); idx += 1

    pieces = []
    for i, name in enumerate(names):
        tx, ty = name_to_target[name]
        sx, sy = starts[i]
        pieces.append({
            "id": slugify(name),
            "text": name,
            "start": {"x": round(sx,2), "y": round(sy,2)},
            "target": {"x": round(tx,2), "y": round(ty,2)},
            "fontSize": args.font_size
        })

    os.makedirs(os.path.dirname(args.out_json), exist_ok=True)
    json.dump(pieces, open(args.out_json, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    print("[OK] Wrote:")
    print(" -", args.out_map)
    print(" -", args.out_json)
    print(f"Left map rect: {map_w}x{map_h} at ({map_x},{map_y}); Right pane: {panel_w}x{panel_h}")
if __name__ == '__main__':
    main()
