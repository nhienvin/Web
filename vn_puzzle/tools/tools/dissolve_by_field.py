#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import argparse, geopandas as gpd

DEFAULT_FIELDS = ["NAME_1","name_1","ADM1_VI","ADM1_EN","NL_NAME_1","VARNAME_1"]

def main():
  ap = argparse.ArgumentParser(description="Dissolve arbitrary admin dataset (e.g., GADM level-3) into ADM1 by field")
  ap.add_argument("input", help="GADM/HDX/OSM dataset (GeoJSON/Shapefile)")
  ap.add_argument("--field", default=None, help="Field to dissolve by (default: try common fields)")
  ap.add_argument("--out", default="sources/vn_level1_from_any.geojson", help="Output GeoJSON path")
  args = ap.parse_args()

  gdf = gpd.read_file(args.input)
  cols = list(gdf.columns)
  field = args.field or next((c for c in DEFAULT_FIELDS if c in cols), None)
  if not field:
    raise SystemExit(f"No suitable field found in columns: {cols[:10]} ... Provide --field explicitly.")

  print(f"[INFO] Dissolving {len(gdf)} features by field: {field}")
  out = gdf.dissolve(by=field, as_index=False)
  print(f"[OK] Result has {len(out)} province-level features")
  out.to_file(args.out, driver="GeoJSON")
  print(f"[OK] Wrote {args.out}")

if __name__ == "__main__":
  main()
