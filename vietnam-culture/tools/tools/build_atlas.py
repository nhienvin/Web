#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build atlas.svg from per-province SVGs.

Usage examples
--------------
# Nếu các file tỉnh đã cùng viewBox với board (vd 0 0 800 1400):
python tools/tools/build_atlas.py --src public/map/svg --out public/assets/atlas.svg --board 800 1400

# Nếu file tỉnh có viewBox riêng nhưng trong provinces.bundle.json đã có bbox_px:
python tools/tools/build_atlas.py --src public/map/svg --out public/assets/atlas.svg \
       --board 800 1400 --bundle public/data/provinces.bundle.json

# Nếu muốn overrides khác, chuẩn bị manifest JSON dạng:
# { "1": { "minX": 120.0, "minY": 200.0, "width": 52.0, "height": 68.0 }, ... }
python tools/tools/build_atlas.py --src public/map/svg --out public/assets/atlas.svg \
       --board 800 1400 --manifest tools/atlas_placements.json
"""
import argparse
import json
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple

Number = float
ViewBox = Tuple[Number, Number, Number, Number]

CMD_RE = re.compile(r"[MmLlHhVvCcSsQqTtAaZz]")
NUM_RE = re.compile(r"[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?")


def parse_viewbox(svg_text: str) -> Optional[ViewBox]:
    m = re.search(
        r'viewBox\s*=\s*["\']\s*([0-9.+-eE]+)\s+([0-9.+-eE]+)\s+([0-9.+-eE]+)\s+([0-9.+-eE]+)\s*["\']',
        svg_text,
    )
    if not m:
        return None
    return (float(m.group(1)), float(m.group(2)), float(m.group(3)), float(m.group(4)))


def extract_paths(svg_text: str) -> List[str]:
    paths: List[str] = []
    for m in re.finditer(r'<path[^>]*\sd=(?:"([^"]+)"|\'([^\']+)\')', svg_text, flags=re.I):
        d = m.group(1) or m.group(2) or ""
        if d.strip():
            paths.append(d.strip())
    return paths


def tokenize_path(d: str) -> List[str]:
    tokens: List[str] = []
    i = 0
    n = len(d)
    while i < n:
        c = d[i]
        if CMD_RE.match(c):
            tokens.append(c)
            i += 1
        elif c.isspace() or c == ",":
            i += 1
        else:
            m = NUM_RE.match(d, i)
            if not m:
                raise ValueError(f"Bad number at {i} in path")
            tokens.append(m.group(0))
            i = m.end()
    return tokens


def to_float(v: str) -> float:
    return float(v)


def transform_path_to_board(d: str, src_vb: ViewBox, dst_box: ViewBox) -> str:
    """
    Transform path data from src viewBox to board coordinates inside dst_box (minX, minY, width, height).
    Supports commands M,L,H,V,C,S,Q,T,Z. For A/a only uniform scale (sx==sy) is allowed.
    """
    src_minx, src_miny, src_w, src_h = src_vb
    dst_minx, dst_miny, dst_w, dst_h = dst_box
    sx = dst_w / src_w
    sy = dst_h / src_h

    tokens = tokenize_path(d)
    out: List[str] = []
    i = 0
    cx = cy = 0.0
    last_cx = last_cy = None  # last control point for S/s, Q/q

    def abs_xy(x_rel: float, y_rel: float, is_relative: bool) -> Tuple[float, float]:
        x_local = x_rel + (cx if is_relative else 0.0)
        y_local = y_rel + (cy if is_relative else 0.0)
        x_board = (x_local - src_minx) * sx + dst_minx
        y_board = (y_local - src_miny) * sy + dst_miny
        return x_board, y_board

    while i < len(tokens):
        cmd = tokens[i]
        i += 1
        rel = cmd.islower()
        command = cmd.upper()

        def read_numbers(count: int) -> List[float]:
            nonlocal i
            vals = list(map(to_float, tokens[i:i + count]))
            if len(vals) < count:
                raise ValueError("Unexpected end of tokens")
            i += count
            return vals

        if command == "M":
            x, y = read_numbers(2)
            ax, ay = abs_xy(x, y, rel)
            out.extend(["M", f"{ax:.4f}", f"{ay:.4f}"])
            cx, cy = ax, ay
            last_cx = last_cy = None
            while i < len(tokens) and not CMD_RE.match(tokens[i]):
                x, y = read_numbers(2)
                ax, ay = abs_xy(x, y, rel)
                out.extend(["L", f"{ax:.4f}", f"{ay:.4f}"])
                cx, cy = ax, ay

        elif command == "L":
            while i < len(tokens) and not CMD_RE.match(tokens[i]):
                x, y = read_numbers(2)
                ax, ay = abs_xy(x, y, rel)
                out.extend(["L", f"{ax:.4f}", f"{ay:.4f}"])
                cx, cy = ax, ay
            last_cx = last_cy = None

        elif command == "H":
            while i < len(tokens) and not CMD_RE.match(tokens[i]):
                (x,) = read_numbers(1)
                if rel:
                    ax, ay = abs_xy(x, 0.0, True)
                    ay = cy
                else:
                    ax, ay = abs_xy(x, (cy - dst_miny) / sy + src_miny, False)
                    ay = cy
                out.extend(["L", f"{ax:.4f}", f"{ay:.4f}"])
                cx, cy = ax, ay
            last_cx = last_cy = None

        elif command == "V":
            while i < len(tokens) and not CMD_RE.match(tokens[i]):
                (y,) = read_numbers(1)
                if rel:
                    ax, ay = abs_xy(0.0, y, True)
                    ax = cx
                else:
                    ax, ay = abs_xy((cx - dst_minx) / sx + src_minx, y, False)
                    ax = cx
                out.extend(["L", f"{ax:.4f}", f"{ay:.4f}"])
                cx, cy = ax, ay
            last_cx = last_cy = None

        elif command == "C":
            while i < len(tokens) and not CMD_RE.match(tokens[i]):
                x1, y1, x2, y2, x, y = read_numbers(6)
                ax1, ay1 = abs_xy(x1, y1, rel)
                ax2, ay2 = abs_xy(x2, y2, rel)
                ax, ay = abs_xy(x, y, rel)
                out.extend([
                    "C", f"{ax1:.4f}", f"{ay1:.4f}",
                    f"{ax2:.4f}", f"{ay2:.4f}",
                    f"{ax:.4f}", f"{ay:.4f}"
                ])
                cx, cy = ax, ay
                last_cx, last_cy = ax2, ay2

        elif command == "S":
            while i < len(tokens) and not CMD_RE.match(tokens[i]):
                x2, y2, x, y = read_numbers(4)
                if last_cx is None or last_cy is None:
                    rx, ry = cx, cy
                else:
                    rx = 2 * cx - last_cx
                    ry = 2 * cy - last_cy
                ax2, ay2 = abs_xy(x2, y2, rel)
                ax, ay = abs_xy(x, y, rel)
                out.extend([
                    "C", f"{rx:.4f}", f"{ry:.4f}",
                    f"{ax2:.4f}", f"{ay2:.4f}",
                    f"{ax:.4f}", f"{ay:.4f}"
                ])
                cx, cy = ax, ay
                last_cx, last_cy = ax2, ay2

        elif command == "Q":
            while i < len(tokens) and not CMD_RE.match(tokens[i]):
                x1, y1, x, y = read_numbers(4)
                ax1, ay1 = abs_xy(x1, y1, rel)
                ax, ay = abs_xy(x, y, rel)
                out.extend(["Q", f"{ax1:.4f}", f"{ay1:.4f}", f"{ax:.4f}", f"{ay:.4f}"])
                cx, cy = ax, ay
                last_cx, last_cy = ax1, ay1

        elif command == "T":
            while i < len(tokens) and not CMD_RE.match(tokens[i]):
                x, y = read_numbers(2)
                if last_cx is None or last_cy is None:
                    rx, ry = cx, cy
                else:
                    rx = 2 * cx - last_cx
                    ry = 2 * cy - last_cy
                ax, ay = abs_xy(x, y, rel)
                out.extend(["Q", f"{rx:.4f}", f"{ry:.4f}", f"{ax:.4f}", f"{ay:.4f}"])
                cx, cy = ax, ay
                last_cx, last_cy = rx, ry

        elif command == "A":
            if abs(sx - sy) > 1e-6:
                raise ValueError("Arc with non-uniform scale not supported")
            s = sx
            while i < len(tokens) and not CMD_RE.match(tokens[i]):
                rx, ry, xrot, large, sweep, x, y = read_numbers(7)
                ax, ay = abs_xy(x, y, rel)
                out.extend([
                    "A",
                    f"{rx * s:.4f}", f"{ry * s:.4f}",
                    f"{xrot:.4f}",
                    str(int(large)),
                    str(int(sweep)),
                    f"{ax:.4f}", f"{ay:.4f}",
                ])
                cx, cy = ax, ay
                last_cx = last_cy = None

        elif command == "Z":
            out.append("Z")
            last_cx = last_cy = None

        else:
            raise ValueError(f"Unsupported path command: {cmd}")

    return " ".join(out)


def load_manifest(manifest_path: Optional[Path]) -> Dict[str, ViewBox]:
    if not manifest_path:
        return {}
    data = json.loads(manifest_path.read_text(encoding="utf-8"))
    output: Dict[str, ViewBox] = {}
    for pid, box in data.items():
        output[str(pid)] = (
            float(box["minX"]),
            float(box["minY"]),
            float(box["width"]),
            float(box["height"]),
        )
    return output


def load_bundle_bbox(bundle_path: Optional[Path]) -> Dict[str, ViewBox]:
    if not bundle_path or not bundle_path.exists():
        return {}
    bundle = json.loads(bundle_path.read_text(encoding="utf-8"))
    output: Dict[str, ViewBox] = {}
    for province in bundle.get("provinces", []):
        pid = str(province.get("id"))
        bbox = province.get("bbox_px") or [0, 0, 0, 0]
        if any(bbox):
            output[pid] = (
                float(bbox[0]),
                float(bbox[1]),
                float(bbox[2]),
                float(bbox[3]),
            )
    return output


def build_atlas(
    src_dir: Path,
    out_path: Path,
    board_w: int,
    board_h: int,
    bundle_bbox_path: Optional[Path],
    manifest_path: Optional[Path],
) -> None:
    bundle_boxes = load_bundle_bbox(bundle_bbox_path)
    manifest_boxes = load_manifest(manifest_path)
    placements: Dict[str, ViewBox] = {**bundle_boxes, **manifest_boxes}

    symbols: List[str] = []
    warnings: List[str] = []

    for svg_file in sorted(src_dir.glob("*.svg")):
        pid = svg_file.stem
        text = svg_file.read_text(encoding="utf-8")
        vb = parse_viewbox(text)
        paths = extract_paths(text)
        if not paths:
            warnings.append(f"{pid}: no <path> found")
            continue
        combined = " ".join(paths)
        if (
            vb
            and abs(vb[0]) < 1e-6
            and abs(vb[1]) < 1e-6
            and abs(vb[2] - board_w) < 1e-3
            and abs(vb[3] - board_h) < 1e-3
        ):
            d_out = combined
        else:
            if pid not in placements:
                warnings.append(
                    f"{pid}: missing bbox/manifest and SVG not board-aligned; skipping"
                )
                continue
            d_out = transform_path_to_board(combined, vb if vb else (0, 0, 1, 1), placements[pid])
        symbols.append(f'  <symbol id="p-{pid}"><path d="{d_out}"/></symbol>')

    atlas = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {board_w} {board_h}">',
        "<defs>",
        *symbols,
        "</defs>",
        "</svg>",
    ]
    out_path.write_text("\n".join(atlas), encoding="utf-8")

    print(f"Written atlas: {out_path} with {len(symbols)} symbols")
    if warnings:
        print("Warnings:")
        for w in warnings:
            print(f" - {w}")


def main():
    parser = argparse.ArgumentParser(description="Build atlas.svg from per-province SVGs")
    parser.add_argument("--src", required=True, help="Folder of province SVGs (e.g. public/map/svg)")
    parser.add_argument("--out", required=True, help="Output atlas path (e.g. public/assets/atlas.svg)")
    parser.add_argument("--board", nargs=2, type=int, default=[800, 1400], help="Board width height")
    parser.add_argument("--bundle", help="Path to provinces.bundle.json (for bbox_px)")
    parser.add_argument("--manifest", help="Optional override placements JSON")
    args = parser.parse_args()

    src_dir = Path(args.src)
    out_path = Path(args.out)
    bundle_path = Path(args.bundle) if args.bundle else None
    manifest_path = Path(args.manifest) if args.manifest else None

    build_atlas(src_dir, out_path, args.board[0], args.board[1], bundle_path, manifest_path)


if __name__ == "__main__":
    main()
