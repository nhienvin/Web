#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Fill region_code / region_name cho provinces_from_osm.csv.

- Xử lý name_vi có tiền tố: "Tỉnh ...", "Thành phố ...", "TP. ...", "TP ..."
- Hàm norm() chuyển được 'đ/Đ' -> 'd/D', sau đó mới bỏ dấu.
- Không mất header; ghi lại UTF-8 BOM + dòng 'sep=,' để Excel mở đúng.

Cách chạy:
  python fill_regions.py --csv ../Data/osm_pipeline_demo/provinces_from_osm.csv
  # hoặc xuất ra file khác:
  python fill_regions.py --csv osm_pipeline_demo/provinces_from_osm.csv --out osm_pipeline_demo/provinces_with_regions.csv
"""
import csv, argparse, unicodedata, re, io
from pathlib import Path

REGION_NAME = {
    "DBB":"Đông Bắc Bộ","TBB":"Tây Bắc Bộ","DBSH":"Đồng bằng sông Hồng",
    "BTB":"Bắc Trung Bộ","NTB":"Nam Trung Bộ","TN":"Tây Nguyên",
    "DNB":"Đông Nam Bộ","DBM":"Đồng bằng sông Cửu Long"
}

def canon_pid(s: str) -> str:
    s = (s or "").strip().upper()
    if s.startswith("VN-"):
        s = s[3:]
    s = re.sub(r"^0+","", s)  # '01' -> '1'
    return s

def norm(s: str) -> str:
    """Chuẩn hoá: đổi đ/Đ->d/D, bỏ dấu, chỉ còn [a-z0-9 ] đơn giản, lowercase."""
    s = (s or "").strip()
    # đổi đ/Đ trước (vì 'đ' không bị tách khi NFD)
    s = s.replace("Đ","D").replace("đ","d")
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")  # bỏ dấu
    s = s.lower()
    # thay mọi ký tự không phải chữ/số bằng khoảng trắng
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

_PREFIX_RE = re.compile(r"^(tinh|thanh pho|thanh-pho|tp\.?|tp)\s+", re.IGNORECASE)

def strip_prefixes_vi(name: str) -> str:
    """Bỏ tiền tố 'Tỉnh', 'Thành phố', 'TP.' ở đầu tên (sau khi norm)."""
    n = norm(name)
    # sau norm(), các dạng sẽ là: 'tinh ...', 'thanh pho ...', 'tp ...'
    return _PREFIX_RE.sub("", n, count=1)

# Mapping theo TÊN đã chuẩn hoá & bỏ tiền tố
REGMAP_BY_NAME = {
    # ĐÔNG BẮC BỘ
    "ha giang":"DBB","cao bang":"DBB","bac kan":"DBB","lang son":"DBB","tuyen quang":"DBB",
    "thai nguyen":"DBB","phu tho":"DBB","bac giang":"DBB","quang ninh":"DBB",
    # TÂY BẮC BỘ
    "dien bien":"TBB","lai chau":"TBB","son la":"TBB","hoa binh":"TBB","lao cai":"TBB","yen bai":"TBB",
    # ĐỒNG BẰNG SÔNG HỒNG
    "ha noi":"DBSH","hai phong":"DBSH","vinh phuc":"DBSH","bac ninh":"DBSH","hung yen":"DBSH",
    "hai duong":"DBSH","thai binh":"DBSH","ha nam":"DBSH","nam dinh":"DBSH","ninh binh":"DBSH",
    # BẮC TRUNG BỘ
    "thanh hoa":"BTB","nghe an":"BTB","ha tinh":"BTB","quang binh":"BTB","quang tri":"BTB","hue":"BTB",
    # NAM TRUNG BỘ (duyên hải)
    "da nang":"NTB","quang nam":"NTB","quang ngai":"NTB","binh dinh":"NTB","phu yen":"NTB",
    "khanh hoa":"NTB","ninh thuan":"NTB","binh thuan":"NTB",
    # TÂY NGUYÊN
    "kon tum":"TN","gia lai":"TN","dak lak":"TN","dak nong":"TN","lam dong":"TN",
    # ĐÔNG NAM BỘ
    "ho chi minh":"DNB","binh phuoc":"DNB","binh duong":"DNB","dong nai":"DNB","tay ninh":"DNB","ba ria vung tau":"DNB",
    # ĐBSCL
    "long an":"DBM","tien giang":"DBM","ben tre":"DBM","tra vinh":"DBM","vinh long":"DBM","dong thap":"DBM",
    "an giang":"DBM","kien giang":"DBM","hau giang":"DBM","soc trang":"DBM","bac lieu":"DBM","ca mau":"DBM","can tho":"DBM",
}

# Mapping theo province_id (sau canonical) — dùng cho các id chữ viết tắt
REGMAP_BY_ID = {
    "HN":"DBSH","HP":"DBSH","HCM":"DNB","DN":"NTB","CT":"DBM","VT":"DNB",
    # bổ sung thêm nếu bạn dùng id chữ khác
}

def read_csv_any(path: Path):
    raw = path.read_text(encoding="utf-8-sig")
    # bỏ dòng 'sep=,' nếu có
    lines = [ln for ln in raw.splitlines() if not ln.lower().startswith("sep=")]
    sio = io.StringIO("\n".join(lines))
    rd = csv.DictReader(sio)
    return rd.fieldnames, list(rd)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", required=True)
    ap.add_argument("--out", default="")
    args = ap.parse_args()
    src = Path(args.csv)
    out = Path(args.out) if args.out else src

    fieldnames, rows = read_csv_any(src)
    if not rows:
        raise SystemExit("[ERROR] CSV rỗng hoặc không đọc được.")

    # bảo toàn thứ tự cột gốc + thêm 2 cột nếu thiếu
    if "region_code" not in fieldnames: fieldnames.append("region_code")
    if "region_name" not in fieldnames: fieldnames.append("region_name")

    for r in rows:
        pid = canon_pid(r.get("province_id",""))
        # tên có thể nằm ở name_vi hoặc name (tuỳ schema của bạn)
        name_vi = r.get("name_vi") or r.get("name") or ""
        base = strip_prefixes_vi(name_vi)  # bỏ "tinh/thanh pho/tp" & chuẩn hoá

        code = (r.get("region_code") or "").strip()
        if not code:
            # Ưu tiên map theo id, sau đó theo tên đã chuẩn hoá
            code = REGMAP_BY_ID.get(pid, "") or REGMAP_BY_NAME.get(base, "")
        r["region_code"] = code
        r["region_name"] = REGION_NAME.get(code, r.get("region_name",""))

    # ghi lại (có header), UTF-8 BOM + sep=, để Excel mở đúng
    with open(out, "w", newline="", encoding="utf-8-sig") as f:
        f.write("sep=,\n")
        wr = csv.DictWriter(f, fieldnames=fieldnames)
        wr.writeheader()
        wr.writerows(rows)

    print(f"[DONE] Updated regions in: {out}")

if __name__ == "__main__":
    main()
