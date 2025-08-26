#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate pieces.json for the VN map puzzle by scanning a folder of SVG pieces.
- Reads each SVG's viewBox/width/height to auto-scale into a target grid.
- Places target cells in a top "play area" and start positions into a bottom tray.
- Outputs the JSON schema used by the Phaser starter.
"""
import argparse, os, re, math, json, random, unicodedata

VIEWBOX_RE = re.compile(r'viewBox=["\']\s*([0-9\.\-]+)\s+([0-9\.\-]+)\s+([0-9\.\-]+)\s+([0-9\.\-]+)\s*["\']', re.I)
WIDTH_RE   = re.compile(r'width=["\']\s*([0-9\.]+)\s*(px)?\s*["\']', re.I)
HEIGHT_RE  = re.compile(r'height=["\']\s*([0-9\.]+)\s*(px)?\s*["\']', re.I)

def slugify(s):
    s = s.lower()
    s = ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s

def read_svg_dims(path):
    try:
        text = open(path, 'r', encoding='utf-8', errors='ignore').read()
    except Exception:
        return 1000.0, 1000.0
    m = VIEWBOX_RE.search(text)
    if m:
        _, _, w, h = m.groups()
        try:
            w = float(w); h = float(h)
            if w > 1 and h > 1:
                return w, h
        except Exception:
            pass
    mw = WIDTH_RE.search(text)
    mh = HEIGHT_RE.search(text)
    if mw and mh:
        try:
            w = float(mw.group(1)); h = float(mh.group(1))
            if w > 1 and h > 1:
                return w, h
        except Exception:
            pass
    return 1000.0, 1000.0

def parse_wh(s):
    if 'x' in s:
        w,h = s.lower().split('x')
        return int(w), int(h)
    raise ValueError('canvas must be like 1280x720')

def parse_margins(s):
    parts = [int(x) for x in s.split(',')]
    if len(parts)!=4: raise ValueError('target-margin must be 4 ints: L,T,R,B')
    return parts

def auto_cols(n, aspect_ratio):
    cols = max(1, int(round(math.sqrt(n * max(0.25, min(4.0, aspect_ratio))))))
    return cols

def main():
    ap = argparse.ArgumentParser(description='Generate pieces.json from a directory of SVGs')
    ap.add_argument('--svg-dir', required=True, help='Folder containing SVG pieces (63 or 34)')
    ap.add_argument('--out', default='public/assets/data/pieces.json')
    ap.add_argument('--canvas', default='1280x720', help='Design resolution WxH (default 1280x720)')
    ap.add_argument('--grid-cols', default='auto', help='Number of columns for target grid or "auto"')
    ap.add_argument('--target-margin', default='64,64,64,150', help='L,T,R,B margins for the play area (px)')
    ap.add_argument('--tray-height', type=int, default=160, help='Height of bottom tray (px)')
    ap.add_argument('--angle-range', type=int, default=0, help='Random start angle range in degrees (e.g., 30 => -15..+15)')
    ap.add_argument('--shuffle', action='store_true', help='Shuffle piece order')
    ap.add_argument('--seed', type=int, default=None, help='Random seed for reproducibility')
    ap.add_argument('--name-map', default=None, help='Optional JSON: { "id": "Display Name", ... }')
    ap.add_argument('--id-prefix', default='', help='Optional prefix for piece ids (e.g., "p34-")')
    args = ap.parse_args()

    W,H = parse_wh(args.canvas)
    L,T,R,B = parse_margins(args.target_margin)
    target_w = W - L - R
    target_h = H - T - B - args.tray_height
    if target_w <= 0 or target_h <= 0:
        raise SystemExit('Target area too small after margins/tray.')

    if not os.path.isdir(args.svg_dir):
        raise SystemExit('SVG dir not found: ' + args.svg_dir)
    files = [f for f in os.listdir(args.svg_dir) if f.lower().endswith('.svg')]
    if not files:
        raise SystemExit('No SVG files in ' + args.svg_dir)
    files.sort()

    if args.seed is not None:
        random.seed(args.seed)
    if args.shuffle:
        random.shuffle(files)

    name_map = {}
    if args.name_map and os.path.exists(args.name_map):
        try:
            with open(args.name_map, 'r', encoding='utf-8') as f:
                name_map = json.load(f)
        except Exception as e:
            print('[WARN] Failed to load name map:', e)

    n = len(files)
    aspect = target_w / target_h
    cols = auto_cols(n, aspect) if args.grid_cols == 'auto' else max(1, int(args.grid_cols))
    rows = math.ceil(n / cols)
    cell_w = target_w / cols
    cell_h = target_h / rows

    targets = []
    for r in range(rows):
        for c in range(cols):
            idx = r*cols + c
            if idx >= n: break
            x = L + (c + 0.5) * cell_w
            y = T + (r + 0.5) * cell_h
            targets.append((x,y))

    start_cols = min(cols, n)
    start_rows = math.ceil(n / start_cols)
    tray_y0 = H - args.tray_height
    start_cell_w = (W - L - R) / start_cols
    start_cell_h = args.tray_height / max(1, start_rows)
    starts = []
    for r in range(start_rows):
        for c in range(start_cols):
            idx = r*start_cols + c
            if idx >= n: break
            x = L + (c + 0.5) * start_cell_w
            y = tray_y0 + (r + 0.5) * start_cell_h
            starts.append((x,y))

    pieces = []
    for i, fname in enumerate(files):
        svg_path = os.path.join(args.svg_dir, fname)
        fid_raw = os.path.splitext(fname)[0]
        fid = args.id_prefix + slugify(fid_raw)
        disp_name = name_map.get(fid) or name_map.get(fid_raw) or fid_raw.replace('-', ' ').title()

        w, h = read_svg_dims(svg_path)
        target_max = min(cell_w, cell_h) * 0.9
        piece_max = max(w, h) if max(w, h) > 0 else 1000.0
        scale = target_max / piece_max

        tx, ty = targets[i]
        sx, sy = starts[i]

        angle = 0
        if args.angle_range > 0:
            half = args.angle_range / 2.0
            angle = random.uniform(-half, half)

        web_svg = svg_path.replace('\\', '/')
        if not web_svg.startswith('/'):
            web_svg = '/' + web_svg

        pieces.append({
            "id": fid,
            "name": disp_name,
            "svg": web_svg,
            "start": { "x": round(sx,2), "y": round(sy,2), "angle": round(angle,1) },
            "target": { "x": round(tx,2), "y": round(ty,2), "angle": 0 },
            "scale": round(scale,3)
        })

    out_dir = os.path.dirname(args.out) or "."
    os.makedirs(out_dir, exist_ok=True)

    with open(args.out, 'w', encoding='utf-8') as f:
        json.dump(pieces, f, ensure_ascii=False, indent=2)

    print("[OK] Wrote {} pieces -> {}".format(len(pieces), args.out))
    print("Grid: {}x{}  cell=({:.1f}x{:.1f})  play area=({}x{})".format(cols, rows, cell_w, cell_h, int(target_w), int(target_h)))
    print("Tray: {}x{}  tray_height={}".format(start_cols, start_rows, args.tray_height))

if __name__ == '__main__':
    main()
