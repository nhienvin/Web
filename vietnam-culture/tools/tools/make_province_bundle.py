#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build provinces.bundle.json cho runtime từ các CSV nguồn:

Nguồn (đường dẫn mặc định):
- osm_pipeline_demo/provinces_from_osm.csv        # định danh, toạ độ, anchor, region, svg path...
- osm_pipeline_demo/province_neighbors.csv        # province_id,neighbor_id (đối xứng hoặc không đều được)
- osm_pipeline_demo/province_facts_template.csv   # fact ngắn (2–3/câu, <=140 ký tự), cột tuỳ biến
- osm_pipeline_demo/province_media_template.csv   # media (ảnh/audio)

Tuỳ biến:
- Nếu có osm_pipeline_demo/slots.json → ưu tiên anchor & bbox từ đây để khớp board.

Kết quả:
- game/provinces.bundle.json

Chạy:
  python make_province_bundle.py --csv ../data/osm_pipeline_demo/provinces_from_osm.csv --neighbors ../data/osm_pipeline_demo/province_neighbors.csv --facts ../data/osm_pipeline_demo/province_facts_template.csv --media osm_pipeline_demo/province_media_template.csv --slots ../data/osm_pipeline_demo/slots.json --out ../game/provinces.bundle.json
"""
import csv, json, io, re, argparse
from pathlib import Path
from collections import defaultdict

def canon_pid(s: str) -> str:
    s = (s or "").strip().upper()
    if s.startswith("VN-"): s = s[3:]
    s = re.sub(r"^0+","", s)
    return s

def read_csv_any(path: Path):
    if not path or not path.exists(): return [], []
    raw = path.read_text(encoding="utf-8-sig")
    # bỏ dòng "sep=," nếu có
    lines = [ln for ln in raw.splitlines() if not ln.lower().startswith("sep=")]
    rd = csv.DictReader(io.StringIO("\n".join(lines)))
    return rd.fieldnames or [], list(rd)

def load_provinces(csv_path: Path):
    _, rows = read_csv_any(csv_path)
    data = {}
    for r in rows:
        pid = canon_pid(r.get("province_id",""))
        if not pid: continue
        name_vi = r.get("name_vi") or r.get("name") or pid
        name_en = r.get("name_en") or name_vi
        # anchor mặc định từ CSV (nếu có)
        ax = float(r.get("label_anchor_px_x") or 0.0)
        ay = float(r.get("label_anchor_px_y") or 0.0)
        item = {
            "id": pid,
            "name_vi": name_vi,
            "name_en": name_en,
            "region_code": r.get("region_code") or "",
            "region_name": r.get("region_name") or "",
            "lat": float(r.get("lat") or 0.0),
            "lon": float(r.get("lon") or 0.0),
            "svg_path_file": r.get("svg_path_file") or f"map/svg/{pid}.svg",
            "anchor_px": [ax, ay],
            "bbox_px": None,                   # sẽ điền từ slots.json nếu có
            "neighbors": [],                   # sẽ điền từ CSV neighbors
            "facts": [],                       # sẽ điền từ CSV facts
            "media": [],                       # sẽ điền từ CSV media
            "snap_tolerance_px": int(r.get("snap_tolerance_px") or 18),
            "difficulty_1to5": int(r.get("difficulty_1to5") or 3),
            # "population": r.get("population") ... (tuỳ thêm sau)
            # "area_km2": r.get("area_km2") ...
            # "festival_hints": ...
        }
        data[pid] = item
    return data

def load_neighbors_csv(path: Path):
    _, rows = read_csv_any(path)
    g = defaultdict(set)
    for r in rows:
        a = canon_pid(r.get("province_id","")); b = canon_pid(r.get("neighbor_id",""))
        if not a or not b or a == b: continue
        g[a].add(b)
        g[b].add(a)  # đảm bảo đối xứng
    return {k: sorted(v) for k,v in g.items()}

def load_facts_csv(path: Path):
    """
    Linh hoạt tên cột:
      - Nếu có các cột fact_vi_1, fact_vi_2, fact_vi_3 -> lấy theo thứ tự.
      - Hoặc các cột bắt đầu bằng 'fact' (fact1, fact2, fact3...) -> lấy theo thứ tự.
      - Nếu có cột fact_en_* thì đính kèm dưới key 'en' (tuỳ dùng).
    Kỳ vọng mỗi dòng 1 province_id.
    """
    fields, rows = read_csv_any(path)
    has_vi = [c for c in fields if c.lower().startswith("fact_vi")]
    has_any = [c for c in fields if c.lower().startswith("fact")]
    facts = defaultdict(list)
    for r in rows:
        pid = canon_pid(r.get("province_id",""))
        if not pid: continue
        items = []
        cols = has_vi if has_vi else has_any
        for c in cols:
            val = (r.get(c) or "").strip()
            if val:
                # cắt 140 ký tự mềm (không bắt buộc)
                if len(val) > 140:
                    val = val[:137].rstrip() + "..."
                items.append({"vi": val})
        # nếu có fact_en_* thì gộp song ngữ theo index
        en_cols = [c for c in fields if c.lower().startswith("fact_en")]
        if en_cols:
            for i, c in enumerate(sorted(en_cols)):
                if i < len(items):
                    ev = (r.get(c) or "").strip()
                    if ev:
                        items[i]["en"] = ev
        facts[pid] = items
    return facts

def load_media_csv(path: Path):
    """
    Kỳ vọng cột tối thiểu:
      province_id, media_type, src, caption_vi, credit
      - media_type: image | audio (có thể thêm 'image_sat' nếu muốn)
      - src: URL hoặc đường dẫn tệp tĩnh
    """
    _, rows = read_csv_any(path)
    media = defaultdict(list)
    for r in rows:
        pid = canon_pid(r.get("province_id",""))
        if not pid: continue
        mtype = (r.get("media_type") or "image").strip().lower()
        src = (r.get("src") or "").strip()
        if not src: continue
        entry = {
            "type": mtype,                # 'image' | 'audio' | ...
            "src": src,
            "caption_vi": r.get("caption_vi") or "",
            "credit": r.get("credit") or ""
        }
        media[pid].append(entry)
    return media

def load_slots_json(path: Path):
    if not path or not path.exists(): return {}
    raw = json.loads(path.read_text(encoding="utf-8"))
    out = {}
    for it in raw:
        pid = canon_pid(it.get("province_id",""))
        if not pid: continue
        bx = it.get("bbox") or {}
        out[pid] = {
            "anchor_px": [float(it.get("anchor_x",0)), float(it.get("anchor_y",0))],
            "bbox_px": [float(bx.get("x",0)), float(bx.get("y",0)), float(bx.get("w",0)), float(bx.get("h",0))]
        }
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="osm_pipeline_demo/provinces_from_osm.csv")
    ap.add_argument("--neighbors", default="osm_pipeline_demo/province_neighbors.csv")
    ap.add_argument("--facts", default="osm_pipeline_demo/province_facts_template.csv")
    ap.add_argument("--media", default="osm_pipeline_demo/province_media_template.csv")
    ap.add_argument("--slots", default="osm_pipeline_demo/slots.json")
    ap.add_argument("--out", default="game/provinces.bundle.json")
    args = ap.parse_args()

    p_csv   = Path(args.csv)
    p_nbr   = Path(args.neighbors)
    p_facts = Path(args.facts)
    p_media = Path(args.media)
    p_slots = Path(args.slots)
    p_out   = Path(args.out)

    provinces = load_provinces(p_csv)
    neighbors = load_neighbors_csv(p_nbr)
    facts     = load_facts_csv(p_facts)
    media     = load_media_csv(p_media)
    slots     = load_slots_json(p_slots)

    # merge
    bundle = {
        "viewBox": [0, 0, 800, 1400],   # khớp board
        "provinces": [],
        "indexById": {}
    }

    for pid, item in sorted(provinces.items()):
        # neighbors
        item["neighbors"] = neighbors.get(pid, [])
        # facts
        item["facts"] = facts.get(pid, [])
        # media
        item["media"] = media.get(pid, [])
        # ưu tiên slots.json cho anchor/bbox nếu có
        if pid in slots:
            s = slots[pid]
            item["anchor_px"] = s["anchor_px"]
            item["bbox_px"] = s["bbox_px"]
        bundle["indexById"][pid] = len(bundle["provinces"])
        bundle["provinces"].append(item)

    p_out.parent.mkdir(parents=True, exist_ok=True)
    p_out.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[DONE] {p_out} — {len(bundle['provinces'])} provinces")

if __name__ == "__main__":
    main()
