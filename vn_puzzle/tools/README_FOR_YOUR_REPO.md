# VN Map Tools for your GADM Level-3 file

File path (as you shared): vn_puzzle/src/gadm_vn/gadm41_VNM_3.json

## Install
pip install geopandas shapely fiona pyproj

## Step 1 — ADM3 -> ADM1 (province)
python tools/dissolve_by_field.py vn_puzzle/src/gadm_vn/gadm41_VNM_3.json --field NAME_1 --out sources/vn_level1_from_gadm3.geojson

## Step 2 — ADM1 -> 34 (export SVG)
python tools/merge_to_34_v2.py sources/vn_level1_from_gadm3.geojson --out-dir build --data-dir data --alias data/name_aliases.json --export-63

Outputs:
- build/svg-34/*.svg
- build/svg-63/*.svg (reference)

## Step 3 — Generate pieces.json (grid)
python tools/generate_pieces_json.py --svg-dir public/assets/svg-34 --out public/assets/data/pieces.json --canvas 1280x720 --grid-cols auto --target-margin 64,64,64,150 --tray-height 160 --shuffle --seed 42

If any province names mismatch, add an entry in data/name_aliases.json or tweak data/vn_units_34.json.
