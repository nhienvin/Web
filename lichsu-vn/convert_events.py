"""
convert_events.py
─────────────────────────────────────────────────────────────────
Chuyển đổi dữ liệu sự kiện từ định dạng nguồn sang định dạng web.

Cách dùng:
  python convert_events.py input.json output.json

  # Chuyển đổi và GỘP vào file events_vn.json đang có:
  python convert_events.py input.json --merge public/data/events_vn.json
"""

import json
import sys
import os
import re
import argparse

# ══════════════════════════════════════════════════════════════════
# BẢNG MAPPING — Chỉnh sửa phần này cho phù hợp với dữ liệu của bạn
# ══════════════════════════════════════════════════════════════════

# MaThoiKy (mã thời kỳ nguồn) → periodId (id web)
PERIOD_MAP = {
    # Tiền Sử - Sơ Sử (gộp chung một thời kỳ)
    "VN_TienSu":        "tienSuSoSu",
    "VN_SoSu":          "tienSuSoSu",
    "VN_TienSuSoSu":    "tienSuSoSu",
    # Bắc Thuộc
    "VN_BacThuoc":      "bacThuoc",
    # Phong Kiến Độc Lập
    "VN_PhongKien":     "phongKien",
    "VN_PhongKienDL":   "phongKien",
    # Pháp Thuộc (thay khangPhap cũ)
    "VN_PhapThuoc":     "phapThuoc",
    "VN_KhangPhap":     "phapThuoc",   # alias dữ liệu cũ
    # Kháng Chiến (gộp chống Pháp + chống Mỹ)
    "VN_KhangChien":    "khangChien",
    "VN_KhangMy":       "khangChien",  # alias dữ liệu cũ
    # Hiện Đại
    "VN_HienDai":       "hienDai",
    "VN_HienNay":       "hienDai",     # alias dữ liệu cũ
}

# MaGiaiDoan (mã giai đoạn nguồn) → phaseId (id web)
PHASE_MAP = {
    # ── Tiền Sử - Sơ Sử ──────────────────────────────
    "TS_DaCu":          "ph-dacuu",
    "TS_DaCuu":         "ph-dacuu",
    "TS_DaMoi":         "ph-damoi",
    "TS_KimKhi":        "ph-kimkhi",
    "TS_DungNuoc":      "ph-dungnuoc",
    "SS_VanLang":       "ph-dungnuoc",  # Văn Lang nằm trong giai đoạn dựng nước
    "SS_AuLac":         "ph-dungnuoc",
    "SS_NamViet":       "ph-dungnuoc",

    # ── Bắc Thuộc ─────────────────────────────────────
    "BT_Lan1":          "ph-bt1",
    "BT_BacThuocLan1":  "ph-bt1",
    "BT_Han":           "ph-bt1",       # alias cũ → Bắc thuộc lần 1
    "BT_HaiBaTrung":    "ph-knhbt",
    "BT_KNHaiBaTrung":  "ph-knhbt",
    "BT_Lan2":          "ph-bt2",
    "BT_BacThuocLan2":  "ph-bt2",
    "BT_TamQuoc":       "ph-bt2",       # alias cũ
    "BT_KNLyBi":        "ph-knlbi",
    "BT_LyBi":          "ph-knlbi",
    "BT_Lan3":          "ph-bt3",
    "BT_BacThuocLan3":  "ph-bt3",
    "BT_TuyDuong":      "ph-bt3",       # alias cũ

    # ── Phong Kiến Độc Lập ────────────────────────────
    "PK_TuChu":         "ph-tuchu",
    "PK_NhaNgo":        "ph-ngo",
    "PK_NhaDinh":       "ph-dinh",
    "PK_NhaTienLe":     "ph-tienle",
    "PK_TienLe":        "ph-tienle",
    "PK_NhaLy":         "ph-ly",
    "PK_NhaTran":       "ph-tran",
    "PK_NhaHo":         "ph-ho",
    "PK_ThuocMinh":     "ph-thuocminh",
    "PK_NhaLeSo":       "ph-leso",
    "PK_NhaLe":         "ph-leso",      # alias cũ
    "PK_TK16_18":       "ph-tk1618",
    "PK_NhaTaySon":     "ph-tayson",
    "PK_TaySon":        "ph-tayson",
    "PK_NhaNguyen":     "ph-nguyen",
    "PK_NguyenDL":      "ph-nguyen",

    # ── Pháp Thuộc ────────────────────────────────────
    "PT_XamLuoc":       "ph-xamluoc",
    "KP_PhapXam":       "ph-xamluoc",   # alias cũ
    "PT_1885_1919":     "ph-pt1885",
    "PT_1919_1930":     "ph-pt1919",
    "KP_PhongTrao":     "ph-pt1919",    # alias cũ
    "PT_1930_1945":     "ph-pt1930",
    "KP_VietMinh":      "ph-pt1930",    # alias cũ

    # ── Kháng Chiến ───────────────────────────────────
    "KC_ChongPhap":     "ph-kcphap",
    "KM_DauTranh":      "ph-kcmy",      # alias cũ
    "KC_ChongMy":       "ph-kcmy",
    "KM_ChienTranh":    "ph-kcmy",      # alias cũ
    "KM_HoaBinh":       "ph-kcmy",      # alias cũ

    # ── Hiện Đại ──────────────────────────────────────
    "HD_TruocDoiMoi":   "ph-truocdm",
    "HN_ThongNhat":     "ph-truocdm",   # alias cũ
    "HD_DoiMoi":        "ph-doimoi",
    "HN_DoiMoi":        "ph-doimoi",    # alias cũ
    "HD_HoiNhap":       "ph-hoinhap",
    "HN_HoiNhap":       "ph-hoinhap",  # alias cũ
}

# PL (mã phân loại) → danh sách tags
TAG_MAP = {
    "1":  ["văn hóa"],
    "2":  ["chính trị"],
    "3":  ["chiến tranh"],
    "4":  ["kinh tế"],
    "5":  ["ngoại giao"],
    "6":  ["khoa học"],
    "7":  ["tôn giáo"],
    "8":  ["nghệ thuật"],
    "9":  ["xã hội"],
    "10": ["lập quốc"],
}

# KHKT (khoa học kỹ thuật) và PL → icon emoji
# Ưu tiên theo PL trước, fallback theo KHKT
ICON_MAP_PL = {
    "1":  "🎨",   # văn hóa
    "2":  "👑",   # chính trị
    "3":  "⚔️",  # chiến tranh
    "4":  "📈",   # kinh tế
    "5":  "🌏",   # ngoại giao
    "6":  "🔬",   # khoa học
    "7":  "🙏",   # tôn giáo
    "8":  "🎭",   # nghệ thuật
    "9":  "👥",   # xã hội
    "10": "🏛️",  # lập quốc
}
ICON_KHKT = "⚙️"   # icon mặc định khi KHKT = "1" và không có PL mapping

# Thư mục ảnh (tương đối từ thư mục public/)
# Ảnh sẽ được tham chiếu dạng: /images/events/{Ma}_{Anh}.jpg
# Nếu Anh = "0" hoặc rỗng → không có ảnh
IMG_BASE_PATH = "/images/events"


# ══════════════════════════════════════════════════════════════════
# HÀM CHUYỂN ĐỔI
# ══════════════════════════════════════════════════════════════════

def map_img(ma: str, anh: str) -> str:
    """Tạo đường dẫn ảnh từ mã sự kiện và số ảnh."""
    if not anh or anh.strip() in ("0", ""):
        return ""
    # Nếu anh là URL đầy đủ, giữ nguyên
    if anh.startswith("http"):
        return anh
    # Nếu là số thứ tự → tạo đường dẫn chuẩn
    return f"{IMG_BASE_PATH}/{ma}_{anh}.jpg"


def map_tags(pl: str) -> list[str]:
    """Chuyển mã phân loại sang danh sách tags."""
    if not pl:
        return []
    # PL có thể là nhiều mã cách nhau dấu phẩy: "2,3"
    codes = [c.strip() for c in pl.split(",")]
    tags = []
    for code in codes:
        tags.extend(TAG_MAP.get(code, [code]))  # fallback: giữ nguyên mã nếu không có mapping
    return tags


def map_icon(pl: str, khkt: str) -> str:
    """Chọn icon emoji phù hợp."""
    if pl:
        first_pl = pl.split(",")[0].strip()
        icon = ICON_MAP_PL.get(first_pl)
        if icon:
            return icon
    if khkt and khkt.strip() == "1":
        return ICON_KHKT
    return "📌"  # default


def convert_event(src: dict, index: int) -> dict:
    """Chuyển đổi một record nguồn sang định dạng web."""
    ma        = src.get("Ma", f"ev_auto_{index}")
    ma_tk     = src.get("MaThoiKy", "")
    ma_gd     = src.get("MaGiaiDoan", "")
    anh       = src.get("Anh", "")
    pl        = src.get("PL", "")
    nam       = src.get("Nam", "0")
    nien_dai  = src.get("NienDai", "")
    su_kien   = src.get("SuKien", "")
    noi_dung  = src.get("NoiDung", "")
    khkt      = src.get("KHKT", "")

    # Parse năm — hỗ trợ cả chuỗi có dấu chấm/phẩy ngàn
    try:
        year_int = int(str(nam).replace(".", "").replace(",", "").strip())
    except ValueError:
        print(f"  ⚠️  Không parse được năm '{nam}' cho sự kiện '{ma}', đặt = 0", file=sys.stderr)
        year_int = 0

    period_id = PERIOD_MAP.get(ma_tk)
    if period_id is None:
        print(f"  ⚠️  Không tìm thấy periodId cho MaThoiKy='{ma_tk}' (sự kiện '{ma}')", file=sys.stderr)
        period_id = ma_tk  # giữ nguyên để dễ debug

    phase_id = PHASE_MAP.get(ma_gd, "")
    if ma_gd and phase_id == "" and ma_gd not in PHASE_MAP:
        print(f"  ⚠️  Không tìm thấy phaseId cho MaGiaiDoan='{ma_gd}' (sự kiện '{ma}')", file=sys.stderr)

    return {
        "id":       ma,
        "periodId": period_id,
        "phaseId":  phase_id,
        "year":     year_int,
        "nienDai":  nien_dai,          # lưu thêm nhãn hiển thị năm gốc
        "title":    su_kien,
        "desc":     noi_dung.replace("\r\n", "\n").strip(),
        "tags":     map_tags(pl),
        "icon":     map_icon(pl, khkt),
        "img":      map_img(ma, anh),
    }


def convert_file(input_path: str) -> list[dict]:
    """Đọc file JSON nguồn và chuyển đổi toàn bộ."""
    with open(input_path, encoding="utf-8") as f:
        raw = json.load(f)

    # Hỗ trợ cả mảng trực tiếp và object có key bọc ngoài
    if isinstance(raw, list):
        records = raw
    elif isinstance(raw, dict):
        # Thử tìm key đầu tiên chứa list
        for v in raw.values():
            if isinstance(v, list):
                records = v
                break
        else:
            records = [raw]  # single object
    else:
        raise ValueError(f"Định dạng JSON không hỗ trợ: {type(raw)}")

    print(f"  📂 Đọc {len(records)} record từ '{input_path}'")

    converted = []
    for i, rec in enumerate(records):
        try:
            out = convert_event(rec, i)
            converted.append(out)
        except Exception as e:
            print(f"  ❌ Lỗi record {i}: {e}", file=sys.stderr)

    return converted


def merge_into(new_events: list[dict], target_path: str) -> list[dict]:
    """
    Gộp new_events vào file target_path.
    - Nếu id đã tồn tại → cập nhật (update)
    - Nếu id mới → thêm vào cuối
    """
    with open(target_path, encoding="utf-8") as f:
        existing = json.load(f)

    existing_map = {e["id"]: e for e in existing}
    added, updated = 0, 0

    for ev in new_events:
        if ev["id"] in existing_map:
            existing_map[ev["id"]] = ev
            updated += 1
        else:
            existing_map[ev["id"]] = ev
            added += 1

    # Sắp xếp lại theo year
    merged = sorted(existing_map.values(), key=lambda e: e.get("year", 0))
    print(f"  ✅ Gộp xong: +{added} mới, ~{updated} cập nhật → tổng {len(merged)} sự kiện")
    return merged


# ══════════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Chuyển đổi dữ liệu sự kiện lịch sử sang định dạng web JSON."
    )
    parser.add_argument("input",  help="File JSON nguồn (định dạng cũ)")
    parser.add_argument("output", nargs="?", help="File JSON đích (bỏ qua nếu dùng --merge)")
    parser.add_argument("--merge", metavar="TARGET", help="Gộp vào file events_vn.json đang có")
    parser.add_argument("--sort", choices=["year", "id"], default="year", help="Sắp xếp kết quả theo trường nào")
    args = parser.parse_args()

    print(f"\n🔄 Bắt đầu chuyển đổi...")
    converted = convert_file(args.input)

    # Sắp xếp
    converted.sort(key=lambda e: e.get(args.sort, 0) if args.sort == "year" else str(e.get(args.sort, "")))

    if args.merge:
        # Gộp vào file hiện có
        if not os.path.exists(args.merge):
            print(f"  ⚠️  File '{args.merge}' không tồn tại, sẽ tạo mới.")
            result = converted
        else:
            result = merge_into(converted, args.merge)

        out_path = args.merge
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)
        print(f"  💾 Đã lưu vào '{out_path}'")

    else:
        # Xuất ra file mới
        out_path = args.output or args.input.replace(".json", "_converted.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(converted, f, ensure_ascii=False, indent=2)
        print(f"  💾 Đã xuất {len(converted)} sự kiện ra '{out_path}'")

    print(f"\n✅ Hoàn tất!\n")

    # In preview 1 record đầu
    if converted:
        print("─── Preview record đầu tiên ───")
        print(json.dumps(converted[0], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
