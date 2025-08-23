#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse, json, os, unicodedata, re, difflib
from pathlib import Path
import geopandas as gpd
from shapely.ops import unary_union

CANDIDATE_NAME_FIELDS = ["NAME_1","name_1","NAME","name","ADM1_EN","ADM1_VI","province","province_name","wof:name","localname","NL_NAME_1","VARNAME_1"]

def slugify(s):
    s = s.lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s

def norm(s):
    s = s.lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9]+', '', s)
    return s

def pick_name(props):
    for k in CANDIDATE_NAME_FIELDS:
        if k in props and isinstance(props[k], str) and props[k].strip():
            return props[k].strip()
    for k,v in props.items():
        if isinstance(v, str) and "name" in k.lower() and len(v) < 80:
            return v.strip()
    return None

def load_aliases(path):
    if not path or not os.path.exists(path): return {}
    try:
        data = json.load(open(path, encoding="utf-8"))
        return {norm(k): v for k,v in data.items()}
    except Exception as e:
        print("[WARN] Cannot load alias file:", e)
        return {}

def geom_to_svg(geom, width=1000, height=1000, pad=0.02):
    if geom is None or geom.is_empty:
        return '<svg xmlns="http://www.w3.org/2000/svg"></svg>'
    if geom.geom_type == "Polygon":
        polys = [geom]
    elif geom.geom_type == "MultiPolygon":
        polys = list(geom.geoms)
    else:
        geom = geom.convex_hull
        polys = [geom]
    minx, miny, maxx, maxy = geom.bounds
    dx, dy = maxx - minx, maxy - miny
    minx -= dx*pad; maxx += dx*pad
    miny -= dy*pad; maxy += dy*pad
    dx, dy = maxx - minx, maxy - miny

    def proj(x,y):
        u = (x - minx) / dx if dx else 0.5
        v = 1.0 - ((y - miny) / dy if dy else 0.5)
        return (u*width, v*height)

    paths = []
    for poly in polys:
        ext = list(poly.exterior.coords)
        d = []
        for i,(x,y) in enumerate(ext):
            X,Y = proj(x,y)
            d.append(("M" if i==0 else "L")+"{:.2f},{:.2f}".format(X,Y))
        d.append("Z")
        for ring in poly.interiors:
            coords = list(ring.coords)
            for i,(x,y) in enumerate(coords):
                X,Y = proj(x,y)
                d.append(("M" if i==0 else "L")+"{:.2f},{:.2f}".format(X,Y))
            d.append("Z")
        paths.append(' '.join(d))
    path_all = " ".join(paths)
    svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}"><g fill="#cccccc" stroke="#222" stroke-width="2"><path d="{d}" /></g></svg>'.format(w=width,h=height,d=path_all)
    return svg

def main():
    ap = argparse.ArgumentParser(description="Dissolve ADM1 (63-65) to 34 and export SVGs")
    ap.add_argument('adm1_path', help='GeoJSON/Shapefile for VN admin level-1')
    ap.add_argument('--out-dir', default='build')
    ap.add_argument('--data-dir', default='data', help='Dir with vn_units_34.json')
    ap.add_argument('--alias', default=None, help='JSON alias map for name normalization (EN<->VI)')
    ap.add_argument('--export-63', action='store_true', help='Also export per-ADM1 SVG for reference')
    args = ap.parse_args()

    gdf = gpd.read_file(args.adm1_path)
    print("[INFO] Loaded features:", len(gdf))

    mapping_34 = json.load(open(Path(args.data_dir)/"vn_units_34.json", encoding="utf-8"))
    alias = load_aliases(args.alias)

    name_to_geom = {}
    for _, row in gdf.iterrows():
        nm = pick_name(row)
        if not nm: continue
        key = norm(nm)
        key = norm(alias.get(key, nm))
        name_to_geom[key] = row.geometry

    out34 = Path(args.out_dir) / "svg-34"
    out63 = Path(args.out_dir) / "svg-63"
    out34.mkdir(parents=True, exist_ok=True)
    if args.export_63: out63.mkdir(parents=True, exist_ok=True)

    if args.export_63:
        for k, geom in name_to_geom.items():
            open(out63/"{}.svg".format(k), "w", encoding="utf-8").write(geom_to_svg(geom))

    missing_total = []
    for item in mapping_34:
        comps = item["components_from_63"]
        geoms = []
        missing = []
        for c in comps:
            nk = norm(c)
            g = name_to_geom.get(nk)
            if not g:
                ak = norm(alias.get(nk, c))
                g = name_to_geom.get(ak)
            if not g:
                best = difflib.get_close_matches(nk, list(name_to_geom.keys()), n=1, cutoff=0.78)
                if best:
                    print("[FUZZY] {} -> {}".format(c, best[0]))
                    g = name_to_geom.get(best[0])
            if g is None:
                missing.append(c)
            else:
                geoms.append(g)
        if missing:
            print("[WARN] Missing for {}: {}".format(item['name'], missing))
            missing_total.extend(missing); continue
        merged = unary_union(geoms)
        slug = slugify(item["name"])
        open(out34/"{}.svg".format(slug), "w", encoding="utf-8").write(geom_to_svg(merged))
    if missing_total:
        print("[DONE] Completed with missing components:", sorted(set(missing_total)))
    else:
        print("[DONE] All components matched")

if __name__ == "__main__":
    main()
