#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Export a PNG sprite sheet + JSON from atlas.svg (symbols per province).
- Export dùng cho mobile
Assumptions:
- atlas.svg uses: <symbol id="p-XX" overflow="visible"><path d="M ... L ... Z ..."/></symbol>
  (được tạo từ build_phase1_board_assets.py). Path chỉ gồm M/L/Z (không Bezier).

Outputs:
- --out-png  : sprite sheet PNG
- --out-json : sprite JSON frames (x,y,w,h)
- (optional) --out-dir : export từng PNG rời

Requried: pip install cairosvg pillow

python export_sprite_from_atlas.py \
  --atlas osm_pipeline_demo/atlas.svg \
  --out-png game/sprites/provinces_sprites.png \
  --out-json game/sprites/provinces_sprites.json \
  --scale 1.0 \
  --padding 3 \
  --max-width 2048 \
  --fill "#ffffff" \
  --stroke "#334155" \
  --stroke-width 1.2

"""

import re, math, json, argparse, time
from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image
import cairosvg

# ---------------- CLI ----------------
def parse_args():
    ap = argparse.ArgumentParser()
    ap.add_argument("--atlas", required=True, help="Path to atlas.svg")
    ap.add_argument("--out-png", required=True, help="Output sprite PNG")
    ap.add_argument("--out-json", required=True, help="Output sprite JSON")
    ap.add_argument("--out-dir", default="", help="(Optional) folder to also write per-province PNGs")
    ap.add_argument("--scale", type=float, default=1.0, help="Scale factor (e.g., 0.5 for half size)")
    ap.add_argument("--padding", type=int, default=2, help="Padding around each tile (px)")
    ap.add_argument("--max-width", type=int, default=2048, help="Max sheet width (px)")
    ap.add_argument("--fill", default="#FFFFFF", help="SVG fill color for pieces")
    ap.add_argument("--stroke", default="#334155", help="SVG stroke color")
    ap.add_argument("--stroke-width", type=float, default=1.0, help="Stroke width at scale=1.0 (px)")
    return ap.parse_args()

# ------------- utils ---------------
FLOAT_RE = re.compile(r'[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?')

def canon_id(sym_id: str) -> str:
    s = (sym_id or "").strip()
    return s[2:] if s.startswith("p-") else s

def parse_bbox_from_path_d(d: str):
    # lấy tất cả số trong d; giả định theo cặp x,y (M/L)
    nums = [float(x) for x in FLOAT_RE.findall(d)]
    if len(nums) < 2:
        return (0.0, 0.0, 0.0, 0.0)
    xs = nums[0::2]
    ys = nums[1::2]
    minx, maxx = min(xs), max(xs)
    miny, maxy = min(ys), max(ys)
    return (minx, miny, maxx, maxy)

def build_symbol_svg(path_d: str, vb, scale, fill, stroke, stroke_width):
    """
    Tạo một SVG tối giản render đúng phần path theo bbox (vb = (minx, miny, maxx, maxy)).
    """
    minx, miny, maxx, maxy = vb
    w = maxx - minx
    h = maxy - miny
    # viewBox dùng bbox gốc; width/height theo scale
    out_w = max(1, int(math.ceil(w * scale)))
    out_h = max(1, int(math.ceil(h * scale)))

    # Stroke width cần scale tương ứng để giữ độ dày thị giác ổn định
    sw = stroke_width * scale

    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="{minx} {miny} {w} {h}" width="{out_w}" height="{out_h}">
  <path d="{path_d}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" stroke-linejoin="round" />
</svg>'''
    return svg, out_w, out_h

def svg_to_png_bytes(svg_xml: str):
    return cairosvg.svg2png(bytestring=svg_xml.encode("utf-8"))

# ------------- packer (shelf) -------------
def shelf_pack(sizes, max_width, padding):
    """
    sizes: list of (id, w, h) in pixels
    Return: placements dict id -> (x, y), sheet_w, sheet_h
    Strategy: sort by height desc, place left-to-right, wrap to new shelf.
    """
    sizes_sorted = sorted(sizes, key=lambda x: x[2], reverse=True)
    x = padding
    y = padding
    shelf_h = 0
    sheet_w = max_width
    placements = {}
    for pid, w, h in sizes_sorted:
        if x + w + padding > sheet_w:
            # new shelf
            y += shelf_h + padding
            x = padding
            shelf_h = 0
        placements[pid] = (x, y)
        x += w + padding
        shelf_h = max(shelf_h, h)
    sheet_h = y + shelf_h + padding
    return placements, sheet_w, sheet_h

# ------------- main -------------
def main():
    args = parse_args()
    atlas_path = Path(args.atlas)
    out_png = Path(args.out_png)
    out_json = Path(args.out_json)
    out_dir = Path(args.out_dir) if args.out_dir else None
    if out_dir:
        out_dir.mkdir(parents=True, exist_ok=True)
    out_png.parent.mkdir(parents=True, exist_ok=True)
    out_json.parent.mkdir(parents=True, exist_ok=True)

    # 1) Parse atlas.svg → lấy (id, d) & bbox
    xml = ET.fromstring(atlas_path.read_text(encoding="utf-8"))
    ns = {"svg": "http://www.w3.org/2000/svg"}
    # chấp cả svg không namespace
    symbols = []
    for sym in xml.findall(".//{http://www.w3.org/2000/svg}symbol"):
        sid = sym.attrib.get("id","").strip()
        path = sym.find("{http://www.w3.org/2000/svg}path")
        if not sid or path is None:
            continue
        d = path.attrib.get("d","").strip()
        if not d:
            continue
        minx, miny, maxx, maxy = parse_bbox_from_path_d(d)
        # padding theo toạ độ gốc (trước scale)
        pad = args.padding / max(args.scale, 1e-9)
        minx -= pad; miny -= pad; maxx += pad; maxy += pad
        symbols.append({
            "id": canon_id(sid),
            "d": d,
            "vb": (minx, miny, maxx, maxy)
        })

    if not symbols:
        raise SystemExit("Không tìm thấy <symbol><path d=...> trong atlas.svg.")

    # 2) Tính size (sau scale) để pack
    sizes = []
    for s in symbols:
        minx, miny, maxx, maxy = s["vb"]
        w = maxx - minx
        h = maxy - miny
        w_px = max(1, int(math.ceil(w * args.scale)))
        h_px = max(1, int(math.ceil(h * args.scale)))
        sizes.append((s["id"], w_px, h_px))

    placements, sheet_w, sheet_h = shelf_pack(sizes, args.max_width, args.padding)
    # 3) Tạo canvas sheet
    sheet = Image.new("RGBA", (sheet_w, sheet_h), (0,0,0,0))

    frames = {}
    # 4) Render từng symbol → paste vào sheet (+ optional export riêng)
    for s in symbols:
        pid = s["id"]
        minx, miny, maxx, maxy = s["vb"]
        w = (maxx - minx); h = (maxy - miny)
        svg_xml, out_w, out_h = build_symbol_svg(
            s["d"], s["vb"], args.scale, args.fill, args.stroke, args.stroke_width
        )
        png_bytes = svg_to_png_bytes(svg_xml)
        tile = Image.open(bytearray(png_bytes))  # Pillow hiểu bytes
        # đảm bảo kích thước mong muốn (cairosvg đôi khi off-by-one)
        if tile.size != (out_w, out_h):
            tile = tile.resize((out_w, out_h), Image.BILINEAR)

        x, y = placements[pid]
        sheet.alpha_composite(tile, dest=(x, y))

        if out_dir:
            tile_path = out_dir / f"{pid}.png"
            tile.save(tile_path)

        frames[pid] = {"x": x, "y": y, "w": out_w, "h": out_h}

    # 5) Lưu sheet + json
    sheet.save(out_png, optimize=True)
    manifest = {
        "image": out_png.name,
        "size": [sheet_w, sheet_h],
        "scale": args.scale,
        "frames": frames,
        "meta": {
            "padding": args.padding,
            "source": str(atlas_path),
            "generated": int(time.time())
        }
    }
    out_json.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"[DONE] Sprite: {out_png}  ({sheet_w}x{sheet_h})")
    print(f"[DONE] JSON  : {out_json}")
    if out_dir:
        print(f"[DONE] Singles in: {out_dir}")

if __name__ == "__main__":
    main()
