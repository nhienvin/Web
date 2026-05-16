import React, { useState, useRef, useEffect, useCallback } from "react";

/* ══════════════════════════════════════════════════════════════════
   FONTS + GLOBAL CSS
══════════════════════════════════════════════════════════════════ */
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400&family=Crimson+Pro:wght@300;400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0c0a07; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #0c0a07; }
  ::-webkit-scrollbar-thumb { background: #3a2e1e; border-radius: 2px; }
  input, select, textarea, button { font-family: inherit; outline: none; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:none; } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,208,96,.4);} 50%{box-shadow:0 0 0 8px rgba(255,208,96,0);} }
`;

/* ══════════════════════════════════════════════════════════════════
   DATA
══════════════════════════════════════════════════════════════════ */
const PERIODS = [
  { id:"prehistory", label:"Tiền Sử", years:"300.000 – 2879 TCN", color:"#a08060", bg:"#1e170e",
    intro:"Từ những con người đầu tiên đến nền văn minh lúa nước sơ khai, hàng trăm nghìn năm định hình bản sắc Việt.",
    videoId:"jNQXAC9IVRw", startYear:-300000, endYear:-2879,
    bgImg:"https://images.unsplash.com/photo-1518495973542-4542c06a5843?w=400&q=80" },
  { id:"ancient", label:"Sơ Sử", years:"2879 – 111 TCN", color:"#c8a050", bg:"#201608",
    intro:"Kỷ nguyên Hùng Vương với Văn Lang, Âu Lạc — nền tảng bản sắc dân tộc Việt được đặt trong thời kỳ này.",
    videoId:"jNQXAC9IVRw", startYear:-2879, endYear:-111,
    bgImg:"https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80" },
  { id:"bacThuoc", label:"Bắc Thuộc", years:"111 TCN – 938", color:"#6a9060", bg:"#0e1a0a",
    intro:"Hơn 1000 năm đô hộ phương Bắc nhưng tinh thần dân tộc không bao giờ tắt — từ Hai Bà Trưng đến Bạch Đằng.",
    videoId:"jNQXAC9IVRw", startYear:-111, endYear:938,
    bgImg:"https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=400&q=80" },
  { id:"phongKien", label:"Phong Kiến", years:"938 – 1858", color:"#5080b0", bg:"#0a1020",
    intro:"Chín thế kỷ độc lập với các triều Đinh, Lý, Trần, Lê, Nguyễn — đỉnh cao văn minh Đại Việt.",
    videoId:"jNQXAC9IVRw", startYear:938, endYear:1858,
    bgImg:"https://images.unsplash.com/photo-1509023464722-18d996393ca8?w=400&q=80" },
  { id:"khangPhap", label:"Kháng Pháp", years:"1858 – 1945", color:"#b05050", bg:"#1c0808",
    intro:"Từ tiếng súng Đà Nẵng 1858 đến Cách mạng Tháng Tám 1945 — 87 năm đòi lại độc lập dân tộc.",
    videoId:"jNQXAC9IVRw", startYear:1858, endYear:1945,
    bgImg:"https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80" },
  { id:"khangMy", label:"Kháng Mỹ", years:"1945 – 1975", color:"#c07030", bg:"#1c1008",
    intro:"30 năm trường kỳ — từ độc lập 1945 đến thống nhất hoàn toàn 30/4/1975.",
    videoId:"jNQXAC9IVRw", startYear:1945, endYear:1975,
    bgImg:"https://images.unsplash.com/photo-1526778548025-fa2f459cd5ce?w=400&q=80" },
  { id:"hienNay", label:"Hiện Nay", years:"1975 – nay", color:"#408060", bg:"#081810",
    intro:"Từ thống nhất 1975 qua Đổi Mới 1986 đến hội nhập quốc tế — Việt Nam vươn mình thế kỷ XXI.",
    videoId:"jNQXAC9IVRw", startYear:1975, endYear:2025,
    bgImg:"https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=400&q=80" },
];

const PHASES = {
  ancient: [
    { id:"ph-vanglang", label:"Văn Lang", startYear:-2879, endYear:-258 },
    { id:"ph-aulac",    label:"Âu Lạc",   startYear:-258,  endYear:-207 },
    { id:"ph-namviet",  label:"Nam Việt",  startYear:-207,  endYear:-111 },
  ],
  bacThuoc: [
    { id:"ph-han",      label:"Thời Hán",    startYear:-111, endYear:220 },
    { id:"ph-3k",       label:"Tam–Tấn",     startYear:220,  endYear:580 },
    { id:"ph-tuyduong", label:"Tùy–Đường",   startYear:580,  endYear:938 },
  ],
  phongKien: [
    { id:"ph-dinh",     label:"Nhà Đinh",    startYear:968,  endYear:980  },
    { id:"ph-leso",     label:"Tiền Lê",     startYear:980,  endYear:1009 },
    { id:"ph-ly",       label:"Nhà Lý",      startYear:1009, endYear:1225 },
    { id:"ph-tran",     label:"Nhà Trần",    startYear:1225, endYear:1400 },
    { id:"ph-ho",       label:"Nhà Hồ",      startYear:1400, endYear:1407 },
    { id:"ph-le",       label:"Nhà Lê",      startYear:1428, endYear:1789 },
    { id:"ph-tayson",   label:"Tây Sơn",     startYear:1778, endYear:1802 },
    { id:"ph-nguyen",   label:"Nhà Nguyễn",  startYear:1802, endYear:1945 },
  ],
  khangPhap: [
    { id:"ph-xam",      label:"Pháp xâm lược",  startYear:1858, endYear:1884 },
    { id:"ph-pt",       label:"Phong trào YN",   startYear:1884, endYear:1930 },
    { id:"ph-vm",       label:"Việt Minh",       startYear:1941, endYear:1945 },
  ],
  khangMy: [
    { id:"ph-dk",       label:"Đấu tranh",      startYear:1954, endYear:1965 },
    { id:"ph-ct",       label:"Chiến tranh",     startYear:1965, endYear:1973 },
    { id:"ph-hb",       label:"Hòa bình–1975",   startYear:1973, endYear:1975 },
  ],
  hienNay: [
    { id:"ph-tn",       label:"Thống nhất",      startYear:1975, endYear:1986 },
    { id:"ph-dm",       label:"Đổi Mới",         startYear:1986, endYear:2000 },
    { id:"ph-hi",       label:"Hội nhập",        startYear:2000, endYear:2025 },
  ],
};

const EVENTS_VN = [
  { id:"ev1",  periodId:"ancient",    phaseId:"ph-vanglang", year:-2879, title:"Lập nước Văn Lang",
    desc:"Vua Hùng Vương thứ nhất dựng nước Văn Lang — nhà nước đầu tiên của người Việt, đặt nền móng văn minh lúa nước đồng bằng Bắc Bộ với truyền thuyết Con Rồng Cháu Tiên.",
    tags:["lập quốc","chính trị"],
    img:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Temple_of_Hung_Kings.jpg/640px-Temple_of_Hung_Kings.jpg",
    icon:"👑" },
  { id:"ev2",  periodId:"ancient",    phaseId:"ph-aulac",    year:-258,  title:"An Dương Vương lập Âu Lạc",
    desc:"Thục Phán sáp nhập Âu Việt và Lạc Việt, xây thành Cổ Loa — kinh đô đầu tiên mang kiến trúc ốc xoáy độc đáo, với nỏ thần truyền thuyết bắn hàng nghìn mũi tên.",
    tags:["chính trị","kiến trúc"],
    img:"https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Co_Loa_citadel.jpg/640px-Co_Loa_citadel.jpg",
    icon:"🏰" },
  { id:"ev3",  periodId:"bacThuoc",   phaseId:"ph-han",      year:40,    title:"Khởi nghĩa Hai Bà Trưng",
    desc:"Trưng Trắc và Trưng Nhị khởi binh đánh đuổi Tô Định, giành lại độc lập trong 3 năm (40–43 SCN). Biểu tượng bất khuất của người phụ nữ Việt Nam mà ngày nay vẫn được thờ phụng.",
    tags:["khởi nghĩa","nữ anh hùng"],
    img:"https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Trung_Sisters_Statue.jpg/480px-Trung_Sisters_Statue.jpg",
    icon:"⚔️" },
  { id:"ev4",  periodId:"bacThuoc",   phaseId:"ph-han",      year:248,   title:"Khởi nghĩa Bà Triệu",
    desc:"Triệu Thị Trinh lãnh đạo cuộc khởi nghĩa chống nhà Ngô với tinh thần bất khuất: 'Tôi muốn cưỡi cơn gió mạnh, đạp luồng sóng dữ...'. Dù thất bại, bà trở thành biểu tượng anh hùng dân tộc.",
    tags:["khởi nghĩa","nữ anh hùng"],
    img:"",
    icon:"🐘" },
  { id:"ev5",  periodId:"bacThuoc",   phaseId:"ph-tuyduong", year:938,   title:"Chiến thắng Bạch Đằng",
    desc:"Ngô Quyền dùng kế cọc nhọn đánh tan quân Nam Hán trên sông Bạch Đằng, chấm dứt hơn 1.000 năm Bắc thuộc. Mở ra kỷ nguyên độc lập tự chủ lâu dài của dân tộc Việt.",
    tags:["chiến tranh","độc lập"],
    img:"",
    icon:"⚓" },
  { id:"ev6",  periodId:"phongKien",  phaseId:"ph-ly",       year:1010,  title:"Dời đô về Thăng Long",
    desc:"Lý Thái Tổ ban Chiếu dời đô từ Hoa Lư ra Đại La, đổi tên thành Thăng Long. Nền móng của Hà Nội nghìn năm văn hiến được đặt từ đây.",
    tags:["chính trị","văn hóa"],
    img:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/6c/Thang_Long_Imperial_Citadel_Hanoi.jpg/640px-Thang_Long_Imperial_Citadel_Hanoi.jpg",
    icon:"🏯" },
  { id:"ev7",  periodId:"phongKien",  phaseId:"ph-ly",       year:1076,  title:"Phòng tuyến sông Cầu",
    desc:"Lý Thường Kiệt chủ động đánh vào đất Tống rồi lập phòng tuyến sông Như Nguyệt, đọc bài thơ 'Nam quốc sơn hà' — bản tuyên ngôn độc lập đầu tiên của nước Việt.",
    tags:["chiến tranh","văn học"],
    img:"", icon:"📜" },
  { id:"ev8",  periodId:"phongKien",  phaseId:"ph-tran",     year:1258,  title:"Kháng chiến chống Mông Cổ lần I",
    desc:"Vua Trần Thái Tông lãnh đạo quân dân Đại Việt đánh lui đợt tấn công đầu tiên của đế quốc Nguyên Mông hùng mạnh nhất thế giới lúc bấy giờ.",
    tags:["chiến tranh","nguyên mông"],
    img:"", icon:"🏹" },
  { id:"ev9",  periodId:"phongKien",  phaseId:"ph-tran",     year:1288,  title:"Đại thắng Bạch Đằng lần III",
    desc:"Trần Hưng Đạo dùng kế cọc nhọn tiêu diệt toàn bộ thủy quân Nguyên Mông, kết thúc 3 lần xâm lược. Đế quốc Nguyên Mông bị đánh bại lần đầu tiên trong lịch sử.",
    tags:["chiến tranh","đại thắng"],
    img:"", icon:"⚔️" },
  { id:"ev10", periodId:"phongKien",  phaseId:"ph-le",       year:1428,  title:"Lê Lợi lên ngôi",
    desc:"Sau 10 năm Khởi nghĩa Lam Sơn, Lê Lợi đánh đuổi quân Minh, lập nhà Lê Sơ. Nguyễn Trãi soạn Bình Ngô Đại Cáo — bản tuyên ngôn độc lập vĩ đại.",
    tags:["độc lập","chính trị"],
    img:"", icon:"👑" },
  { id:"ev11", periodId:"khangPhap",  phaseId:"ph-xam",      year:1858,  title:"Pháp tấn công Đà Nẵng",
    desc:"Liên quân Pháp–Tây Ban Nha nổ súng vào cửa biển Đà Nẵng ngày 1/9/1858, mở đầu quá trình xâm lược kéo dài 87 năm. Người dân Việt bắt đầu hành trình đòi lại nền độc lập.",
    tags:["chiến tranh","thực dân"],
    img:"", icon:"⚓" },
  { id:"ev12", periodId:"khangPhap",  phaseId:"ph-vm",       year:1945,  title:"Cách mạng Tháng Tám",
    desc:"Việt Minh lãnh đạo toàn quốc nổi dậy tháng 8/1945, giành chính quyền. Ngày 2/9/1945, Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình.",
    tags:["cách mạng","độc lập"],
    img:"", icon:"⭐" },
  { id:"ev13", periodId:"khangMy",    phaseId:"ph-ct",       year:1954,  title:"Chiến thắng Điện Biên Phủ",
    desc:"Tướng Võ Nguyên Giáp chỉ huy 56 ngày đêm công phá Điện Biên Phủ, buộc Pháp ký Hiệp định Genève. Lần đầu tiên một thực dân châu Âu bị đánh bại ở chiến trường chính quy.",
    tags:["chiến tranh","đại thắng"],
    img:"", icon:"🎖️" },
  { id:"ev14", periodId:"khangMy",    phaseId:"ph-ct",       year:1968,  title:"Tổng tiến công Tết Mậu Thân",
    desc:"Đêm giao thừa 1968, quân Giải phóng đồng loạt tấn công hơn 100 đô thị. Ý chí chiến tranh của Mỹ bị lung lay hoàn toàn, tạo bước ngoặt cho hòa đàm Paris.",
    tags:["chiến tranh","chiến lược"],
    img:"", icon:"🌙" },
  { id:"ev15", periodId:"khangMy",    phaseId:"ph-hb",       year:1975,  title:"Giải phóng miền Nam 30/4",
    desc:"Xe tăng số 390 húc đổ cổng Dinh Độc Lập lúc 11h30 ngày 30/4/1975. Đất nước thống nhất sau 30 năm chiến tranh. Một trong những thời khắc lịch sử vĩ đại nhất thế kỷ XX.",
    tags:["thống nhất","lịch sử"],
    img:"", icon:"🏳️" },
  { id:"ev16", periodId:"hienNay",    phaseId:"ph-dm",       year:1986,  title:"Đổi Mới",
    desc:"Đại hội VI ĐCSVN phát động Đổi Mới — chuyển sang kinh tế thị trường, mở cửa với thế giới. GDP tăng trưởng bình quân 7–8%/năm trong thập niên sau, đưa hàng triệu người thoát nghèo.",
    tags:["kinh tế","cải cách"],
    img:"", icon:"📈" },
  { id:"ev17", periodId:"hienNay",    phaseId:"ph-hi",       year:1995,  title:"Gia nhập ASEAN",
    desc:"Việt Nam gia nhập ASEAN ngày 28/7/1995, bình thường hóa quan hệ với Mỹ cùng năm. Bước ngoặt hội nhập khu vực mở ra thời kỳ phát triển kinh tế mạnh mẽ.",
    tags:["ngoại giao","hội nhập"],
    img:"", icon:"🌏" },
];

const EVENTS_WORLD = [
  { id:"ew1",  year:-221,  title:"Tần Thủy Hoàng thống nhất TQ", desc:"Lập đế chế Trung Hoa đầu tiên — ảnh hưởng trực tiếp đến Việt Nam.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Qínshǐhuáng.jpg/480px-Qínshǐhuáng.jpg" },
  { id:"ew2",  year:40,    title:"Đế quốc La Mã cực thịnh",      desc:"Pax Romana — thời kỳ hòa bình và phồn thịnh của La Mã.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Branteghem_Collection_-_Augustus.jpg/480px-Van_Branteghem_Collection_-_Augustus.jpg" },
  { id:"ew3",  year:1215,  title:"Magna Carta",                    desc:"Anh ký Magna Carta — nền tảng pháp quyền phương Tây.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/ee/Magna_Carta_%28British_Library_Cotton_MS_Augustus_II.106%29.jpg/480px-Magna_Carta_%28British_Library_Cotton_MS_Augustus_II.106%29.jpg" },
  { id:"ew4",  year:1271,  title:"Đế quốc Nguyên Mông",           desc:"Hốt Tất Liệt lập nhà Nguyên, 3 lần xâm lược Đại Việt.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/YuanEmperorAlbumKhubilaiPortrait.jpg/480px-YuanEmperorAlbumKhubilaiPortrait.jpg" },
  { id:"ew5",  year:1453,  title:"Constantinople thất thủ",        desc:"Ottoman chiếm Constantinople, kết thúc Đế quốc Byzantine.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/2/27/The_Entry_of_Mehmed_II_into_Constantinople_by_Fausto_Zonaro.jpg/480px-The_Entry_of_Mehmed_II_into_Constantinople_by_Fausto_Zonaro.jpg" },
  { id:"ew6",  year:1776,  title:"Mỹ tuyên bố độc lập",           desc:"Tuyên ngôn Độc lập Hoa Kỳ ký ngày 4/7/1776.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/US_Declaration_of_Independence_obverse.jpg/480px-US_Declaration_of_Independence_obverse.jpg" },
  { id:"ew7",  year:1789,  title:"Cách mạng Pháp",                 desc:"Pháp lật đổ quân chủ — mầm mống thực dân châu Á sau đó.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Anonymous_-_Prise_de_la_Bastille.jpg/480px-Anonymous_-_Prise_de_la_Bastille.jpg" },
  { id:"ew8",  year:1914,  title:"Thế chiến I bùng nổ",            desc:"Việt Nam bị Pháp đưa lính sang Châu Âu tham chiến.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/4/43/Cheshire_Regiment_trench_Somme_1916.jpg/480px-Cheshire_Regiment_trench_Somme_1916.jpg" },
  { id:"ew9",  year:1945,  title:"Nhật Bản đầu hàng",              desc:"Kết thúc Thế chiến II — tạo thời cơ cho Cách mạng Tháng Tám.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Aboard_USS_Missouri%2C_surrender_ceremony%2C_Sep_1945.jpg/480px-Aboard_USS_Missouri%2C_surrender_ceremony%2C_Sep_1945.jpg" },
  { id:"ew10", year:1969,  title:"Con người lên Mặt Trăng",        desc:"Apollo 11 — Neil Armstrong bước lên Mặt Trăng 20/7/1969.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/9/98/Aldrin_Apollo_11_original.jpg/480px-Aldrin_Apollo_11_original.jpg" },
  { id:"ew11", year:1991,  title:"Liên Xô tan rã",                 desc:"Kết thúc Chiến tranh Lạnh, ảnh hưởng lớn đến Việt Nam.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/b/b0/Moscow_coup_of_1991%2C_crowds_around_Boris_Yeltsin.jpg/480px-Moscow_coup_of_1991%2C_crowds_around_Boris_Yeltsin.jpg" },
  { id:"ew12", year:2001,  title:"Sự kiện 11/9",                   desc:"Khủng bố tấn công nước Mỹ, thay đổi trật tự thế giới.", img:"https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/September_11_Photo_Montage.jpg/480px-September_11_Photo_Montage.jpg" },
];

const CHARACTERS = [
  { id:"c1",  name:"Hùng Vương",        periodId:"ancient",   phaseId:"ph-vanglang", birthYear:-2879, deathYear:-258, role:"Vua lập quốc", dynasty:"Văn Lang",   avatar:"👑", desc:"18 đời vua Hùng dựng nước Văn Lang, đặt nền móng văn minh lúa nước. Lễ hội Đền Hùng ngày 10/3 Âm lịch vẫn được tổ chức hàng năm.", tags:["vua","lập quốc"] },
  { id:"c2",  name:"An Dương Vương",    periodId:"ancient",   phaseId:"ph-aulac",    birthYear:-257, deathYear:-207, role:"Vua Âu Lạc",    dynasty:"Âu Lạc",     avatar:"🏹", desc:"Thục Phán hợp nhất Âu Việt và Lạc Việt, xây thành Cổ Loa với nỏ thần truyền thuyết bắn nghìn mũi tên.", tags:["vua","kiến trúc"] },
  { id:"c3",  name:"Trưng Trắc",        periodId:"bacThuoc",  phaseId:"ph-han",      birthYear:12,   deathYear:43,   role:"Nữ Vương",      dynasty:"—",          avatar:"⚔️", desc:"Lãnh đạo cuộc khởi nghĩa đánh đuổi Tô Định, xưng vương 3 năm. Biểu tượng bất khuất muôn đời.", tags:["nữ anh hùng","khởi nghĩa"] },
  { id:"c4",  name:"Triệu Thị Trinh",   periodId:"bacThuoc",  phaseId:"ph-han",      birthYear:225,  deathYear:248,  role:"Nữ Tướng",      dynasty:"—",          avatar:"🐘", desc:"'Bà Triệu' cưỡi voi vàng, mặc áo giáp vàng ra trận với khí phách không khuất phục phong kiến phương Bắc.", tags:["nữ anh hùng","tướng lĩnh"] },
  { id:"c5",  name:"Ngô Quyền",         periodId:"bacThuoc",  phaseId:"ph-tuyduong", birthYear:898,  deathYear:944,  role:"Vua Ngô",       dynasty:"Nhà Ngô",    avatar:"⚓", desc:"Chiến thắng Bạch Đằng 938 — chấm dứt 1.000 năm Bắc thuộc, lập nhà Ngô, mở kỷ nguyên độc lập.", tags:["vua","tướng lĩnh"] },
  { id:"c6",  name:"Đinh Tiên Hoàng",   periodId:"phongKien", phaseId:"ph-dinh",     birthYear:924,  deathYear:979,  role:"Hoàng Đế",      dynasty:"Nhà Đinh",   avatar:"🗡️", desc:"Dẹp loạn 12 sứ quân, lập nhà nước Đại Cồ Việt độc lập đầu tiên, xây kinh đô Hoa Lư.", tags:["vua","thống nhất"] },
  { id:"c7",  name:"Lý Thái Tổ",        periodId:"phongKien", phaseId:"ph-ly",       birthYear:974,  deathYear:1028, role:"Hoàng Đế",      dynasty:"Nhà Lý",     avatar:"🏯", desc:"Dời đô về Thăng Long 1010, ban hành luật pháp tiến bộ, mở kỷ nguyên rực rỡ 216 năm nhà Lý.", tags:["vua","văn hóa"] },
  { id:"c8",  name:"Lý Thường Kiệt",    periodId:"phongKien", phaseId:"ph-ly",       birthYear:1019, deathYear:1105, role:"Tướng Quân",    dynasty:"Nhà Lý",     avatar:"📜", desc:"Chủ động đánh Tống, giữ phòng tuyến sông Như Nguyệt. Tác giả 'Nam quốc sơn hà' — tuyên ngôn độc lập đầu tiên.", tags:["tướng lĩnh","văn học"] },
  { id:"c9",  name:"Trần Hưng Đạo",     periodId:"phongKien", phaseId:"ph-tran",     birthYear:1228, deathYear:1300, role:"Quốc Công Tiết Chế", dynasty:"Nhà Trần", avatar:"🛡️", desc:"Đánh bại Nguyên Mông 3 lần, tác giả Hịch tướng sĩ và Binh thư yếu lược. Được tôn thành Đức Thánh Trần.", tags:["tướng lĩnh","văn học"] },
  { id:"c10", name:"Nguyễn Trãi",       periodId:"phongKien", phaseId:"ph-le",       birthYear:1380, deathYear:1442, role:"Khai Quốc Công Thần", dynasty:"Nhà Lê", avatar:"🖋️", desc:"Quân sư Lê Lợi, tác giả Bình Ngô Đại Cáo. Danh nhân văn hóa thế giới UNESCO 1980.", tags:["văn thần","văn học"] },
  { id:"c11", name:"Nguyễn Du",         periodId:"phongKien", phaseId:"ph-nguyen",   birthYear:1765, deathYear:1820, role:"Đại Thi Hào",   dynasty:"Nhà Nguyễn", avatar:"📖", desc:"Tác giả Truyện Kiều — kiệt tác văn học chữ Nôm. Danh nhân văn hóa thế giới UNESCO 2015.", tags:["văn học","nghệ thuật"] },
  { id:"c12", name:"Hồ Chí Minh",       periodId:"khangPhap", phaseId:"ph-vm",       birthYear:1890, deathYear:1969, role:"Chủ Tịch Nước", dynasty:"—",          avatar:"⭐", desc:"Người sáng lập Đảng CSVN và VNDCCH, đọc Tuyên ngôn Độc lập 2/9/1945, lãnh đạo hai cuộc kháng chiến.", tags:["lãnh tụ","chính trị"] },
  { id:"c13", name:"Võ Nguyên Giáp",    periodId:"khangMy",   phaseId:"ph-dk",       birthYear:1911, deathYear:2013, role:"Đại Tướng",     dynasty:"—",          avatar:"🎖️", desc:"Chỉ huy Điện Biên Phủ 1954, thiên tài quân sự của thế kỷ XX. Được tôn vinh khắp thế giới.", tags:["tướng lĩnh","chiến lược"] },
];

/* ══════════════════════════════════════════════════════════════════
   UTILS
══════════════════════════════════════════════════════════════════ */
function yl(y) {
  if (y == null) return "?";
  return y < 0 ? `${Math.abs(y)} TCN` : `${y}`;
}

function useDragScroll(ref) {
  const dragging = useRef(false);
  const startX = useRef(0);
  const scrollLeft = useRef(0);
  const onMouseDown = e => { dragging.current=true; startX.current=e.clientX; scrollLeft.current=ref.current?.scrollLeft||0; e.preventDefault(); };
  useEffect(() => {
    const mv = e => { if (!dragging.current||!ref.current) return; ref.current.scrollLeft=scrollLeft.current+(startX.current-e.clientX); };
    const up = () => { dragging.current=false; };
    window.addEventListener("mousemove",mv); window.addEventListener("mouseup",up);
    return () => { window.removeEventListener("mousemove",mv); window.removeEventListener("mouseup",up); };
  },[]);
  return { onMouseDown };
}

/* ══════════════════════════════════════════════════════════════════
   POPUP
══════════════════════════════════════════════════════════════════ */
function Popup({ item, onClose }) {
  if (!item) return null;
  const isChar = item.birthYear !== undefined;
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,background:"rgba(0,0,0,.88)",
      display:"flex",alignItems:"center",justifyContent:"center",
      zIndex:9000,padding:16,animation:"fadeIn .2s ease",
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#181410",border:"1px solid rgba(255,255,255,.1)",
        borderRadius:16,maxWidth:560,width:"100%",maxHeight:"88vh",overflowY:"auto",
        boxShadow:"0 32px 80px rgba(0,0,0,.9)",animation:"fadeUp .3s ease",
      }}>
        {/* Image */}
        {item.img && (
          <div style={{position:"relative",height:220,overflow:"hidden",borderRadius:"16px 16px 0 0"}}>
            <img src={item.img} alt={item.title||item.name} style={{width:"100%",height:"100%",objectFit:"cover"}}
              onError={e=>{e.target.parentElement.style.display="none"}} />
            <div style={{position:"absolute",inset:0,background:"linear-gradient(transparent 50%,rgba(0,0,0,.7))"}} />
          </div>
        )}
        <div style={{padding:"24px 28px 28px"}}>
          {isChar ? (
            <div style={{display:"flex",gap:16,alignItems:"flex-start",marginBottom:18}}>
              <div style={{fontSize:44,lineHeight:1,flexShrink:0}}>{item.avatar}</div>
              <div>
                <div style={{fontSize:11,color:"#a08050",letterSpacing:1.5,marginBottom:5,textTransform:"uppercase"}}>{item.role} · {item.dynasty}</div>
                <h2 style={{fontFamily:"Cormorant Garamond,serif",fontSize:24,fontWeight:700,color:"#f0e8d0",lineHeight:1.2}}>{item.name}</h2>
                <div style={{fontSize:12,color:"#7a6a5a",marginTop:6}}>{yl(item.birthYear)} – {yl(item.deathYear)}</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{fontSize:11,color:"#a08050",letterSpacing:1.5,marginBottom:8,textTransform:"uppercase"}}>{yl(item.year)}</div>
              <h2 style={{fontFamily:"Cormorant Garamond,serif",fontSize:24,fontWeight:700,color:"#f0e8d0",marginBottom:14,lineHeight:1.2}}>{item.title}</h2>
            </>
          )}
          <p style={{fontSize:14,color:"#c4bba8",lineHeight:1.8,marginBottom:18}}>{item.desc}</p>
          {item.tags?.length > 0 && (
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:20}}>
              {item.tags.map(t=>(
                <span key={t} style={{fontSize:11,padding:"3px 10px",borderRadius:20,background:"rgba(255,255,255,.07)",color:"#c0a870",border:"1px solid rgba(255,255,255,.06)"}}>{t}</span>
              ))}
            </div>
          )}
          <button onClick={onClose} style={{
            padding:"9px 22px",background:"rgba(255,255,255,.06)",
            border:"1px solid rgba(255,255,255,.14)",borderRadius:8,
            color:"#d0c8b8",cursor:"pointer",fontSize:13,transition:"background .15s",
          }}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.12)"}
            onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,.06)"}
          >Đóng ✕</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   LOGIN POPUP
══════════════════════════════════════════════════════════════════ */
function LoginPopup({ onSuccess, onClose }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  function login() {
    if (user==="admin" && pass==="vietnam2024") { onSuccess(); }
    else { setErr("Tên đăng nhập hoặc mật khẩu không đúng."); }
  }
  const IS = { width:"100%",background:"#241e18",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,color:"#e0d8c8",padding:"10px 14px",fontSize:14 };
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9500,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#181410",border:"1px solid rgba(255,255,255,.1)",borderRadius:16,width:"100%",maxWidth:380,padding:32,animation:"fadeUp .3s ease"}}>
        <h2 style={{fontFamily:"Cormorant Garamond,serif",fontSize:22,color:"#f0e8d0",marginBottom:6}}>Đăng nhập</h2>
        <p style={{fontSize:12,color:"#7a6a5a",marginBottom:24}}>Xác thực để truy cập trang quản trị dữ liệu.</p>
        <div style={{marginBottom:14}}>
          <label style={{display:"block",fontSize:11,color:"#a09880",marginBottom:5,letterSpacing:.5}}>TÊN ĐĂNG NHẬP</label>
          <input value={user} onChange={e=>setUser(e.target.value)} style={IS} placeholder="admin"
            onKeyDown={e=>e.key==="Enter"&&login()} />
        </div>
        <div style={{marginBottom:20}}>
          <label style={{display:"block",fontSize:11,color:"#a09880",marginBottom:5,letterSpacing:.5}}>MẬT KHẨU</label>
          <input type="password" value={pass} onChange={e=>setPass(e.target.value)} style={IS} placeholder="••••••••"
            onKeyDown={e=>e.key==="Enter"&&login()} />
        </div>
        {err && <div style={{fontSize:12,color:"#d07060",marginBottom:14,padding:"8px 12px",background:"rgba(208,96,80,.1)",borderRadius:6}}>{err}</div>}
        <p style={{fontSize:10,color:"#5a4a3a",marginBottom:16}}>Thông tin thử: admin / vietnam2024</p>
        <div style={{display:"flex",gap:10}}>
          <button onClick={login} style={{flex:1,padding:"10px",background:"#3a5c42",border:"none",borderRadius:8,color:"#90d0a0",cursor:"pointer",fontSize:14,fontWeight:600}}>Đăng nhập</button>
          <button onClick={onClose} style={{padding:"10px 16px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:8,color:"#9a8a7a",cursor:"pointer",fontSize:14}}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════════════════════════════════ */
function AdminPanel({ onClose }) {
  const [tab, setTab] = useState("events");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ periodId:"phongKien",phaseId:"",year:1000,title:"",desc:"",tags:"",img:"",icon:"📌" });
  const phases = PHASES[form.periodId]||[];
  const IS = { width:"100%",background:"#2a2520",border:"1px solid rgba(255,255,255,.1)",borderRadius:7,color:"#e0d8c8",padding:"8px 10px",fontSize:13 };

  function addEvent() {
    if (!form.title||!form.year) return alert("Cần tiêu đề và năm.");
    EVENTS_VN.push({...form,id:"e"+Date.now(),year:parseInt(form.year),tags:form.tags?form.tags.split(",").map(t=>t.trim()):[]});
    setShowForm(false);
    setForm({ periodId:"phongKien",phaseId:"",year:1000,title:"",desc:"",tags:"",img:"",icon:"📌" });
    alert("Đã thêm sự kiện!");
  }
  const inp = (label,key,type="text",opts={}) => (
    <div style={{marginBottom:12}}>
      <label style={{display:"block",fontSize:10,color:"#a09880",marginBottom:4,letterSpacing:.5}}>{label}</label>
      {type==="textarea"?<textarea value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} rows={3} style={IS}/>:
       type==="select"?<select value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={IS}>{opts.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}</select>:
       <input type={type} value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} style={IS}/>}
    </div>
  );
  return (
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.87)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9000,padding:16}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#181410",borderRadius:16,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",border:"1px solid rgba(255,255,255,.1)"}}>
        <div style={{padding:"18px 24px",borderBottom:"1px solid rgba(255,255,255,.06)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <h3 style={{fontFamily:"Cormorant Garamond,serif",fontSize:18,color:"#f0e8d0"}}>⚙ Quản trị dữ liệu</h3>
          <button onClick={onClose} style={{background:"none",border:"none",color:"#a09880",cursor:"pointer",fontSize:20}}>✕</button>
        </div>
        <div style={{display:"flex",borderBottom:"1px solid rgba(255,255,255,.05)"}}>
          {[["events","Sự Kiện"],["characters","Nhân Vật"]].map(([id,l])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:"10px 20px",border:"none",background:tab===id?"rgba(255,255,255,.05)":"transparent",color:tab===id?"#f0e8d0":"#706050",cursor:"pointer",fontSize:13}}>{l}</button>
          ))}
        </div>
        <div style={{padding:24}}>
          <button onClick={()=>setShowForm(v=>!v)} style={{padding:"8px 16px",background:"#2d4a35",border:"1px solid #3a6040",borderRadius:7,color:"#80c090",cursor:"pointer",fontSize:13,marginBottom:16}}>+ Thêm {tab==="events"?"sự kiện":"nhân vật"}</button>
          {showForm && tab==="events" && (
            <div style={{background:"#1e1a14",borderRadius:10,padding:18,marginBottom:16,border:"1px solid rgba(255,255,255,.05)"}}>
              {inp("TIÊU ĐỀ *","title")}
              {inp("THỜI KỲ","periodId","select",PERIODS.map(p=>({v:p.id,l:p.label})))}
              {inp("GIAI ĐOẠN","phaseId","select",[{v:"",l:"— Chọn giai đoạn —"},...phases.map(p=>({v:p.id,l:p.label}))])}
              {inp("NĂM * (số âm = TCN)","year","number")}
              {inp("BIỂU TƯỢNG (emoji)","icon")}
              {inp("MÔ TẢ *","desc","textarea")}
              {inp("TAGS (phân cách dấu phẩy)","tags")}
              {inp("URL HÌNH ẢNH","img")}
              <div style={{display:"flex",gap:8,marginTop:4}}>
                <button onClick={addEvent} style={{padding:"8px 16px",background:"#3a5c42",border:"none",borderRadius:7,color:"#fff",cursor:"pointer",fontSize:13}}>Lưu</button>
                <button onClick={()=>setShowForm(false)} style={{padding:"8px 14px",background:"rgba(255,255,255,.05)",border:"1px solid rgba(255,255,255,.1)",borderRadius:7,color:"#c4bba8",cursor:"pointer",fontSize:13}}>Hủy</button>
              </div>
            </div>
          )}
          <div style={{fontSize:10,color:"#7a6a5a",marginBottom:10,letterSpacing:.5}}>{(tab==="events"?EVENTS_VN:CHARACTERS).length} MỤC</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {(tab==="events"?EVENTS_VN:CHARACTERS).map(item=>(
              <div key={item.id} style={{display:"flex",gap:10,alignItems:"center",background:"#1e1a14",borderRadius:8,padding:"10px 14px",border:"1px solid rgba(255,255,255,.04)"}}>
                <span style={{fontSize:20}}>{item.icon||item.avatar}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,color:"#e0d8c8"}}>{item.title||item.name}</div>
                  <div style={{fontSize:10,color:"#7a6050"}}>{yl(item.year??item.birthYear)} · {PERIODS.find(p=>p.id===item.periodId)?.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HOME PAGE — BOOK SPINE
══════════════════════════════════════════════════════════════════ */
function HomePage() {
  const [selected, setSelected] = useState(null);
  const period = PERIODS.find(p=>p.id===selected);

  return (
    <div style={{display:"flex",height:"calc(100vh - 56px)",overflow:"hidden",background:"#0c0a07"}}>

      {/* LEFT: Book page / Video */}
      <div style={{
        flex:1,position:"relative",overflow:"hidden",
        transition:"flex .55s cubic-bezier(.4,0,.2,1)",
      }}>
        {/* Book page — shown when nothing selected */}
        <div style={{
          position:"absolute",inset:0,
          opacity:selected?0:1,pointerEvents:selected?"none":"auto",
          transition:"opacity .4s",
          background:"#16120e",
          backgroundImage:`url(https://images.unsplash.com/photo-1519682577862-22b62b24e493?w=1200&q=60)`,
          backgroundSize:"cover",backgroundPosition:"center",
        }}>
          <div style={{position:"absolute",inset:0,background:"rgba(10,8,5,.75)"}} />
          {/* Decorative page lines */}
          <div style={{position:"absolute",inset:0,opacity:.04,backgroundImage:"repeating-linear-gradient(transparent,transparent 27px,rgba(200,180,140,1) 27px,rgba(200,180,140,1) 28px)",backgroundPosition:"0 52px"}} />
          <div style={{position:"relative",zIndex:1,padding:"52px 56px",height:"100%",display:"flex",flexDirection:"column",justifyContent:"center"}}>
            <div style={{fontSize:11,color:"#c0a060",letterSpacing:4,marginBottom:20,textTransform:"uppercase"}}>Lịch Sử Việt Nam</div>
            <h1 style={{fontFamily:"Cormorant Garamond,serif",fontSize:clamp(28,4.5,52),fontWeight:700,color:"#f5eacc",lineHeight:1.2,marginBottom:24}}>
              Hành trình<br/>nghìn năm<br/>dựng nước
            </h1>
            <div style={{width:48,height:2,background:"#c0a060",marginBottom:24,opacity:.7}} />
            <p style={{fontSize:15,color:"#b0a080",lineHeight:1.9,maxWidth:380,marginBottom:28}}>
              Từ buổi bình minh của dân tộc Việt đến Việt Nam hội nhập thế kỷ XXI — hành trình hàng nghìn năm dựng nước và giữ nước, bất khuất trước mọi thế lực xâm lăng.
            </p>
            <p style={{fontSize:13,color:"#7a6a4a",lineHeight:1.7,maxWidth:360,marginBottom:12}}>
              Khám phá theo từng thời kỳ: chọn một gáy sách bên phải để bắt đầu hành trình.
            </p>
            <div style={{fontSize:12,color:"#5a4a30",display:"flex",alignItems:"center",gap:8}}>
              <span>Chọn một thời kỳ</span>
              <span style={{fontSize:18}}>→</span>
            </div>
          </div>
        </div>

        {/* Video — shown when period selected */}
        {selected && (
          <div style={{position:"absolute",inset:0,animation:"fadeIn .4s ease"}}>
            <iframe
              src={`https://www.youtube.com/embed/${period.videoId}?autoplay=0&rel=0`}
              title={period.label}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{position:"absolute",inset:0,width:"100%",height:"100%"}}
            />
            {/* Bottom info bar */}
            <div style={{
              position:"absolute",bottom:0,left:0,right:0,
              background:"linear-gradient(transparent,rgba(0,0,0,.9))",
              padding:"60px 32px 24px",pointerEvents:"none",
            }}>
              <div style={{fontSize:10,color:period.color,letterSpacing:3,marginBottom:6,textTransform:"uppercase"}}>{period.years}</div>
              <h2 style={{fontFamily:"Cormorant Garamond,serif",fontSize:26,color:"#f5eacc",fontWeight:700}}>{period.label}</h2>
              <p style={{fontSize:13,color:"#b0a080",marginTop:8,lineHeight:1.6,maxWidth:480}}>{period.intro}</p>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT: Book spine tabs */}
      <div style={{display:"flex",width:selected?"auto":"auto",flexShrink:0}}>
        {PERIODS.map((p,i) => {
          const isSel = selected===p.id;
          return (
            <div key={p.id}
              onClick={()=>setSelected(prev=>prev===p.id?null:p.id)}
              style={{
                width: isSel ? 0 : 56,
                overflow:"hidden",
                flexShrink:0,
                transition:"width .5s cubic-bezier(.4,0,.2,1)",
                cursor:"pointer",
                position:"relative",
                background: p.bg,
                backgroundImage: p.bgImg ? `url(${p.bgImg})` : "none",
                backgroundSize:"cover",
                backgroundPosition:"center",
                borderLeft:`1px solid rgba(255,255,255,.06)`,
              }}
            >
              {/* Dark overlay */}
              <div style={{position:"absolute",inset:0,background:isSel?"rgba(0,0,0,.0)":"rgba(0,0,0,.55)",transition:"background .4s"}} />
              {/* Spine content */}
              <div style={{
                position:"absolute",inset:0,display:"flex",flexDirection:"column",
                alignItems:"center",justifyContent:"center",padding:"20px 0",zIndex:1,
              }}>
                <div style={{width:2,height:28,background:p.color,borderRadius:1,marginBottom:14,opacity:.9}} />
                <div style={{
                  writingMode:"vertical-rl",textOrientation:"mixed",transform:"rotate(180deg)",
                  fontFamily:"Cormorant Garamond,serif",fontSize:13,fontWeight:700,
                  color:p.color,letterSpacing:3,whiteSpace:"nowrap",lineHeight:1,
                }}>{p.label}</div>
                <div style={{
                  writingMode:"vertical-rl",transform:"rotate(180deg)",
                  fontSize:9,color:"rgba(255,255,255,.28)",marginTop:10,letterSpacing:1,
                  whiteSpace:"nowrap",
                }}>{p.years}</div>
                <div style={{width:2,height:28,background:p.color,borderRadius:1,marginTop:14,opacity:.35}} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function clamp(min, vw, max) {
  return `clamp(${min}px, ${vw}vw, ${max}px)`;
}

/* ══════════════════════════════════════════════════════════════════
   EVENTS PAGE — TIMELINE
══════════════════════════════════════════════════════════════════ */
function EventsPage() {
  const [activePeriodId, setActivePeriodId] = useState("phongKien");
  const [activePhaseId, setActivePhaseId]  = useState(null);
  const [popup, setPopup] = useState(null);
  const [search, setSearch] = useState("");
  const tlRef = useRef(null);
  const { onMouseDown } = useDragScroll(tlRef);

  const period = PERIODS.find(p=>p.id===activePeriodId);
  const phases = PHASES[activePeriodId]||[];
  const yearRange = period.endYear - period.startYear || 1;
  const TW = Math.max(900, Math.abs(yearRange)/3 + 100);
  const PAD = 60;
  function yPx(y) { return PAD + ((y-period.startYear)/yearRange)*(TW-PAD*2); }

  const vnFiltered = EVENTS_VN.filter(e =>
    e.periodId===activePeriodId &&
    (!activePhaseId||e.phaseId===activePhaseId) &&
    (!search||e.title.toLowerCase().includes(search.toLowerCase())||e.desc.toLowerCase().includes(search.toLowerCase()))
  ).sort((a,b)=>a.year-b.year);

  const wdFiltered = EVENTS_WORLD.filter(e=>e.year>=period.startYear&&e.year<=period.endYear).sort((a,b)=>a.year-b.year);

  // Distribute VN events top/bottom to avoid overlap
  const ITEM_W = 108;
  function assignRows(items, getter) {
    const rows = [];
    const placed = [];
    items.forEach(item=>{
      const x = yPx(getter(item));
      let row = 0;
      while(placed.some(p=>p.row===row&&Math.abs(p.x-x)<ITEM_W+10)) row++;
      placed.push({x,row});
      rows.push(row);
    });
    return rows;
  }
  const vnRows = assignRows(vnFiltered, e=>e.year);
  const wdRows = assignRows(wdFiltered, e=>e.year);

  const MAX_VN_ROW = Math.max(0,...(vnRows.length ? vnRows : [0]));
  const MAX_WD_ROW = Math.max(0,...(wdRows.length ? wdRows : [0]));
  const ROW_H   = 86;   // khoảng cách giữa các hàng thẻ VN
  const CARD_H_EST = 110; // chiều cao ước tính thẻ VN
  const AXIS_H  = 36;   // chiều cao dải axis
  const LABEL_H = 14;   // chiều cao nhãn năm dưới axis
  const WD_CARD = 80;   // chiều cao thẻ thế giới
  const GAP_TOP = 8;    // khoảng nhỏ nhất giữa đáy thẻ VN và trục
  const GAP_BOT = 8;    // khoảng nhỏ nhất giữa trục và đỉnh thẻ TG

  // AXIS_Y = vị trí top của dải trục
  // Vùng VN: ít nhất (MAX_VN_ROW+1) hàng, mỗi hàng = ROW_H, thêm CARD_H_EST + margin trên
  const VN_AREA_H = 20 + CARD_H_EST + MAX_VN_ROW * ROW_H + GAP_TOP;
  const AXIS_Y    = VN_AREA_H;  // top của axis

  // Vùng thế giới bên dưới axis
  const WD_ROWS_H = (MAX_WD_ROW + 1) * (WD_CARD + 8);
  const WD_AREA_H = LABEL_H + GAP_BOT + WD_ROWS_H + 16;
  const TOTAL_H   = AXIS_Y + AXIS_H + WD_AREA_H;

  return (
    <div style={{minHeight:"calc(100vh - 56px)",background:"#0c0a07",display:"flex",flexDirection:"column"}}>
      {/* Period tabs */}
      <div style={{display:"flex",overflowX:"auto",background:"#0f0d09",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
        {PERIODS.map(p=>(
          <button key={p.id} onClick={()=>{setActivePeriodId(p.id);setActivePhaseId(null);}}
            style={{padding:"11px 18px",border:"none",cursor:"pointer",fontSize:13,fontFamily:"Crimson Pro,serif",fontWeight:activePhaseId||activePeriodId===p.id?600:400,
              borderBottom:activePeriodId===p.id?`3px solid ${p.color}`:"3px solid transparent",
              background:activePeriodId===p.id?"rgba(255,255,255,.04)":"transparent",
              color:activePeriodId===p.id?"#f0e8d0":"#706050",whiteSpace:"nowrap",transition:"all .2s"}}>
            {p.label}
          </button>
        ))}
        <div style={{flex:1}} />
        <div style={{display:"flex",alignItems:"center",padding:"0 16px",gap:8}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm sự kiện…"
            style={{padding:"6px 12px",background:"#1a1714",border:"1px solid rgba(255,255,255,.1)",borderRadius:7,color:"#d0c8b8",fontSize:12,width:180}} />
        </div>
      </div>

      {/* Phase pills */}
      {phases.length>0 && (
        <div style={{display:"flex",gap:6,padding:"10px 20px",background:"#0c0a07",overflowX:"auto",borderBottom:"1px solid rgba(255,255,255,.04)",flexShrink:0}}>
          <button onClick={()=>setActivePhaseId(null)} style={pill(!activePhaseId,period.color)}>Tất cả</button>
          {phases.map(ph=>(
            <button key={ph.id} onClick={()=>setActivePhaseId(ph.id)} style={pill(activePhaseId===ph.id,period.color)}>{ph.label}</button>
          ))}
        </div>
      )}

      {/* Timeline canvas */}
      <div style={{position:"relative",flex:1,overflow:"hidden"}}>
        <div ref={tlRef} onMouseDown={onMouseDown}
          style={{overflowX:"auto",overflowY:"auto",cursor:"grab",userSelect:"none"}}>
          <div style={{width:TW,height:TOTAL_H+8,position:"relative"}}>

            {/* Section labels */}
            <div style={{position:"absolute",top:4,left:PAD,fontSize:9,color:"#807060",letterSpacing:2,zIndex:5}}>SỰ KIỆN VIỆT NAM</div>
            <div style={{position:"absolute",top:AXIS_Y+AXIS_H+4,left:PAD,fontSize:9,color:"#507090",letterSpacing:2,zIndex:5}}>SỰ KIỆN THẾ GIỚI</div>

            {/* ── VN EVENTS (thẻ trên, đường nối xuống trục) ── */}
            {vnFiltered.map((ev,i)=>{
              const cx   = yPx(ev.year);          // tâm X theo trục thời gian
              const row  = vnRows[i];              // hàng tránh chồng (0 = gần trục nhất)
              const CARD_H = ev.img ? 110 : 78;   // chiều cao ước tính của thẻ
              const GAP   = 8;                     // khoảng cách nhỏ nhất card ↔ trục
              // đáy thẻ cách trục GAP + row*ROW_H
              const cardBottom = AXIS_Y - GAP - row * ROW_H;
              const cardTop    = cardBottom - CARD_H;
              const lineTop    = cardBottom;       // đường bắt đầu từ đáy thẻ
              const lineH      = AXIS_Y - cardBottom; // xuống đến top của axis
              return (
                <React.Fragment key={ev.id}>
                  {/* Thẻ sự kiện — absolute, không flexbox */}
                  <div onClick={()=>setPopup(ev)} style={{
                    position:"absolute", left:cx, top:cardTop,
                    transform:"translateX(-50%)",
                    width:106, cursor:"pointer", zIndex:3,
                    background:period.bg, border:`1px solid ${period.color}60`,
                    borderRadius:8, padding:"6px 8px", textAlign:"center",
                    boxShadow:`0 2px 12px rgba(0,0,0,.45)`,
                    transition:"transform .15s, box-shadow .15s",
                  }}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateX(-50%) scale(1.06)";e.currentTarget.style.boxShadow=`0 4px 20px rgba(0,0,0,.7),0 0 14px ${period.color}50`;}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="translateX(-50%) scale(1)";e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.45)";}}
                  >
                    <div style={{fontSize:17,marginBottom:2}}>{ev.icon}</div>
                    {ev.img && (
                      <img src={ev.img} alt={ev.title}
                        style={{width:"100%",height:38,objectFit:"cover",borderRadius:4,marginBottom:4,display:"block"}}
                        onError={e=>{e.target.style.display="none"}} />
                    )}
                    <div style={{fontSize:10,fontWeight:700,color:"#f0e8d0",lineHeight:1.25,marginBottom:2,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{ev.title}</div>
                    <div style={{fontSize:9,color:period.color}}>{yl(ev.year)}</div>
                  </div>
                  {/* Đường nối: từ đáy thẻ XUỐNG đến trục */}
                  <div style={{
                    position:"absolute", left:cx, top:lineTop,
                    width:1, height:lineH,
                    background:`${period.color}55`,
                    transform:"translateX(-50%)", zIndex:2,
                    pointerEvents:"none",
                  }} />
                </React.Fragment>
              );
            })}
            {vnFiltered.length===0 && (
              <div style={{position:"absolute",top:AXIS_Y/2,left:"50%",transform:"translate(-50%,-50%)",color:"#5a4a3a",fontSize:13}}>Không có sự kiện</div>
            )}

            {/* ── AXIS ── */}
            {/* Horizontal axis line */}
            <div style={{position:"absolute",top:AXIS_Y+AXIS_H/2-1,left:PAD,right:PAD,height:2,background:`${period.color}35`,borderRadius:1,zIndex:4}} />
            {/* Year tick marks */}
            {(()=>{
              const step=Math.ceil(yearRange/8/50)*50||10;
              const marks=[];
              let y=Math.ceil(period.startYear/step)*step;
              while(y<=period.endYear){
                const x=yPx(y);
                marks.push(
                  <React.Fragment key={y}>
                    {/* tick line */}
                    <div style={{position:"absolute",left:x,top:AXIS_Y,width:1,height:AXIS_H,background:`${period.color}35`,transform:"translateX(-50%)",zIndex:3,pointerEvents:"none"}} />
                    {/* year label below axis */}
                    <div style={{position:"absolute",left:x,top:AXIS_Y+AXIS_H+1,transform:"translateX(-50%)",fontSize:8,color:"#7a6a5a",whiteSpace:"nowrap",zIndex:5,pointerEvents:"none"}}>{yl(y)}</div>
                  </React.Fragment>
                );
                y+=step;
              }
              return marks;
            })()}
            {/* Period name centered on axis */}
            <div style={{position:"absolute",top:AXIS_Y+3,left:"50%",transform:"translateX(-50%)",fontSize:9,color:period.color,letterSpacing:3,whiteSpace:"nowrap",fontWeight:700,zIndex:5,pointerEvents:"none"}}>
              {period.label.toUpperCase()} · {period.years}
            </div>

            {/* ── WORLD EVENTS (thẻ dưới, đường nối lên trục) ── */}
            {wdFiltered.map((ev,i)=>{
              const cx      = yPx(ev.year);
              const row     = wdRows[i];
              const CARD_H  = 72;
              const GAP     = 10;
              const LABEL_H = 16; // chiều cao dòng năm dưới trục
              // đỉnh thẻ bắt đầu sau axis + label + gap + row offset
              const cardTop    = AXIS_Y + AXIS_H + LABEL_H + GAP + row * (CARD_H + 8);
              const lineTop    = AXIS_Y + AXIS_H;          // đường bắt đầu từ đáy trục
              const lineH      = cardTop - lineTop;         // lên đến đỉnh thẻ
              return (
                <React.Fragment key={ev.id}>
                  {/* Đường nối: từ đáy trục XUỐNG đến đỉnh thẻ */}
                  <div style={{
                    position:"absolute", left:cx, top:lineTop,
                    width:1, height:lineH,
                    background:"#405870",
                    transform:"translateX(-50%)", zIndex:2,
                    pointerEvents:"none",
                  }} />
                  {/* Thẻ sự kiện thế giới */}
                  <div onClick={()=>setPopup(ev)} style={{
                    position:"absolute", left:cx, top:cardTop,
                    transform:"translateX(-50%)",
                    width:102, cursor:"pointer", zIndex:3,
                    background:"#101822", border:"1px solid #253545",
                    borderRadius:7, overflow:"hidden",
                    boxShadow:"0 2px 10px rgba(0,0,0,.5)",
                    transition:"transform .15s, box-shadow .15s",
                  }}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateX(-50%) scale(1.06)";e.currentTarget.style.boxShadow="0 4px 18px rgba(0,0,0,.7),0 0 12px #30607080";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="translateX(-50%) scale(1)";e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,.5)";}}
                  >
                    {ev.img && (
                      <img src={ev.img} alt={ev.title}
                        style={{width:"100%",height:38,objectFit:"cover",display:"block"}}
                        onError={e=>{e.target.style.display="none"}} />
                    )}
                    <div style={{padding:"5px 7px",textAlign:"center"}}>
                      <div style={{fontSize:9,fontWeight:700,color:"#90b8d0",lineHeight:1.3,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{ev.title}</div>
                      <div style={{fontSize:8,color:"#405868",marginTop:2}}>{yl(ev.year)}</div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

          </div>
        </div>
        {/* Scroll buttons */}
        <button onClick={()=>tlRef.current&&(tlRef.current.scrollLeft-=220)} style={navBtn("left")}>‹</button>
        <button onClick={()=>tlRef.current&&(tlRef.current.scrollLeft+=220)} style={navBtn("right")}>›</button>
      </div>

      <div style={{padding:"6px 20px",background:"#080706",fontSize:10,color:"#5a4a3a",letterSpacing:.5,flexShrink:0}}>
        {vnFiltered.length} SỰ KIỆN VN · {wdFiltered.length} THẾ GIỚI · Kéo để cuộn · Click để xem chi tiết
      </div>
      <Popup item={popup} onClose={()=>setPopup(null)} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CHARACTERS PAGE — TIMELINE
══════════════════════════════════════════════════════════════════ */
function CharactersPage() {
  const [activePeriodId, setActivePeriodId] = useState("phongKien");
  const [popup, setPopup]     = useState(null);
  const [search, setSearch]   = useState("");
  const [highlightId, setHighlightId] = useState(null);
  const tlRef = useRef(null);
  const { onMouseDown } = useDragScroll(tlRef);

  const period = PERIODS.find(p=>p.id===activePeriodId);
  const yearRange = period.endYear - period.startYear || 1;
  const TW = Math.max(900, Math.abs(yearRange)/2.5 + 100);
  const PAD = 60;
  function yPx(y) { return PAD + ((y-period.startYear)/yearRange)*(TW-PAD*2); }

  const chars = CHARACTERS.filter(c=>c.periodId===activePeriodId).sort((a,b)=>a.birthYear-b.birthYear);

  // Assign rows alternating top/bottom
  const ITEM_W = 100;
  function assignCharRows(items) {
    const placed = [];
    return items.map(item=>{
      const x = yPx(item.birthYear);
      // try top (0) then bottom (1) then deeper rows
      for (let row = 0; row < 20; row++) {
        const side = row % 2; // 0=top, 1=bottom
        const depth = Math.floor(row/2);
        if (!placed.some(p=>p.side===side&&p.depth===depth&&Math.abs(p.x-x)<ITEM_W+14)) {
          placed.push({x,side,depth});
          return {side,depth};
        }
      }
      return {side:0,depth:0};
    });
  }
  const charLayouts = assignCharRows(chars);
  const maxTopDepth  = Math.max(0,...(charLayouts.filter(l=>l.side===0).map(l=>l.depth).concat([0])));
  const maxBotDepth  = Math.max(0,...(charLayouts.filter(l=>l.side===1).map(l=>l.depth).concat([0])));
  const CHAR_H  = 88;   // chiều cao thẻ nhân vật
  const ROW_H   = 100;  // khoảng cách hàng
  const AXIS_H  = 36;
  const LABEL_H = 14;
  const GAP     = 8;
  const TOP_H   = 20 + CHAR_H + maxTopDepth * ROW_H + GAP;  // vùng trên = đến trục
  const AXIS_Y  = TOP_H;
  const BOT_H   = LABEL_H + GAP + (maxBotDepth+1) * (CHAR_H+8) + 16;
  const TOTAL_H = TOP_H + AXIS_H + BOT_H;

  // Search
  const searchResults = search.length>1 ? CHARACTERS.filter(c=>c.name.toLowerCase().includes(search.toLowerCase())||c.role.toLowerCase().includes(search.toLowerCase())) : [];
  function handleSearchClick(char) {
    setActivePeriodId(char.periodId);
    setHighlightId(char.id);
    setSearch("");
    setTimeout(()=>{ if(tlRef.current) { const x=PAD+((char.birthYear-PERIODS.find(p=>p.id===char.periodId).startYear)/(PERIODS.find(p=>p.id===char.periodId).endYear-PERIODS.find(p=>p.id===char.periodId).startYear))*(TW-PAD*2); tlRef.current.scrollLeft=x-tlRef.current.clientWidth/2; }},200);
    setTimeout(()=>setHighlightId(null),3500);
  }

  // Scroll to highlight
  useEffect(()=>{
    if (!highlightId||!tlRef.current) return;
    const c=CHARACTERS.find(x=>x.id===highlightId);
    if (!c||c.periodId!==activePeriodId) return;
    const x=yPx(c.birthYear);
    tlRef.current.scrollLeft=x-tlRef.current.clientWidth/2;
  },[highlightId,activePeriodId]);

  return (
    <div style={{minHeight:"calc(100vh - 56px)",background:"#0c0a07",display:"flex",flexDirection:"column"}}>
      {/* Period tabs + Search */}
      <div style={{display:"flex",overflowX:"auto",background:"#0f0d09",borderBottom:"1px solid rgba(255,255,255,.05)",flexShrink:0}}>
        {PERIODS.map(p=>(
          <button key={p.id} onClick={()=>{setActivePeriodId(p.id);setHighlightId(null);}}
            style={{padding:"11px 18px",border:"none",cursor:"pointer",fontSize:13,
              borderBottom:activePeriodId===p.id?`3px solid ${p.color}`:"3px solid transparent",
              background:activePeriodId===p.id?"rgba(255,255,255,.04)":"transparent",
              color:activePeriodId===p.id?"#f0e8d0":"#706050",whiteSpace:"nowrap",transition:"all .2s",fontFamily:"Crimson Pro,serif"}}>
            {p.label}
            <span style={{opacity:.45,fontSize:10,marginLeft:4}}>({CHARACTERS.filter(c=>c.periodId===p.id).length})</span>
          </button>
        ))}
        <div style={{flex:1}} />
        {/* SEARCH */}
        <div style={{display:"flex",alignItems:"center",padding:"0 16px",position:"relative"}}>
          <div style={{position:"relative"}}>
            <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:13,color:"#706050"}}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Tìm nhân vật lịch sử…"
              style={{padding:"6px 12px 6px 30px",background:"#1a1714",border:"1px solid rgba(255,255,255,.12)",borderRadius:7,color:"#d0c8b8",fontSize:12,width:220}} />
          </div>
          {searchResults.length>0 && (
            <div style={{position:"absolute",top:"100%",right:0,width:300,background:"#1c1814",border:"1px solid rgba(255,255,255,.1)",borderRadius:10,zIndex:500,boxShadow:"0 8px 32px #000a",maxHeight:300,overflowY:"auto"}}>
              <div style={{padding:"8px 14px",fontSize:10,color:"#7a6a5a",letterSpacing:.5,borderBottom:"1px solid rgba(255,255,255,.05)"}}>
                {searchResults.length} KẾT QUẢ — click để trỏ tới timeline
              </div>
              {searchResults.map(c=>(
                <div key={c.id} onClick={()=>handleSearchClick(c)}
                  style={{padding:"10px 14px",cursor:"pointer",borderBottom:"1px solid rgba(255,255,255,.03)",display:"flex",gap:10,alignItems:"center",transition:"background .15s"}}
                  onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,.05)"}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}
                >
                  <span style={{fontSize:22,flexShrink:0}}>{c.avatar}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,color:"#e0d8c8",fontFamily:"Cormorant Garamond,serif",fontWeight:600}}>{c.name}</div>
                    <div style={{fontSize:10,color:"#7a6a5a"}}>{c.role} · {PERIODS.find(p=>p.id===c.periodId)?.label}</div>
                  </div>
                  <div style={{fontSize:10,color:"#4a7a4a",flexShrink:0}}>→ trỏ tới</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div style={{position:"relative",flex:1,overflow:"hidden"}}>
        <div ref={tlRef} onMouseDown={onMouseDown}
          style={{overflowX:"auto",overflowY:"auto",cursor:"grab",userSelect:"none"}}>
          <div style={{width:TW,height:TOTAL_H+8,position:"relative"}}>

            {/* ── CHARACTERS (top & bottom, all absolute) ── */}
            {chars.map((c,i)=>{
              const layout  = charLayouts[i];
              const cx      = yPx(c.birthYear);
              const isTop   = layout.side === 0;
              const depth   = layout.depth;
              const isHi    = c.id === highlightId;
              const color   = isHi ? "#ffd060" : period.color;

              let cardTop, lineTop, lineH;
              if (isTop) {
                // thẻ trên: đáy thẻ cách trục GAP + depth*ROW_H
                const cardBottom = AXIS_Y - GAP - depth * ROW_H;
                cardTop  = cardBottom - CHAR_H;
                lineTop  = cardBottom;           // đường bắt đầu từ đáy thẻ
                lineH    = AXIS_Y - cardBottom;  // xuống đến trục
              } else {
                // thẻ dưới: đỉnh thẻ sau axis + label + gap + depth*row
                cardTop  = AXIS_Y + AXIS_H + LABEL_H + GAP + depth * (CHAR_H + 8);
                lineTop  = AXIS_Y + AXIS_H;      // từ đáy trục
                lineH    = cardTop - lineTop;    // xuống đến đỉnh thẻ
              }

              return (
                <React.Fragment key={c.id}>
                  {/* Đường nối */}
                  <div style={{
                    position:"absolute", left:cx, top:lineTop,
                    width:1, height:lineH,
                    background:`${color}55`,
                    transform:"translateX(-50%)", zIndex:2, pointerEvents:"none",
                  }} />
                  {/* Thẻ nhân vật */}
                  <div onClick={()=>setPopup(c)} style={{
                    position:"absolute", left:cx, top:cardTop,
                    transform:"translateX(-50%)",
                    width:94, cursor:"pointer", zIndex:3,
                    background: isHi ? "#221800" : period.bg,
                    border:`1px solid ${color}${isHi?"":"70"}`,
                    borderRadius:10, padding:"7px 6px", textAlign:"center",
                    boxShadow: isHi ? `0 0 24px ${color}55,0 2px 12px rgba(0,0,0,.6)` : "0 2px 10px rgba(0,0,0,.5)",
                    animation: isHi ? "pulse 1.2s 3" : "none",
                    transition:"transform .15s, box-shadow .15s",
                  }}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateX(-50%) scale(1.06)";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="translateX(-50%) scale(1)";}}
                  >
                    <div style={{
                      width:36, height:36, borderRadius:"50%",
                      background: isHi ? "rgba(255,208,0,.18)" : `${period.color}20`,
                      border:`2px solid ${color}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:17, margin:"0 auto 5px",
                    }}>{c.avatar}</div>
                    <div style={{fontSize:10,fontWeight:700,color:"#f0e8d0",lineHeight:1.25,marginBottom:2,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>{c.name}</div>
                    <div style={{fontSize:9,color}}>{yl(c.birthYear)}</div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* ── AXIS ── */}
            <div style={{position:"absolute",top:AXIS_Y+AXIS_H/2-1,left:PAD,right:PAD,height:2,background:`${period.color}35`,borderRadius:1,zIndex:4}} />
            {(()=>{
              const step=Math.ceil(yearRange/8/50)*50||10;
              const marks=[];
              let y=Math.ceil(period.startYear/step)*step;
              while(y<=period.endYear){
                const x=yPx(y);
                marks.push(
                  <React.Fragment key={y}>
                    <div style={{position:"absolute",left:x,top:AXIS_Y,width:1,height:AXIS_H,background:`${period.color}35`,transform:"translateX(-50%)",zIndex:3,pointerEvents:"none"}} />
                    <div style={{position:"absolute",left:x,top:AXIS_Y+AXIS_H+1,transform:"translateX(-50%)",fontSize:8,color:"#7a6a5a",whiteSpace:"nowrap",zIndex:5,pointerEvents:"none"}}>{yl(y)}</div>
                  </React.Fragment>
                );
                y+=step;
              }
              return marks;
            })()}
            <div style={{position:"absolute",top:AXIS_Y+4,left:"50%",transform:"translateX(-50%)",fontSize:9,color:period.color,letterSpacing:3,whiteSpace:"nowrap",fontWeight:700,zIndex:5,pointerEvents:"none"}}>
              {period.label.toUpperCase()} · {period.years}
            </div>

            {chars.length===0 && (
              <div style={{position:"absolute",top:AXIS_Y/2,left:"50%",transform:"translate(-50%,-50%)",color:"#5a4a3a",fontSize:13}}>Chưa có nhân vật trong thời kỳ này</div>
            )}
          </div>
        </div>
        <button onClick={()=>tlRef.current&&(tlRef.current.scrollLeft-=220)} style={navBtn("left")}>‹</button>
        <button onClick={()=>tlRef.current&&(tlRef.current.scrollLeft+=220)} style={navBtn("right")}>›</button>
      </div>

      <div style={{padding:"6px 20px",background:"#080706",fontSize:10,color:"#5a4a3a",letterSpacing:.5,flexShrink:0}}>
        {chars.length} NHÂN VẬT · Tìm kiếm → tự động trỏ timeline · Click để xem chi tiết · Kéo để cuộn
      </div>
      <Popup item={popup} onClose={()=>setPopup(null)} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */
function pill(active,color) {
  return { padding:"5px 12px",border:active?`1px solid ${color}`:"1px solid rgba(255,255,255,.08)",borderRadius:20,background:active?`${color}20`:"transparent",color:active?"#f0e8d0":"#907060",cursor:"pointer",fontSize:12,whiteSpace:"nowrap",transition:"all .15s" };
}
function navBtn(side) {
  return { position:"absolute",[side]:4,top:"50%",transform:"translateY(-50%)",background:"rgba(0,0,0,.75)",border:"1px solid rgba(255,255,255,.1)",borderRadius:side==="left"?"0 7px 7px 0":"7px 0 0 7px",color:"#d0c8b8",cursor:"pointer",width:28,height:52,fontSize:20,display:"flex",alignItems:"center",justifyContent:"center",zIndex:20 };
}

/* ══════════════════════════════════════════════════════════════════
   ROOT
══════════════════════════════════════════════════════════════════ */
export default function App() {
  const [page, setPage]           = useState("home");
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [authed, setAuthed]       = useState(false);

  function handleAdminClick() {
    if (authed) setShowAdmin(true);
    else setShowLogin(true);
  }
  function onLoginSuccess() {
    setAuthed(true);
    setShowLogin(false);
    setShowAdmin(true);
  }

  const NAV = [
    { id:"home",       label:"🏛  Trang Chủ" },
    { id:"events",     label:"📅  Sự Kiện"   },
    { id:"characters", label:"👤  Nhân Vật"  },
  ];

  return (
    <div style={{minHeight:"100vh",background:"#0c0a07",fontFamily:"Crimson Pro,Georgia,serif",color:"#e0d8c8"}}>
      <style>{GLOBAL_CSS}</style>

      {/* NAV */}
      <nav style={{
        height:56,background:"#09080603",backdropFilter:"blur(12px)",
        borderBottom:"1px solid rgba(255,255,255,.06)",
        display:"flex",alignItems:"center",padding:"0 20px",gap:4,
        position:"sticky",top:0,zIndex:1000,
        boxShadow:"0 1px 24px rgba(0,0,0,.5)",
        backgroundColor:"rgba(10,8,5,.9)",
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginRight:24}}>
          <span style={{fontSize:22}}>🇻🇳</span>
          <div>
            <div style={{fontFamily:"Cormorant Garamond,serif",fontSize:16,fontWeight:700,color:"#e8d8a0",lineHeight:1,letterSpacing:.5}}>Lịch Sử Việt Nam</div>
            <div style={{fontSize:8,color:"#6a5a40",letterSpacing:3}}>INTERACTIVE TIMELINE</div>
          </div>
        </div>
        {NAV.map(n=>(
          <button key={n.id} onClick={()=>setPage(n.id)} style={{
            padding:"7px 16px",border:"none",cursor:"pointer",
            background:page===n.id?"rgba(255,255,255,.07)":"transparent",
            color:page===n.id?"#f0e8d0":"#807060",
            borderRadius:7,fontSize:13,fontFamily:"Crimson Pro,serif",
            fontWeight:page===n.id?600:400,transition:"all .2s",letterSpacing:.3,
            borderBottom:page===n.id?"2px solid rgba(255,255,255,.15)":"2px solid transparent",
          }}>{n.label}</button>
        ))}
        <div style={{flex:1}} />
        {authed && <span style={{fontSize:10,color:"#5a8050",marginRight:8,letterSpacing:.5}}>✓ ĐÃ ĐĂNG NHẬP</span>}
        <button onClick={handleAdminClick} style={{
          padding:"7px 14px",background:"#1a2a1a",border:"1px solid #2a4a2a",
          borderRadius:7,color:"#609060",cursor:"pointer",fontSize:12,letterSpacing:.3,
        }}>⚙ Quản trị</button>
      </nav>

      {page==="home"       && <HomePage />}
      {page==="events"     && <EventsPage />}
      {page==="characters" && <CharactersPage />}

      {showLogin && <LoginPopup onSuccess={onLoginSuccess} onClose={()=>setShowLogin(false)} />}
      {showAdmin && <AdminPanel onClose={()=>setShowAdmin(false)} />}
    </div>
  );
}
