import React, { useState, useRef, useEffect, useCallback } from "react";

/* ═══════════════ GLOBAL CSS ═══════════════ */
const GCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Crimson+Pro:wght@300;400;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0c0a07; color: #e0d8c8; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #0c0a07; }
  ::-webkit-scrollbar-thumb { background: #3a2e1e; border-radius: 2px; }
  input, select, textarea, button { font-family: inherit; outline: none; }
  @keyframes fadeIn  { from { opacity:0; }              to { opacity:1; } }
  @keyframes fadeUp  { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:none; } }
  @keyframes pulse   { 0%,100%{box-shadow:0 0 0 0 rgba(255,208,96,.5);} 60%{box-shadow:0 0 0 10px rgba(255,208,96,0);} }
`;

/* ═══════════════ DATA HOOK ═══════════════ */
function useData() {
  const [periods,    setPeriods]    = useState([]);
  const [eventsVN,   setEventsVN]   = useState([]);
  const [eventsWorld,setEventsWorld] = useState([]);
  const [characters, setCharacters]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/data/periods.json").then(r => r.json()),
      fetch("/data/events_vn.json").then(r => r.json()),
      fetch("/data/events_world.json").then(r => r.json()),
      fetch("/data/characters.json").then(r => r.json()),
    ]).then(([p, ev, ew, ch]) => {
      setPeriods(p);
      setEventsVN(ev);
      setEventsWorld(ew);
      setCharacters(ch);
      setLoading(false);
    }).catch(err => {
      console.error("Data load error:", err);
      setLoading(false);
    });
  }, []);

  return { periods, eventsVN, eventsWorld, characters, loading };
}

/* ═══════════════ UTILS ═══════════════ */
const yl = y => y == null ? "?" : y < 0 ? `${Math.abs(y)} TCN` : `${y}`;

function useDragScroll(ref) {
  const drag = useRef(false);
  const sx   = useRef(0);
  const sl   = useRef(0);
  const down = useCallback(e => {
    drag.current = true; sx.current = e.clientX; sl.current = ref.current?.scrollLeft || 0; e.preventDefault();
  }, []);
  useEffect(() => {
    const mv = e => { if (!drag.current || !ref.current) return; ref.current.scrollLeft = sl.current + (sx.current - e.clientX); };
    const up = () => { drag.current = false; };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);
  return { onMouseDown: down };
}

function assignRows(items, getX, minGap = 118) {
  const placed = [];
  return items.map(item => {
    const x = getX(item);
    let row = 0;
    while (placed.some(p => p.row === row && Math.abs(p.x - x) < minGap)) row++;
    placed.push({ x, row });
    return row;
  });
}

function assignCharSides(items, getX, minGap = 108) {
  const placed = [];
  return items.map(item => {
    const x = getX(item);
    for (let r = 0; r < 40; r++) {
      const side = r % 2, depth = Math.floor(r / 2);
      if (!placed.some(p => p.side === side && p.depth === depth && Math.abs(p.x - x) < minGap)) {
        placed.push({ x, side, depth });
        return { side, depth };
      }
    }
    return { side: 0, depth: 0 };
  });
}

/* ═══════════════ PILL ═══════════════ */
const pill = (active, color) => ({
  padding: "5px 12px",
  border: active ? `1px solid ${color}` : "1px solid rgba(255,255,255,.1)",
  borderRadius: 20,
  background: active ? `${color}22` : "transparent",
  color: active ? "#f0e8d0" : "#907060",
  cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", transition: "all .15s",
});

const navBtn = side => ({
  position: "absolute", [side]: 0, top: "50%", transform: "translateY(-50%)",
  background: "rgba(0,0,0,.75)", border: "1px solid rgba(255,255,255,.08)",
  borderRadius: side === "left" ? "0 7px 7px 0" : "7px 0 0 7px",
  color: "#d0c8b8", cursor: "pointer", width: 28, height: 52,
  fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 20,
});

/* ═══════════════ POPUP ═══════════════ */
function Popup({ item, onClose }) {
  if (!item) return null;
  const isChar = item.birthYear !== undefined;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.88)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9000, padding:16, animation:"fadeIn .2s" }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#181410", border:"1px solid rgba(255,255,255,.1)", borderRadius:16, maxWidth:540, width:"100%", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 32px 80px #000c", animation:"fadeUp .3s" }}>
        {item.img && (
          <div style={{ height:210, overflow:"hidden", borderRadius:"16px 16px 0 0", position:"relative" }}>
            <img src={item.img} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} onError={e => { e.target.parentElement.style.display = "none"; }} />
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(transparent 50%,rgba(0,0,0,.7))" }} />
          </div>
        )}
        <div style={{ padding:"24px 28px 28px" }}>
          {isChar ? (
            <div style={{ display:"flex", gap:14, alignItems:"flex-start", marginBottom:16 }}>
              <div style={{ fontSize:44, lineHeight:1 }}>{item.avatar}</div>
              <div>
                <div style={{ fontSize:10, color:"#a08050", letterSpacing:1.5, marginBottom:4, textTransform:"uppercase" }}>{item.role} · {item.dynasty}</div>
                <h2 style={{ fontFamily:"Cormorant Garamond,serif", fontSize:22, fontWeight:700, color:"#f0e8d0" }}>{item.name}</h2>
                <div style={{ fontSize:12, color:"#7a6a5a", marginTop:4 }}>{yl(item.birthYear)} – {yl(item.deathYear)}</div>
              </div>
            </div>
          ) : (
            <>
              <div style={{ fontSize:10, color:"#a08050", letterSpacing:1.5, marginBottom:6, textTransform:"uppercase" }}>{yl(item.year)}</div>
              <h2 style={{ fontFamily:"Cormorant Garamond,serif", fontSize:22, fontWeight:700, color:"#f0e8d0", marginBottom:12 }}>{item.title}</h2>
            </>
          )}
          <p style={{ fontSize:14, color:"#c4bba8", lineHeight:1.8, marginBottom:16 }}>{item.desc}</p>
          {item.tags?.length > 0 && (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:20 }}>
              {item.tags.map(t => <span key={t} style={{ fontSize:11, padding:"3px 10px", borderRadius:20, background:"rgba(255,255,255,.07)", color:"#c0a870", border:"1px solid rgba(255,255,255,.06)" }}>{t}</span>)}
            </div>
          )}
          <button onClick={onClose} style={{ padding:"9px 22px", background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.14)", borderRadius:8, color:"#d0c8b8", cursor:"pointer", fontSize:13 }}>Đóng ✕</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ LOGIN ═══════════════ */
function LoginPopup({ onSuccess, onClose }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err,  setErr]  = useState("");
  const IS = { width:"100%", background:"#241e18", border:"1px solid rgba(255,255,255,.12)", borderRadius:8, color:"#e0d8c8", padding:"10px 14px", fontSize:14 };
  const login = () => (user === "admin" && pass === "vietnam2024") ? onSuccess() : setErr("Sai tên đăng nhập hoặc mật khẩu.");
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.85)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9500, padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#181410", border:"1px solid rgba(255,255,255,.1)", borderRadius:16, maxWidth:380, width:"100%", padding:32, animation:"fadeUp .3s" }}>
        <h2 style={{ fontFamily:"Cormorant Garamond,serif", fontSize:22, color:"#f0e8d0", marginBottom:6 }}>Đăng nhập Quản trị</h2>
        <p style={{ fontSize:12, color:"#7a6a5a", marginBottom:24 }}>Xác thực để truy cập trang quản trị dữ liệu.</p>
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:10, color:"#a09880", marginBottom:5, letterSpacing:.5 }}>TÊN ĐĂNG NHẬP</label>
          <input value={user} onChange={e => setUser(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} style={IS} placeholder="admin" />
        </div>
        <div style={{ marginBottom:20 }}>
          <label style={{ display:"block", fontSize:10, color:"#a09880", marginBottom:5, letterSpacing:.5 }}>MẬT KHẨU</label>
          <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && login()} style={IS} placeholder="••••••••" />
        </div>
        {err && <div style={{ fontSize:12, color:"#d07060", marginBottom:14, padding:"8px 12px", background:"rgba(208,96,80,.1)", borderRadius:6 }}>{err}</div>}
        <p style={{ fontSize:10, color:"#5a4a3a", marginBottom:16 }}>Tài khoản thử: admin / vietnam2024</p>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={login} style={{ flex:1, padding:10, background:"#3a5c42", border:"none", borderRadius:8, color:"#90d0a0", cursor:"pointer", fontSize:14, fontWeight:600 }}>Đăng nhập</button>
          <button onClick={onClose} style={{ padding:"10px 16px", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.1)", borderRadius:8, color:"#9a8a7a", cursor:"pointer", fontSize:14 }}>Hủy</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════ ADMIN ═══════════════ */
function AdminPanel({ periods, eventsVN, characters, onClose }) {
  const [tab, setTab] = useState("events");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ periodId:"phongKien", phaseId:"", year:1000, title:"", desc:"", tags:"", img:"", icon:"📌" });
  const phases = periods.find(p => p.id === form.periodId)?.phases || [];
  const IS = { width:"100%", background:"#2a2520", border:"1px solid rgba(255,255,255,.1)", borderRadius:7, color:"#e0d8c8", padding:"8px 10px", fontSize:13 };

  const inp = (label, key, type = "text", opts = null) => (
    <div style={{ marginBottom:12 }}>
      <label style={{ display:"block", fontSize:10, color:"#a09880", marginBottom:4, letterSpacing:.5 }}>{label}</label>
      {type === "textarea" ? <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={3} style={IS} /> :
       opts ? <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={IS}>{opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}</select> :
       <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={IS} />}
    </div>
  );

  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.87)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9000, padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:"#181410", borderRadius:16, maxWidth:640, width:"100%", maxHeight:"90vh", overflowY:"auto", border:"1px solid rgba(255,255,255,.1)" }}>
        <div style={{ padding:"18px 24px", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h3 style={{ fontFamily:"Cormorant Garamond,serif", fontSize:18, color:"#f0e8d0" }}>⚙ Quản trị dữ liệu</h3>
          <button onClick={onClose} style={{ background:"none", border:"none", color:"#a09880", cursor:"pointer", fontSize:20 }}>✕</button>
        </div>
        <div style={{ display:"flex", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
          {[["events","Sự Kiện"], ["characters","Nhân Vật"]].map(([id, l]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding:"10px 20px", border:"none", background: tab === id ? "rgba(255,255,255,.05)" : "transparent", color: tab === id ? "#f0e8d0" : "#706050", cursor:"pointer", fontSize:13 }}>{l}</button>
          ))}
        </div>
        <div style={{ padding:24 }}>
          <div style={{ background:"#1a1f16", border:"1px solid #2a3a20", borderRadius:10, padding:"12px 16px", marginBottom:20, fontSize:12, color:"#809070", lineHeight:1.7 }}>
            💡 <strong style={{ color:"#a0c080" }}>Lưu ý:</strong> Dữ liệu được lưu trong file JSON tại <code style={{ color:"#80c0a0" }}>public/data/</code>. Để thêm dữ liệu thực tế, mở file JSON tương ứng và chỉnh sửa trực tiếp. Form bên dưới dùng để xem trước.
          </div>
          <button onClick={() => setShowForm(v => !v)} style={{ padding:"8px 16px", background:"#2d4a35", border:"1px solid #3a6040", borderRadius:7, color:"#80c090", cursor:"pointer", fontSize:13, marginBottom:16 }}>
            + Xem form thêm {tab === "events" ? "sự kiện" : "nhân vật"}
          </button>
          {showForm && tab === "events" && (
            <div style={{ background:"#1e1a14", borderRadius:10, padding:18, marginBottom:16, border:"1px solid rgba(255,255,255,.05)" }}>
              {inp("TIÊU ĐỀ *", "title")}
              {inp("THỜI KỲ", "periodId", "text", periods.map(p => ({ v: p.id, l: p.label })))}
              {inp("GIAI ĐOẠN", "phaseId", "text", [{ v:"", l:"— Chọn giai đoạn —" }, ...phases.map(p => ({ v: p.id, l: p.label }))])}
              {inp("NĂM * (số âm = TCN)", "year", "number")}
              {inp("BIỂU TƯỢNG (emoji)", "icon")}
              {inp("MÔ TẢ *", "desc", "textarea")}
              {inp("TAGS (phân cách dấu phẩy)", "tags")}
              {inp("URL HÌNH ẢNH", "img")}
              <div style={{ padding:"10px 14px", background:"#252015", borderRadius:7, fontSize:12, color:"#908060" }}>
                📋 Copy JSON này vào <code>public/data/events_vn.json</code> để lưu thực tế.
              </div>
            </div>
          )}
          <div style={{ fontSize:10, color:"#7a6a5a", marginBottom:10, letterSpacing:.5 }}>
            HIỆN CÓ: {(tab === "events" ? eventsVN : characters).length} MỤC
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {(tab === "events" ? eventsVN : characters).map(item => (
              <div key={item.id} style={{ display:"flex", gap:10, alignItems:"center", background:"#1e1a14", borderRadius:8, padding:"10px 14px", border:"1px solid rgba(255,255,255,.04)" }}>
                <span style={{ fontSize:20 }}>{item.icon || item.avatar}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, color:"#e0d8c8" }}>{item.title || item.name}</div>
                  <div style={{ fontSize:10, color:"#7a6050" }}>{yl(item.year ?? item.birthYear)} · {periods.find(p => p.id === item.periodId)?.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   HOME PAGE — BOOK SPINE (tab mở rộng ra giữa)
═══════════════════════════════════════════ */
function HomePage({ periods }) {
  const [selected, setSelected] = useState(null);
  const selIdx  = periods.findIndex(p => p.id === selected);
  const period  = periods.find(p => p.id === selected);

  // Số tab thu nhỏ mỗi bên
  const leftCount  = selIdx >= 0 ? selIdx : 0;
  const rightCount = selIdx >= 0 ? periods.length - selIdx - 1 : 0;

  return (
    <div style={{ display:"flex", height:"calc(100vh - 56px)", overflow:"hidden", background:"#0c0a07" }}>
      {periods.map((p, i) => {
        const isSel   = selected === p.id;
        const hasSel  = selected !== null;
        const isLeft  = hasSel && i < selIdx;
        const isRight = hasSel && i > selIdx;

        /* ── EXPANDED tab ── */
        if (isSel) return (
          <div key={p.id} style={{
            flex: "1 1 0", minWidth: 0,
            position: "relative", overflow: "hidden",
            transition: "flex .55s cubic-bezier(.4,0,.2,1)",
            background: "#000",
          }}>
            {/* Video */}
            <iframe
              src={`https://www.youtube.com/embed/${p.videoId}?autoplay=0&rel=0&modestbranding=1`}
              title={p.label} frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ position:"absolute", inset:0, width:"100%", height:"100%" }}
            />
            {/* Info overlay */}
            <div style={{ position:"absolute", bottom:0, left:0, right:0, padding:"48px 28px 24px", background:"linear-gradient(transparent,rgba(0,0,0,.88))", pointerEvents:"none" }}>
              <div style={{ fontSize:10, color:p.color, letterSpacing:3, marginBottom:6, textTransform:"uppercase" }}>{p.years}</div>
              <div style={{ fontFamily:"Cormorant Garamond,serif", fontSize:24, fontWeight:700, color:"#f5eacc" }}>{p.label}</div>
              <p style={{ fontSize:13, color:"#b0a080", marginTop:8, lineHeight:1.65, maxWidth:520 }}>{p.intro}</p>
            </div>
            {/* Close button */}
            <button onClick={() => setSelected(null)} style={{
              position:"absolute", top:14, right:14,
              background:"rgba(0,0,0,.6)", border:"1px solid rgba(255,255,255,.2)",
              borderRadius:8, color:"#d0c8b8", cursor:"pointer",
              padding:"6px 12px", fontSize:12, zIndex:10,
            }}>✕ Đóng</button>
          </div>
        );

        /* ── COLLAPSED tab (gáy sách) ── */
        const COLLAPSED_W = hasSel ? 48 : 80;
        return (
          <div key={p.id}
            onClick={() => setSelected(p.id)}
            style={{
              width: COLLAPSED_W,
              flexShrink: 0,
              position: "relative", overflow: "hidden",
              transition: "width .55s cubic-bezier(.4,0,.2,1), opacity .3s",
              cursor: "pointer",
              backgroundImage: p.bgImg ? `url(${p.bgImg})` : "none",
              backgroundSize: "cover", backgroundPosition: "center",
              borderLeft: i > 0 ? "1px solid rgba(255,255,255,.06)" : "none",
              opacity: hasSel ? 0.72 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.width = hasSel ? "60px" : "100px"; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = hasSel ? "0.72" : "1"; e.currentTarget.style.width = COLLAPSED_W + "px"; }}
          >
            {/* Dark overlay */}
            <div style={{ position:"absolute", inset:0, background:"rgba(0,0,0,.52)" }} />
            {/* Spine content */}
            <div style={{ position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"20px 0", zIndex:1 }}>
              <div style={{ width:2, height:24, background:p.color, borderRadius:1, marginBottom:12, opacity:.9 }} />
              <div style={{
                writingMode:"vertical-rl", textOrientation:"mixed", transform:"rotate(180deg)",
                fontFamily:"Cormorant Garamond,serif", fontSize: hasSel ? 11 : 13, fontWeight:700,
                color:p.color, letterSpacing:3, whiteSpace:"nowrap", lineHeight:1,
              }}>{p.label}</div>
              {!hasSel && (
                <div style={{
                  writingMode:"vertical-rl", transform:"rotate(180deg)",
                  fontSize:8, color:"rgba(255,255,255,.3)", marginTop:8, letterSpacing:1, whiteSpace:"nowrap",
                }}>{p.years}</div>
              )}
              <div style={{ width:2, height:24, background:p.color, borderRadius:1, marginTop:12, opacity:.35 }} />
            </div>
          </div>
        );
      })}

      {/* Trang sách — hiển thị khi chưa chọn */}
      {selected === null && (
        <div style={{
          flex:"0 0 380px", position:"relative", overflow:"hidden",
          borderLeft:"1px solid rgba(255,255,255,.06)",
          background:"#16120e",
          animation:"fadeIn .5s ease",
        }}>
          {/* Page texture */}
          <div style={{ position:"absolute", inset:0, opacity:.04,
            backgroundImage:"repeating-linear-gradient(transparent,transparent 27px,rgba(200,180,140,1) 27px,rgba(200,180,140,1) 28px)",
            backgroundPosition:"0 50px" }} />
          <div style={{ position:"relative", zIndex:1, padding:"48px 40px", height:"100%", display:"flex", flexDirection:"column", justifyContent:"center" }}>
            <div style={{ fontSize:10, color:"#c0a060", letterSpacing:4, marginBottom:18, textTransform:"uppercase" }}>Lịch Sử Việt Nam</div>
            <h1 style={{ fontFamily:"Cormorant Garamond,serif", fontSize:34, fontWeight:700, color:"#f5eacc", lineHeight:1.25, marginBottom:20 }}>
              Hành trình<br/>nghìn năm<br/>dựng nước
            </h1>
            <div style={{ width:40, height:2, background:"#c0a060", marginBottom:20, opacity:.7 }} />
            <p style={{ fontSize:14, color:"#b0a080", lineHeight:1.85, marginBottom:24 }}>
              Từ buổi bình minh của dân tộc Việt đến Việt Nam hội nhập thế kỷ XXI — hành trình hàng nghìn năm dựng nước và giữ nước, bất khuất trước mọi thế lực xâm lăng.
            </p>
            <p style={{ fontSize:12, color:"#6a5a3a", lineHeight:1.7 }}>
              Chọn một gáy sách bên trái để khám phá từng thời kỳ lịch sử.
            </p>
            <div style={{ marginTop:28, display:"flex", alignItems:"center", gap:8, fontSize:12, color:"#5a4a2a" }}>
              <span>← Chọn thời kỳ</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   SMART SLOT MAPPER
   - Mỗi sự kiện chiếm 1 slot cách đều SLOT_W px (không phụ thuộc năm)
   - Nhãn năm thực vẫn hiển thị trên trục → người dùng thấy đúng thứ tự
   - World events dùng tọa độ nội suy tuyến tính giữa 2 slot VN gần nhất
   - Giải quyết vấn đề phân bố năm cực kỳ không đều (Tiền Sử -1,000,000
     đến -179 → canvas sẽ rộng hàng triệu px nếu dùng tỉ lệ năm)
══════════════════════════════════════════════════════════════════ */
const SLOT_W    = 160;   // px giữa 2 slot liên tiếp
const PAD_X     = 80;    // padding trái/phải
const CARD_W    = 136;
const CARD_W_WD = 118;

/**
 * Xây dựng bảng ánh xạ year → pixelX dựa trên thứ tự index sự kiện VN.
 * @param {number[]} vnYears  - mảng năm VN đã sort (có thể trùng)
 * @param {number[]} wdYears  - mảng năm world events đã sort
 * @returns {{ vnPx, wdPx, canvasW }}
 */
function buildSlotMap(vnYears, wdYears) {
  // ── VN slots: mỗi năm duy nhất = 1 slot, cách đều SLOT_W ──
  const slotCenters = vnYears.map((_, i) => PAD_X + i * SLOT_W + SLOT_W / 2);
  const yearSlots = new Map();
  vnYears.forEach((year, i) => {
    if (!yearSlots.has(year)) yearSlots.set(year, []);
    yearSlots.get(year).push(slotCenters[i]);
  });

  const uniqueVnYears = [...yearSlots.keys()].sort((a, b) => a - b);
  const yearCenter = {};
  uniqueVnYears.forEach(year => {
    const xs = yearSlots.get(year);
    yearCenter[year] = (xs[0] + xs[xs.length - 1]) / 2;
  });

  const canvasW = PAD_X * 2 + Math.max(vnYears.length, 5) * SLOT_W;

  // Hàm lấy X cho sự kiện VN
  const vnPx = (year, slotIndex = null) => {
    if (slotIndex != null && slotCenters[slotIndex] != null) return slotCenters[slotIndex];
    return yearCenter[year] ?? PAD_X + SLOT_W / 2;
  };

  // ── World events: nội suy tuyến tính giữa 2 slot VN gần nhất ──
  // Nếu wdYear nằm ngoài dải VN → clamp về đầu/cuối
  const wdPx = year => {
    if (!uniqueVnYears.length) return canvasW / 2;
    if (year <= uniqueVnYears[0]) return yearCenter[uniqueVnYears[0]];
    if (year >= uniqueVnYears[uniqueVnYears.length - 1])
      return yearCenter[uniqueVnYears[uniqueVnYears.length - 1]];
    // Tìm 2 slot VN bao quanh
    let lo = 0;
    for (let i = 0; i < uniqueVnYears.length - 1; i++) {
      if (uniqueVnYears[i] <= year && year <= uniqueVnYears[i + 1]) { lo = i; break; }
    }
    const y0 = uniqueVnYears[lo], y1 = uniqueVnYears[lo + 1];
    const x0 = yearCenter[y0],   x1 = yearCenter[y1];
    const t = (year - y0) / (y1 - y0);
    return x0 + t * (x1 - x0);
  };

  return { vnPx, wdPx, canvasW };
}

/* ══════════════════════════════════════════════════════════════════
   EVENTS PAGE
══════════════════════════════════════════════════════════════════ */
// Layout dọc:
//   VN hàng 0 (xa nhất, top):  top = VN0_TOP
//   VN hàng 1 (gần trục):      top = VN1_TOP
//   TRỤC:                       top = AXIS_TOP
//   World hàng 0:               top = WD0_TOP
//   World hàng 1 (nếu có):      top = WD1_TOP
const VN_CARD_H  = 120;
const VN_GAP     = 10;    // gap giữa đáy thẻ và trục
const VN0_MARGIN = 12;    // margin trên của hàng 0
const AXIS_H_PX  = 40;    // chiều cao dải trục
const WD_CARD_H  = 90;
const WD_GAP     = 10;

// Phân công hàng VN: ưu tiên hàng 1 (gần trục), nếu đụng nhau mới đẩy lên hàng 0
function assignVNRows(items, yPx) {
  // Dùng 2 hàng: row=0 (xa, cao hơn), row=1 (gần trục, thấp hơn)
  // Sự kiện chẵn → hàng 1, lẻ → hàng 0, nhưng nếu xung đột thì hoán đổi
  const placed = []; // [{x, row}]
  return items.map((ev, i) => {
    const x = yPx(ev.year, i);
    for (let row = 1; row >= 0; row--) { // ưu tiên row 1 trước
      if (!placed.some(p => p.row === row && Math.abs(p.x - x) < CARD_W + 8)) {
        placed.push({ x, row });
        return row;
      }
    }
    // fallback: hàng 0 dù chồng (hiếm)
    placed.push({ x, row: 0 });
    return 0;
  });
}

function assignWDRows(items, yPx) {
  const placed = [];
  return items.map((ev) => {
    const x = yPx(ev.year);
    for (let row = 0; row < 4; row++) {
      if (!placed.some(p => p.row === row && Math.abs(p.x - x) < CARD_W_WD + 8)) {
        placed.push({ x, row });
        return row;
      }
    }
    placed.push({ x, row: 0 });
    return 0;
  });
}

function EventsPage({ periods, eventsVN, eventsWorld }) {
  const [activePeriodId, setActivePeriodId] = useState(() => periods[0]?.id || "");
  const [activePhaseId,  setActivePhaseId]  = useState(null);
  const [popup,  setPopup]  = useState(null);
  const [search, setSearch] = useState("");
  const tlRef = useRef(null);

  // ── drag scroll (cả ngang lẫn dọc) ──
  const dragging  = useRef(false);
  const didDrag   = useRef(false);   // phân biệt drag vs click
  const dragStart = useRef({ x: 0, y: 0, sl: 0, st: 0 });
  const onMouseDown = useCallback(e => {
    dragging.current = true;
    didDrag.current  = false;
    dragStart.current = { x: e.clientX, y: e.clientY, sl: tlRef.current?.scrollLeft || 0, st: tlRef.current?.scrollTop || 0 };
    e.preventDefault();
  }, []);
  useEffect(() => {
    const mv = e => {
      if (!dragging.current || !tlRef.current) return;
      const dx = dragStart.current.x - e.clientX;
      const dy = dragStart.current.y - e.clientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      tlRef.current.scrollLeft = dragStart.current.sl + dx;
      tlRef.current.scrollTop  = dragStart.current.st + dy;
    };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  useEffect(() => {
    if (periods.length && !periods.find(p => p.id === activePeriodId))
      setActivePeriodId(periods[0].id);
  }, [periods]);

  const period  = periods.find(p => p.id === activePeriodId) || periods[0];
  if (!period) return null;
  const phases = period.phases || [];

  const vnFiltered = eventsVN.filter(e =>
    e.periodId === activePeriodId &&
    (!activePhaseId || e.phaseId === activePhaseId) &&
    (!search || e.title.toLowerCase().includes(search.toLowerCase()) || (e.desc||"").toLowerCase().includes(search.toLowerCase()))
  ).sort((a, b) => a.year - b.year);

  const wdFiltered = eventsWorld
    .filter(e => e.year >= period.startYear && e.year <= period.endYear)
    .sort((a, b) => a.year - b.year);

  // ── slot map ──
  const { vnPx, wdPx, canvasW } = buildSlotMap(
    vnFiltered.map(e => e.year),
    wdFiltered.map(e => e.year)
  );

  const vnYearGroups = [];
  vnFiltered.forEach((ev, i) => {
    const last = vnYearGroups[vnYearGroups.length - 1];
    if (last && last.year === ev.year) {
      last.end = i;
      last.count += 1;
    } else {
      vnYearGroups.push({ year: ev.year, start: i, end: i, count: 1 });
    }
  });
  const groupedSlotIndexes = new Set(
    vnYearGroups
      .filter(group => group.count > 1)
      .flatMap(group => Array.from({ length: group.count }, (_, offset) => group.start + offset))
  );

  // ── row assignments ──
  const vnRows   = assignVNRows(vnFiltered, vnPx);
  const wdRows   = assignWDRows(wdFiltered, wdPx);
  const maxWDRow = wdFiltered.length ? Math.max(...wdRows) : -1;

  // ── vertical geometry (không scroll dọc) ──
  const AXIS_TOP = VN0_MARGIN + VN_CARD_H + VN_GAP + VN_CARD_H + VN_GAP;
  const WD0_TOP  = AXIS_TOP + AXIS_H_PX + WD_GAP;
  const canvasH  = WD0_TOP + (maxWDRow + 1) * (WD_CARD_H + WD_GAP) + 16;

  // Top của hàng VN theo row
  const vnTop = row => row === 0 ? VN0_MARGIN : VN0_MARGIN + VN_CARD_H + VN_GAP;

  return (
    <div style={{ height:"calc(100vh - 56px)", background:"#0c0a07", display:"flex", flexDirection:"column" }}>

      {/* Period tabs */}
      <div style={{ display:"flex", overflowX:"auto", background:"#0f0d09", borderBottom:"1px solid rgba(255,255,255,.05)", flexShrink:0 }}>
        {periods.map(p => (
          <button key={p.id} onClick={() => { setActivePeriodId(p.id); setActivePhaseId(null); }} style={{
            padding:"11px 18px", border:"none", cursor:"pointer", fontSize:13,
            fontFamily:"Crimson Pro,serif", fontWeight:600,
            borderBottom: activePeriodId === p.id ? `3px solid ${p.color}` : "3px solid transparent",
            background: activePeriodId === p.id ? "rgba(255,255,255,.04)" : "transparent",
            color: activePeriodId === p.id ? "#f0e8d0" : "#706050",
            whiteSpace:"nowrap", transition:"all .2s",
          }}>{p.label}</button>
        ))}
        <div style={{ flex:1 }} />
        <div style={{ display:"flex", alignItems:"center", padding:"0 16px" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Tìm sự kiện…"
            style={{ padding:"6px 12px", background:"#1a1714", border:"1px solid rgba(255,255,255,.1)", borderRadius:7, color:"#d0c8b8", fontSize:12, width:180 }} />
        </div>
      </div>

      {/* Phase pills */}
      {phases.length > 0 && (
        <div style={{ display:"flex", gap:6, padding:"8px 20px", background:"#0c0a07", overflowX:"auto", borderBottom:"1px solid rgba(255,255,255,.04)", flexShrink:0 }}>
          <button onClick={() => setActivePhaseId(null)} style={pill(!activePhaseId, period.color)}>Tất cả</button>
          {phases.map(ph => (
            <button key={ph.id} onClick={() => setActivePhaseId(ph.id)} style={pill(activePhaseId === ph.id, period.color)}>{ph.label}</button>
          ))}
        </div>
      )}

      {/* Legend row */}
      {/*
        <div style={{ display:"flex", alignItems:"center", padding:"3px 24px", background:"#09080604", flexShrink:0, gap:24, borderBottom:"1px solid rgba(255,255,255,.03)" }}>
        <span style={{ fontSize:9, color:"#807060", letterSpacing:1.5 }}>▲ VIỆT NAM</span>
        <span style={{ fontSize:9, color:"#507090", letterSpacing:1.5 }}>▼ THẾ GIỚI</span>
        <span style={{ marginLeft:"auto", fontSize:9, color:"#4a3a2a" }}>Kéo để cuộn (ngang + dọc) · Click để xem chi tiết</span>
      </div>
      */}

      {/* ── CANVAS ── */}
      <div style={{ position:"relative", flex:1, overflow:"hidden" }}>
        <div ref={tlRef} onMouseDown={onMouseDown}
          style={{ overflowX:"auto", overflowY:"hidden", cursor:"grab", userSelect:"none", height:"100%", width:"100%" }}>
          <div style={{ width:canvasW, height:canvasH, position:"relative" }}>

            {/* ── VN EVENTS ── */}
            {vnFiltered.map((ev, i) => {
              const cx  = vnPx(ev.year, i);
              const row = vnRows[i];
              const ct  = vnTop(row);
              const lineTop = ct + VN_CARD_H;
              const lineH   = AXIS_TOP - lineTop;

              return (
                <React.Fragment key={ev.id}>
                  {/* Connector xuống trục */}
                  <div style={{
                    position:"absolute", left:cx - 1, top:lineTop,
                    width:2, height:Math.max(lineH, 0),
                    background:`linear-gradient(to bottom,${period.color}aa,${period.color}33)`,
                    pointerEvents:"none", zIndex:2,
                  }} />
                  {/* Dot trên trục */}
                  <div style={{
                    position:"absolute",
                    left:cx - 5, top:AXIS_TOP + AXIS_H_PX / 2 - 5,
                    width:10, height:10, borderRadius:"50%",
                    background:period.color, border:`2px solid #0c0a07`,
                    zIndex:6, pointerEvents:"none",
                  }} />
                  {/* Thẻ */}
                  <div onClick={() => { if (!didDrag.current) setPopup(ev); }} style={{
                    position:"absolute",
                    left:cx - CARD_W / 2, top:ct,
                    width:CARD_W,
                    background:period.bg, border:`1px solid ${period.color}70`,
                    borderRadius:10, overflow:"hidden", cursor:"pointer",
                    boxShadow:"0 3px 16px rgba(0,0,0,.55)",
                    zIndex:3, transition:"transform .15s, box-shadow .15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform="scale(1.05)"; e.currentTarget.style.boxShadow=`0 6px 24px rgba(0,0,0,.7),0 0 16px ${period.color}40`; e.currentTarget.style.zIndex="8"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.boxShadow="0 3px 16px rgba(0,0,0,.55)"; e.currentTarget.style.zIndex="3"; }}
                  >
                    {ev.img && <img src={ev.img} alt="" style={{ width:"100%", height:52, objectFit:"cover", display:"block" }} onError={e => e.target.style.display="none"} />}
                    <div style={{ padding: ev.img ? "6px 8px 8px" : "10px 8px 8px", textAlign:"center" }}>
                      <div style={{ fontSize:20, lineHeight:1, marginBottom:4 }}>{ev.icon}</div>
                      <div style={{ fontSize:11, fontWeight:700, color:"#f0e8d0", lineHeight:1.3,
                        overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize:9, color:period.color, marginTop:5, fontWeight:600 }}>{yl(ev.year)}</div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {vnFiltered.length === 0 && (
              <div style={{ position:"absolute", top:AXIS_TOP / 2, left:"50%",
                transform:"translate(-50%,-50%)", color:"#5a4a3a", fontSize:13, whiteSpace:"nowrap" }}>
                Không có sự kiện trong thời kỳ / giai đoạn này
              </div>
            )}

            {/* ── TRỤC ── */}
            {/* Background dải */}
            <div style={{ position:"absolute", left:0, top:AXIS_TOP, width:canvasW, height:AXIS_H_PX,
              background:"linear-gradient(to bottom,rgba(0,0,0,0),rgba(255,255,255,.02) 50%,rgba(0,0,0,0))",
              zIndex:4 }} />
            {/* Line ngang */}
            <div style={{ position:"absolute", left:PAD_X - 20, top:AXIS_TOP + AXIS_H_PX / 2 - 1,
              width:canvasW - (PAD_X - 20) * 2, height:2,
              background:`linear-gradient(to right,transparent,${period.color}90 3%,${period.color}90 97%,transparent)`,
              zIndex:5 }} />
            {/* Tick + nhãn năm — tại vị trí slot VN */}
            {vnFiltered.map((ev, i) => {
              const x = vnPx(ev.year, i);
              return (
                <React.Fragment key={`tick-${ev.id}`}>
                  <div style={{ position:"absolute", left:x - 1, top:AXIS_TOP + AXIS_H_PX / 2 - 10,
                    width:1, height:20, background:`${period.color}60`, zIndex:5, pointerEvents:"none" }} />
                  {!groupedSlotIndexes.has(i) && (
                    <div style={{ position:"absolute", left:x, top:AXIS_TOP + AXIS_H_PX / 2 + 12,
                      transform:"translateX(-50%)", fontSize:9, color:period.color,
                      fontWeight:600, letterSpacing:.3, whiteSpace:"nowrap", zIndex:5, pointerEvents:"none" }}>
                      {yl(ev.year)}
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {vnYearGroups.filter(group => group.count > 1).map(group => {
              const x1 = vnPx(group.year, group.start);
              const x2 = vnPx(group.year, group.end);
              const bracketTop = AXIS_TOP + AXIS_H_PX / 2 + 13;
              const labelX = (x1 + x2) / 2;
              return (
                <React.Fragment key={`year-group-${group.year}-${group.start}`}>
                  <div style={{
                    position:"absolute", left:x1, top:bracketTop,
                    width:x2 - x1, height:9,
                    borderBottom:`1px solid ${period.color}aa`,
                    borderLeft:`1px solid ${period.color}aa`,
                    borderRight:`1px solid ${period.color}aa`,
                    zIndex:6, pointerEvents:"none",
                  }} />
                  <div style={{
                    position:"absolute", left:labelX, top:bracketTop + 10,
                    transform:"translateX(-50%)",
                    fontSize:10, color:"#f0e8d0", fontWeight:700,
                    letterSpacing:.5, whiteSpace:"nowrap",
                    background:"#0c0a07", border:`1px solid ${period.color}55`,
                    borderRadius:4, padding:"1px 8px",
                    zIndex:7, pointerEvents:"none",
                  }}>
                    {yl(group.year)}
                  </div>
                </React.Fragment>
              );
            })}
            {/* Nhãn thời kỳ giữa trục */}
            <div style={{ position:"absolute", left:"50%", top:AXIS_TOP + 2, transform:"translateX(-50%)",
              fontSize:9, color:period.color, letterSpacing:2.5, fontWeight:700, whiteSpace:"nowrap",
              background:period.bg + "dd", padding:"1px 10px", borderRadius:4, zIndex:7, pointerEvents:"none" }}>
              {period.label.toUpperCase()} · {period.years}
            </div>

            {/* ── WORLD EVENTS ── */}
            {wdFiltered.map((ev, i) => {
              const cx  = wdPx(ev.year);
              const row = wdRows[i];
              const ct  = WD0_TOP + row * (WD_CARD_H + WD_GAP);
              const lineH = ct - (AXIS_TOP + AXIS_H_PX);

              return (
                <React.Fragment key={ev.id}>
                  {/* Connector từ trục xuống thẻ */}
                  <div style={{ position:"absolute", left:cx - 1, top:AXIS_TOP + AXIS_H_PX,
                    width:2, height:Math.max(lineH, 0),
                    background:"linear-gradient(to bottom,#507090aa,#30507040)",
                    pointerEvents:"none", zIndex:2 }} />
                  {/* Dot nhỏ trên trục */}
                  <div style={{ position:"absolute", left:cx - 4, top:AXIS_TOP + AXIS_H_PX / 2 - 4,
                    width:8, height:8, borderRadius:"50%",
                    background:"#4878a0", border:"2px solid #0c0a07", zIndex:5, pointerEvents:"none" }} />
                  {/* Thẻ */}
                  <div onClick={() => { if (!didDrag.current) setPopup(ev); }} style={{
                    position:"absolute", left:cx - CARD_W_WD / 2, top:ct,
                    width:CARD_W_WD,
                    background:"#0d1820", border:"1px solid #253545",
                    borderRadius:8, overflow:"hidden", cursor:"pointer",
                    boxShadow:"0 2px 12px rgba(0,0,0,.5)", zIndex:3,
                    transition:"transform .15s, box-shadow .15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform="scale(1.05)"; e.currentTarget.style.zIndex="8"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.zIndex="3"; }}
                  >
                    {ev.img && <img src={ev.img} alt="" style={{ width:"100%", height:36, objectFit:"cover", display:"block" }} onError={e => e.target.style.display="none"} />}
                    <div style={{ padding:"5px 7px 7px", textAlign:"center" }}>
                      <div style={{ fontSize:10, fontWeight:700, color:"#78a8c8", lineHeight:1.3,
                        overflow:"hidden", display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>
                        {ev.title}
                      </div>
                      <div style={{ fontSize:8, color:"#406070", marginTop:3 }}>{yl(ev.year)}</div>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

          </div>{/* canvas */}
        </div>{/* scroll container */}

        {/* Nav buttons */}
        <button onClick={() => tlRef.current && (tlRef.current.scrollLeft -= 320)} style={navBtn("left")}>‹</button>
        <button onClick={() => tlRef.current && (tlRef.current.scrollLeft += 320)} style={navBtn("right")}>›</button>
      </div>

      <div style={{ padding:"4px 20px", background:"#080706", fontSize:10, color:"#5a4a3a", flexShrink:0, display:"flex", gap:20 }}>
        <span>{vnFiltered.length} sự kiện Việt Nam</span>
        <span>{wdFiltered.length} sự kiện thế giới</span>
      </div>
      <Popup item={popup} onClose={() => setPopup(null)} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CHARACTERS PAGE — cùng logic smart year map
══════════════════════════════════════════════════════════════════ */
const CHAR_W  = 110;
const CHAR_H  = 105;
const CH_GAP  = 10;

function CharactersPage({ periods, characters }) {
  const [activePeriodId, setActivePeriodId] = useState(() => periods[0]?.id || "");
  const [popup,       setPopup]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [highlightId, setHighlightId] = useState(null);
  const tlRef   = useRef(null);
  const dropRef = useRef(null);

  // drag scroll ngang + dọc
  const dragging  = useRef(false);
  const didDrag   = useRef(false);
  const dragStart = useRef({ x:0, y:0, sl:0, st:0 });
  const onMouseDown = useCallback(e => {
    dragging.current = true;
    didDrag.current  = false;
    dragStart.current = { x:e.clientX, y:e.clientY, sl:tlRef.current?.scrollLeft||0, st:tlRef.current?.scrollTop||0 };
    e.preventDefault();
  }, []);
  useEffect(() => {
    const mv = e => {
      if (!dragging.current || !tlRef.current) return;
      const dx = dragStart.current.x - e.clientX;
      const dy = dragStart.current.y - e.clientY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true;
      tlRef.current.scrollLeft = dragStart.current.sl + dx;
      tlRef.current.scrollTop  = dragStart.current.st + dy;
    };
    const up = () => { dragging.current = false; };
    window.addEventListener("mousemove", mv);
    window.addEventListener("mouseup", up);
    return () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
  }, []);

  useEffect(() => {
    if (periods.length && !periods.find(p => p.id === activePeriodId))
      setActivePeriodId(periods[0].id);
  }, [periods]);

  const period = periods.find(p => p.id === activePeriodId) || periods[0];
  if (!period) return null;

  const chars = characters
    .filter(c => c.periodId === activePeriodId)
    .sort((a, b) => a.birthYear - b.birthYear);

  const { vnPx: cPx, canvasW } = buildSlotMap(
    chars.map(c => c.birthYear), []
  );

  // Phân hàng nhân vật: trên (row=0) / dưới (row=1) xen kẽ, tránh chồng
  const charLayouts = (() => {
    const placed = [];
    return chars.map((c, i) => {
      const x = cPx(c.birthYear, i);
      for (let r = 0; r < 8; r++) {
        const side  = r % 2;       // 0=trên, 1=dưới
        const depth = Math.floor(r / 2);
        if (!placed.some(p => p.side===side && p.depth===depth && Math.abs(p.x-x) < CHAR_W+10)) {
          placed.push({ x, side, depth });
          return { side, depth };
        }
      }
      return { side:0, depth:0 };
    });
  })();

  const maxTopDepth = Math.max(0, ...charLayouts.filter(l=>l.side===0).map(l=>l.depth));
  const maxBotDepth = Math.max(0, ...charLayouts.filter(l=>l.side===1).map(l=>l.depth));

  const CH_ROW_H = CHAR_H + CH_GAP;
  const AXIS_TOP_C = 12 + (maxTopDepth + 1) * CH_ROW_H + CH_GAP;
  const AXIS_H_C   = 40;
  const BOT_TOP    = AXIS_TOP_C + AXIS_H_C + CH_GAP;
  const canvasH    = BOT_TOP + (maxBotDepth + 1) * CH_ROW_H + 20;

  // Search
  const searchResults = search.length > 1
    ? characters.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.role||"").toLowerCase().includes(search.toLowerCase()))
    : [];

  function jumpTo(char) {
    setActivePeriodId(char.periodId);
    setSearch("");
    setHighlightId(char.id);
    setTimeout(() => {
      if (!tlRef.current) return;
      const chars2 = characters.filter(c=>c.periodId===char.periodId).sort((a,b)=>a.birthYear-b.birthYear);
      const { vnPx: cPx2 } = buildSlotMap(chars2.map(c=>c.birthYear), []);
      const x = cPx2(char.birthYear);
      tlRef.current.scrollLeft = x - tlRef.current.clientWidth / 2;
    }, 150);
    setTimeout(() => setHighlightId(null), 3500);
  }

  useEffect(() => {
    const fn = e => { if (dropRef.current && !dropRef.current.contains(e.target)) setSearch(""); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  return (
    <div style={{ height:"calc(100vh - 56px)", background:"#0c0a07", display:"flex", flexDirection:"column" }}>

      {/* Period tabs + search */}
      <div style={{ display:"flex", overflowX:"auto", background:"#0f0d09", borderBottom:"1px solid rgba(255,255,255,.05)", flexShrink:0 }}>
        {periods.map(p => (
          <button key={p.id} onClick={() => { setActivePeriodId(p.id); setHighlightId(null); }} style={{
            padding:"11px 18px", border:"none", cursor:"pointer", fontSize:13,
            fontFamily:"Crimson Pro,serif", fontWeight:600,
            borderBottom: activePeriodId === p.id ? `3px solid ${p.color}` : "3px solid transparent",
            background: activePeriodId === p.id ? "rgba(255,255,255,.04)" : "transparent",
            color: activePeriodId === p.id ? "#f0e8d0" : "#706050",
            whiteSpace:"nowrap", transition:"all .2s",
          }}>
            {p.label} <span style={{ opacity:.4, fontSize:10 }}>({characters.filter(c=>c.periodId===p.id).length})</span>
          </button>
        ))}
        <div style={{ flex:1 }} />
        <div ref={dropRef} style={{ display:"flex", alignItems:"center", padding:"0 16px", position:"relative" }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Tìm nhân vật…"
            style={{ padding:"6px 12px", background:"#1a1714", border:"1px solid rgba(255,255,255,.12)", borderRadius:7, color:"#d0c8b8", fontSize:12, width:210 }} />
          {searchResults.length > 0 && (
            <div style={{ position:"absolute", top:"100%", right:0, width:290, background:"#1c1814",
              border:"1px solid rgba(255,255,255,.1)", borderRadius:10, zIndex:600,
              boxShadow:"0 8px 32px #000c", maxHeight:280, overflowY:"auto" }}>
              <div style={{ padding:"7px 14px", fontSize:9, color:"#7a6a5a", letterSpacing:.5, borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                {searchResults.length} KẾT QUẢ — click để trỏ tới timeline
              </div>
              {searchResults.map(c => (
                <div key={c.id} onClick={() => jumpTo(c)}
                  style={{ padding:"10px 14px", cursor:"pointer", borderBottom:"1px solid rgba(255,255,255,.03)",
                    display:"flex", gap:10, alignItems:"center" }}
                  onMouseEnter={e => e.currentTarget.style.background="rgba(255,255,255,.05)"}
                  onMouseLeave={e => e.currentTarget.style.background="transparent"}
                >
                  <span style={{ fontSize:22, flexShrink:0 }}>{c.avatar}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:13, color:"#e0d8c8", fontFamily:"Cormorant Garamond,serif", fontWeight:600 }}>{c.name}</div>
                    <div style={{ fontSize:10, color:"#7a6a5a" }}>{c.role} · {periods.find(p=>p.id===c.periodId)?.label}</div>
                  </div>
                  <span style={{ fontSize:10, color:"#4a7a4a" }}>→</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div style={{ position:"relative", flex:1, overflow:"hidden" }}>
        <div ref={tlRef} onMouseDown={onMouseDown}
          style={{ overflowX:"auto", overflowY:"hidden", cursor:"grab", userSelect:"none", height:"100%", width:"100%" }}>
          <div style={{ width:canvasW, height:canvasH, position:"relative" }}>

            {chars.map((c, i) => {
              const layout = charLayouts[i];
              const cx     = cPx(c.birthYear, i);
              const isHi   = c.id === highlightId;
              const color  = isHi ? "#ffd060" : period.color;
              const isTop  = layout.side === 0;
              const depth  = layout.depth;

              let cardTop, lineTop, lineH;
              if (isTop) {
                cardTop = 12 + (maxTopDepth - depth) * CH_ROW_H; // hàng gần trục = depth lớn nhất
                lineTop = cardTop + CHAR_H;
                lineH   = AXIS_TOP_C - lineTop;
              } else {
                cardTop = BOT_TOP + depth * CH_ROW_H;
                lineTop = AXIS_TOP_C + AXIS_H_C;
                lineH   = cardTop - lineTop;
              }

              return (
                <React.Fragment key={c.id}>
                  {/* Connector */}
                  <div style={{
                    position:"absolute", left:cx - 1,
                    top: isTop ? lineTop : lineTop,
                    width:2, height:Math.max(lineH, 0),
                    background:`linear-gradient(to ${isTop?"bottom":"bottom"},${color}aa,${color}33)`,
                    zIndex:2, pointerEvents:"none",
                  }} />
                  {/* Dot trên trục */}
                  <div style={{
                    position:"absolute", left:cx - 5, top:AXIS_TOP_C + AXIS_H_C / 2 - 5,
                    width:10, height:10, borderRadius:"50%",
                    background:color, border:`2px solid #0c0a07`,
                    zIndex:6, pointerEvents:"none",
                    boxShadow: isHi ? `0 0 12px ${color}` : "none",
                  }} />
                  {/* Card */}
                  <div onClick={() => { if (!didDrag.current) setPopup(c); }} style={{
                    position:"absolute", left:cx - CHAR_W / 2, top:cardTop,
                    width:CHAR_W, cursor:"pointer", zIndex: isHi ? 10 : 3,
                    background: isHi ? "#221800" : period.bg,
                    border:`1px solid ${color}${isHi?"":"70"}`,
                    borderRadius:12,
                    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
                    padding:"10px 6px",
                    boxShadow: isHi
                      ? `0 0 24px ${color}60,0 3px 16px rgba(0,0,0,.6)`
                      : "0 3px 14px rgba(0,0,0,.5)",
                    animation: isHi ? "pulse 1.2s 3" : "none",
                    transition:"transform .15s, box-shadow .15s",
                  }}
                    onMouseEnter={e => { e.currentTarget.style.transform="scale(1.07)"; e.currentTarget.style.zIndex="9"; }}
                    onMouseLeave={e => { e.currentTarget.style.transform="scale(1)"; e.currentTarget.style.zIndex=isHi?"10":"3"; }}
                  >
                    <div style={{ width:42, height:42, borderRadius:"50%",
                      background: isHi ? "rgba(255,208,0,.15)" : `${period.color}20`,
                      border:`2px solid ${color}`,
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:20, marginBottom:7 }}>{c.avatar}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:"#f0e8d0", textAlign:"center",
                      lineHeight:1.25, overflow:"hidden", display:"-webkit-box",
                      WebkitLineClamp:2, WebkitBoxOrient:"vertical" }}>{c.name}</div>
                    <div style={{ fontSize:9, color, marginTop:4 }}>{yl(c.birthYear)}</div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Trục */}
            <div style={{ position:"absolute", left:PAD_X - 20, top:AXIS_TOP_C + AXIS_H_C / 2 - 1,
              width:canvasW - (PAD_X - 20) * 2, height:2,
              background:`linear-gradient(to right,transparent,${period.color}90 3%,${period.color}90 97%,transparent)`,
              zIndex:5 }} />
            {chars.map((c, i) => {
              const x = cPx(c.birthYear, i);
              const isHi = c.id === highlightId;
              return (
                <div key={`yr-${c.id}`} style={{
                  position:"absolute", left:x, top:AXIS_TOP_C + AXIS_H_C / 2 + 8,
                  transform:"translateX(-50%)",
                  fontSize:9, color: isHi ? "#ffd060" : period.color,
                  fontWeight:600, whiteSpace:"nowrap", zIndex:5, pointerEvents:"none",
                }}>{yl(c.birthYear)}</div>
              );
            })}
            <div style={{ position:"absolute", left:"50%", top:AXIS_TOP_C + 2, transform:"translateX(-50%)",
              fontSize:9, color:period.color, letterSpacing:2.5, fontWeight:700, whiteSpace:"nowrap",
              background:period.bg + "dd", padding:"1px 10px", borderRadius:4, zIndex:7, pointerEvents:"none" }}>
              {period.label.toUpperCase()} · {period.years}
            </div>

            {chars.length === 0 && (
              <div style={{ position:"absolute", top:"45%", left:"50%", transform:"translate(-50%,-50%)",
                color:"#5a4a3a", fontSize:13, textAlign:"center" }}>
                Chưa có nhân vật trong thời kỳ này
              </div>
            )}
          </div>
        </div>
        <button onClick={() => tlRef.current && (tlRef.current.scrollLeft -= 320)} style={navBtn("left")}>‹</button>
        <button onClick={() => tlRef.current && (tlRef.current.scrollLeft += 320)} style={navBtn("right")}>›</button>
      </div>

      <div style={{ padding:"4px 20px", background:"#080706", fontSize:10, color:"#5a4a3a", flexShrink:0, display:"flex", gap:20 }}>
        <span>{chars.length} nhân vật</span>
        <span style={{ marginLeft:"auto" }}>Kéo để cuộn · Click để xem · Tìm kiếm → trỏ tới timeline</span>
      </div>
      <Popup item={popup} onClose={() => setPopup(null)} />
    </div>
  );
}
/* ═══════════════ ROOT ═══════════════ */
export default function App() {
  const { periods, eventsVN, eventsWorld, characters, loading } = useData();
  const [page,      setPage]      = useState("home");
  const [showLogin, setShowLogin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [authed,    setAuthed]    = useState(false);

  if (loading) return (
    <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0c0a07", color:"#8a7a60", fontFamily:"Cormorant Garamond,serif", fontSize:18, letterSpacing:2 }}>
      Đang tải dữ liệu…
    </div>
  );

  const NAV = [
    { id:"home",       label:"🏛  Trang Chủ" },
    { id:"events",     label:"📅  Sự Kiện"   },
    { id:"characters", label:"👤  Nhân Vật"  },
  ];

  return (
    <div style={{ minHeight:"100vh", background:"#0c0a07", fontFamily:"Crimson Pro,Georgia,serif" }}>
      <style>{GCSS}</style>

      {/* NAV */}
      <nav style={{ height:56, backgroundColor:"rgba(10,8,5,.92)", borderBottom:"1px solid rgba(255,255,255,.06)", display:"flex", alignItems:"center", padding:"0 20px", gap:4, position:"sticky", top:0, zIndex:1000, boxShadow:"0 1px 24px rgba(0,0,0,.5)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginRight:24 }}>
          <span style={{ fontSize:22 }}>🇻🇳</span>
          <div>
            <div style={{ fontFamily:"Cormorant Garamond,serif", fontSize:16, fontWeight:700, color:"#e8d8a0", lineHeight:1, letterSpacing:.5 }}>Lịch Sử Việt Nam</div>
            <div style={{ fontSize:8, color:"#6a5a40", letterSpacing:3 }}>INTERACTIVE TIMELINE</div>
          </div>
        </div>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            padding:"7px 16px", border:"none", cursor:"pointer",
            background: page === n.id ? "rgba(255,255,255,.07)" : "transparent",
            color: page === n.id ? "#f0e8d0" : "#807060",
            borderRadius:7, fontSize:13, fontFamily:"Crimson Pro,serif",
            fontWeight: page === n.id ? 600 : 400, transition:"all .2s",
            borderBottom: page === n.id ? "2px solid rgba(255,255,255,.15)" : "2px solid transparent",
          }}>{n.label}</button>
        ))}
        <div style={{ flex:1 }} />
        {authed && <span style={{ fontSize:10, color:"#5a8050", marginRight:8, letterSpacing:.5 }}>✓ ĐÃ ĐĂNG NHẬP</span>}
        <button onClick={() => authed ? setShowAdmin(true) : setShowLogin(true)} style={{ padding:"7px 14px", background:"#1a2a1a", border:"1px solid #2a4a2a", borderRadius:7, color:"#609060", cursor:"pointer", fontSize:12 }}>⚙ Quản trị</button>
      </nav>

      {page === "home"       && <HomePage       periods={periods} />}
      {page === "events"     && <EventsPage     periods={periods} eventsVN={eventsVN} eventsWorld={eventsWorld} />}
      {page === "characters" && <CharactersPage periods={periods} characters={characters} />}

      {showLogin && <LoginPopup onSuccess={() => { setAuthed(true); setShowLogin(false); setShowAdmin(true); }} onClose={() => setShowLogin(false)} />}
      {showAdmin && <AdminPanel periods={periods} eventsVN={eventsVN} characters={characters} onClose={() => setShowAdmin(false)} />}
    </div>
  );
}
