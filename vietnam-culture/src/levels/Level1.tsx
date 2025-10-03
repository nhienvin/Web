import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Bundle, Province } from "../types";
import { dist, within } from "../core/math";
import { useTimer } from "../core/useTimer";
import { pushLB } from "../core/leaderboard";
import { useSfx } from "../core/useSfx";
import { useAtlasPaths } from "../core/useAtlas";

/* ========= helpers ========= */
function hash32(s: string) { let h = 2166136261>>>0; for (let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
function colorForId(id: string) {
  const h = hash32(id) % 360;
  return {
    fill:   `hsl(${h} 75% 62%)`,
    stroke: `hsl(${h} 55% 30%)`,
    chipBg: `hsl(${h} 90% 94%)`,
    chipBd: `hsl(${h} 70% 70%)`
  };
}
function mulberry32(a:number){return function(){let t=(a+=0x6D2B79F5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),61);return((t^(t>>>14))>>>0)/4294967296;}}
function shuffleSeeded<T>(arr:T[], seed:number){const rnd=mulberry32(seed);for(let i=arr.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function useStageScale(stageW:number, stageH:number, pad=24){
  const [scale,setScale]=useState(1);
  useEffect(()=>{
    const recalc=()=>{ const aw=window.innerWidth-pad*2; const ah=window.innerHeight-pad*2;
      setScale(Math.min(aw/stageW, ah/stageH, 1));
    };
    recalc(); window.addEventListener('resize', recalc);
    return ()=>window.removeEventListener('resize', recalc);
  },[stageW,stageH,pad]);
  return scale;
}
function getDevFlag(): boolean {
  try {
    // const qs = new URLSearchParams(window.location.search || "");
    // if (qs.get("dev") === "1") return true;
    // const hash = String(window.location.hash || "");
    // const hs = new URLSearchParams(hash.includes("?") ? hash.split("?")[1] : "");
    // if (hs.get("dev") === "1") return true;
    return localStorage.getItem("dev") === "1";
  } catch { return false; }
}
/* ========= fallback: SVG tỉnh rời ========= */
type SvgMeta = { d: string; vb: {minX:number; minY:number; width:number; height:number} | null };
const svgCache = new Map<string, SvgMeta>();
function normalizeUrl(path: string){ return path?.startsWith('/') ? path : ('/'+path); }
function parseViewBox(txt: string){
  const m = txt.match(/viewBox\s*=\s*["']\s*([0-9.+-eE]+)\s+([0-9.+-eE]+)\s+([0-9.+-eE]+)\s+([0-9.+-eE]+)\s*["']/i);
  if (!m) return null;
  return { minX: +m[1], minY: +m[2], width: +m[3], height: +m[4] };
}
async function fetchProvinceSvgMeta(url: string): Promise<SvgMeta>{
  const key = normalizeUrl(url);
  if (svgCache.has(key)) return svgCache.get(key)!;
  const res = await fetch(key);
  if (!res.ok) return { d:"", vb:null };
  const txt = await res.text();
  const vb = parseViewBox(txt);
  const d = [...txt.matchAll(/<path[^>]*\sd=(?:"([^"]+)"|'([^']+)')/gi)]
             .map(m => m[1] || m[2] || "").join(" ");
  const meta = { d, vb };
  svgCache.set(key, meta);
  return meta;
}
function isBoardAligned(vb: SvgMeta["vb"], vw:number, vh:number){
  if (!vb) return false;
  const eps = 1e-3;
  return Math.abs(vb.minX) < eps && Math.abs(vb.minY) < eps &&
         Math.abs(vb.width - vw) < eps && Math.abs(vb.height - vh) < eps;
}

/* ========= leaderboard read ========= */
type LBItem = { name: string; ms: number; ts?: number };
function readLB(lbKey: string): LBItem[] { try { return JSON.parse(localStorage.getItem(lbKey) || "[]"); } catch { return []; } }

/* ========= main ========= */
const LB_KEY = 'lb:pack1:level1';
const PANEL_W = 360; // tăng chút để đủ 2–3 cột dễ nhìn

export default function Level1({ bundle, onBack }: { bundle: Bundle; onBack: () => void }) {
  const atlasPaths = useAtlasPaths("/assets/atlas.svg"); // nếu không có atlas => rỗng

  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<{ pid: string; fixed?: {x:number;y:number} }|null>(null);
  const [showWin, setShowWin] = useState(false);
  const [feedback, setFeedback] = useState<null | 'ok' | 'bad'>(null);
  const [shake, setShake] = useState(false);

  const [seed, setSeed] = useState(()=> (crypto.getRandomValues(new Uint32Array(1))[0])>>>0);

  const boardRef = useRef<HTMLDivElement>(null);
  const doneOnceRef = useRef(false);
  const [, , vw, vh] = bundle.viewBox;
  const [dev] = useState(getDevFlag());
  const provinces = useMemo(()=> shuffleSeeded([...bundle.provinces], seed), [bundle, seed]);

  const boardPadding = dev ? Math.max(vw * 0.12, 120) : Math.max(vw * 0.05, 10);
  const boardCanvasWidth = vw + boardPadding * 2;
  const boardCanvasHeight = vh + boardPadding * 2;
  const stageW = boardCanvasWidth + 16 + PANEL_W;
  const stageH = boardCanvasHeight;
  const stageScale = useStageScale(stageW, stageH, 24);

  const solved = Object.keys(placed).length;
  const total = bundle?.provinces?.length ?? 0;
  const ready = total > 0;
  const { ms } = useTimer(solved < total);

  const { playCorrect, playWrong, playWin } = useSfx();
  const truongSaMarkers = [
    [0.96, 0.73],
    [0.97, 0.74],
    [0.95, 0.75],
    [0.93, 0.78],
    [0.98, 0.76],
  
  ];
  const truongSaRadius = Math.max(3, Math.min(9, Math.max(vw, vh) * 0.006));
  const truongSaStroke = Math.max(0.7, Math.min(3, Math.max(vw, vh) * 0.0012));
  const truongSaFontSize = Math.max(12, Math.min(32, vw * 0.02));
  const hoangSaMarkers = [
    [0.92, 0.48],
    [0.90, 0.45],
    [0.95, 0.43],
  ];
  const hoangSaRadius = Math.max(2.5, Math.min(7, Math.max(vw, vh) * 0.004));
  const hoangSaStroke = Math.max(0.6, Math.min(2.4, Math.max(vw, vh) * 0.001));
  const hoangSaFontSize = Math.max(10, Math.min(26, vw * 0.016));

  // preload SVG rời
  const [extraMeta, setExtraMeta] = useState<Record<string, SvgMeta>>({});
  useEffect(()=>{
    (async ()=>{
      const upd: Record<string, SvgMeta> = {};
      for (const p of bundle.provinces){
        if (atlasPaths[p.id]) continue;
        if (!p.svg_path_file) continue;
        const meta = await fetchProvinceSvgMeta(p.svg_path_file);
        if (meta.d) upd[p.id] = meta;
      }
      if (Object.keys(upd).length) setExtraMeta(s=>({ ...s, ...upd }));
    })();
  }, [bundle.provinces, atlasPaths]);

  // mở popup đúng lúc (chỉ 1 lần)
  useEffect(()=>{
    if (!ready) return;
    const done = solved >= total;
    if (done && !doneOnceRef.current) {
      doneOnceRef.current = true;
      setShowWin(true);
      playWin();
    }
  }, [ready, solved, total, playWin]);

  function resetGame(){
    setPlaced({});
    setShowWin(false);
    doneOnceRef.current = false;
    setSeed((crypto.getRandomValues(new Uint32Array(1))[0])>>>0);
  }

  // snap: quy đổi client -> viewBox
  function onTryDrop(pid: string, clientX:number, clientY:number) {
    const rect = boardRef.current!.getBoundingClientRect();
    const sx = rect.width  / vw;
    const sy = rect.height / vh;
    const x = (clientX - rect.left) / sx;
    const y = (clientY - rect.top)  / sy;

    const p = bundle.provinces.find(q=>q.id===pid)!;
    const ax = Math.min(Math.max(p.anchor_px[0], 0), vw);
    const ay = Math.min(Math.max(p.anchor_px[1], 0), vh);
    const tol = Math.max(p.snap_tolerance_px || 18, 56);
    const ok = within(dist(x,y, ax,ay), tol);

    if (ok) {
      setPlaced(s=>({ ...s, [pid]: true }));
      setFeedback('ok'); setTimeout(()=>setFeedback(null), 700);
      playCorrect();
    } else {
      setShake(true); setTimeout(()=>setShake(false), 480);
      if (navigator.vibrate) navigator.vibrate(50);
      setFeedback('bad'); setTimeout(()=>setFeedback(null), 700);
      playWrong();
    }
    return ok;
  }

  function pathForFill(p: Province): string {
    const dAtlas = atlasPaths[p.id];
    if (dAtlas) return dAtlas;
    const meta = extraMeta[p.id];
    if (!meta) return "";
    if (isBoardAligned(meta.vb, vw, vh)) return meta.d;
    return ""; // SVG rời bị crop theo bbox => không thể đặt trùng vị trí toàn cục
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-900 text-slate-100">
      {/* HUD via portal: luôn nổi trên tất cả */}
      {/* {createPortal(
        <div
          style={{
            position: 'fixed', top: 12, left: 12, zIndex: 2147483647,
            background: 'rgba(30,41,59,.88)', color: '#fff',
            border: '1px solid rgba(51,65,85,.9)', borderRadius: 8,
            padding: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,.35)',
            display:'flex', alignItems:'center', gap:10
          }}
        >
          <button
            onClick={onBack}
            style={{ pointerEvents:'auto', fontSize:12, padding:'4px 10px', borderRadius:6, border:'1px solid #475569', background:'#0f172a', color:'#f8fafc', cursor:'pointer' }}
            title="Quay lại menu"
          >
            ← Menu
          </button>
          <span style={{ fontSize: 14 }}>
            Thời gian: <b>{(ms/1000).toFixed(1)}s</b>
            {' • '}Đã đặt: <b>{solved}/{total}</b>
          </span>
          <button
            onClick={resetGame}
            style={{ pointerEvents:'auto', fontSize:12, padding:'4px 8px',
              borderRadius:6, border:'1px solid #475569',
              background:'#334155', color:'#fff', cursor:'pointer' }}
            title="Làm lại (random thứ tự mới)"
          >↻</button>
          <button
            className="text-[11px] px-2 py-1 rounded border border-slate-600 bg-slate-700"
            onClick={() => { const next = !dev; setDev(next); localStorage.setItem("dev", next ? "1":"0"); }}
            title="Bật/tắt bảng DEV"
          >
            DEV {dev ? "ON" : "OFF"}
          </button>
        </div>,
        document.body
      )} */}

      {/* Stage */}
      <div
        className="absolute"
        style={{
          left: '50%', top: '50%',
          width: stageW, height: stageH,
          transform: `translate(-50%,-50%) scale(${stageScale})`,
          transformOrigin: 'center center'
        }}
      >
        <div className="grid gap-4" style={{ display:'grid', gridTemplateColumns: `${vw}px ${PANEL_W}px` }}>
          {/* BOARD */}
          <div className={`relative ${shake ? 'anim-shake' : ''}`} style={{ width: vw, height: vh }}>
            <img
              src="/assets/board_with_borders.svg"
              width={vw} height={vh}
              className="select-none pointer-events-none rounded-lg border border-slate-700 shadow-sm"
              alt="Vietnam board"
            />

            {/* Fill tỉnh đã đúng */}
            <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${vw} ${vh}`} style={{ zIndex: 5 }}>
              <g stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.75} strokeWidth={truongSaStroke}>
                {truongSaMarkers.map(([fx, fy], idx) => (
                  <circle key={`ts-${idx}`} cx={vw * fx} cy={vh * fy} r={truongSaRadius} />
                ))}
              </g>
              <g stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.75} strokeWidth={hoangSaStroke}>
                {hoangSaMarkers.map(([fx, fy], idx) => (
                  <circle key={`hs-${idx}`} cx={vw * fx} cy={vh * fy} r={hoangSaRadius} />
                ))}
              </g>
              <text
                x={vw * 0.88}
                y={vh * 0.80}
                fill="#38bdf8"
                fontSize={truongSaFontSize}
                fontWeight={600}
                opacity={0.8}
              >
                Trường Sa
              </text>
              <text
                x={vw * 0.86}
                y={vh * 0.44}
                fill="#fbbf24"
                fontSize={hoangSaFontSize}
                fontWeight={600}
                opacity={0.85}
              >
                Hoàng Sa
              </text>
              {/* layer path fill */}
              {bundle.provinces.map(p=>{
                if (!placed[p.id]) return null;
                const d = pathForFill(p); if (!d) return null;
                const c = colorForId(p.id);
                return <path key={`path-${p.id}`} d={d} fill={c.fill} stroke={c.stroke} strokeWidth={1}/>;
              })}

              {/* layer label tên tỉnh (trên cùng) */}
              <g
                fontSize={12}
                textAnchor="middle"
                style={{ pointerEvents:'none', paintOrder:'stroke', stroke:'#fff', strokeWidth:3 }}
              >
                {bundle.provinces.map(p=>{
                  if (!placed[p.id]) return null;
                  const [ax, ay] = p.anchor_px;
                  return (
                    <text key={`label-${p.id}`} x={ax} y={ay-6} fill="#0f172a">
                      {p.name_vi}
                    </text>
                  );
                })}
              </g>
            </svg>


            <div ref={boardRef} className="absolute inset-0">
              {/* chỉ chấm neo (KHÔNG hiện tên tỉnh trên bản đồ) */}
              {bundle.provinces.map(p=>{
                const [x,y] = p.anchor_px; const ok = !!placed[p.id];
                return (
                  <div key={p.id} className="absolute" style={{ left:x-3, top:y-3, width:6, height:6 }}>
                    <div className={`w-1.5 h-1.5 rounded-full ${ok?'bg-emerald-500':'bg-slate-400'} opacity-80`} />
                  </div>
                );
              })}
              {/* aim circle */}
              {drag?.pid && (() => {
                const p = provinces.find(q=>q.id===drag.pid)!;
                const tol = Math.max(p.snap_tolerance_px || 18, 56);
                return <div className="aim" style={{ left: p.anchor_px[0]-tol, top: p.anchor_px[1]-tol, width: tol*2, height: tol*2 }}/>;
              })()}
            </div>
          </div>

          {/* PANEL phải */}
          <aside className="relative w-[460px]">
            {/* Header sticky có nút “Làm lại” (dự phòng) */}
            <div className="sticky top-0 z-20 flex items-center justify-evenly px-3 py-2 rounded-t-lg bg-slate-800/90 backdrop-blur border-b border-slate-700">
              <div className="text-2xl text-slate-200">Thời gian: <b>{(ms/1000).toFixed(1)}s</b>
                {' • '}<b>{solved}/{total}</b>
              </div>
              <button
                onClick={onBack}
                style={{ pointerEvents:'auto', fontSize:32, padding:'4px 8px',
                borderRadius:6, border:'1px solid #475569',
                background:'#334155', color:'#fff', cursor:'pointer' }}
                title="Quay lại menu">
                ← 
              </button>
              <button
              onClick={resetGame}
              style={{ pointerEvents:'auto', fontSize:32, padding:'4px 8px',
                borderRadius:6, border:'1px solid #475569',
                background:'#334155', color:'#fff', cursor:'pointer' }}
              title="Làm lại (random thứ tự mới)"
              >↻</button>
              {/* <button
                className="text-sm px-2 py-1 rounded border border-slate-600 bg-slate-700"
                onClick={() => { const next = !dev; setDev(next); localStorage.setItem("dev", next ? "1":"0"); }}
                title="Bật/tắt bảng DEV">
                DEV {dev ? "ON" : "OFF"}
              </button> */}
            </div>

            {/* Danh sách tên tỉnh: GRID 2–3 cột, chữ to */}
            <div className="mt-3 border border-slate-700 rounded-lg bg-slate-800/60" style={{ height: vh }}>
              <div className="h-full p-3 no-scrollbar">
                <div className="grid grid-cols-2 xl:grid-cols-2 gap-2 auto-rows-[48px]">
                  {provinces.map(p=>(
                    <NameChip
                      key={p.id}
                      province={p}
                      disabled={!!placed[p.id]}
                      onStart={(clientX, clientY)=> setDrag({ pid: p.id, fixed: { x: clientX-28, y: clientY-18 } })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* CHIP đang kéo */}
      {drag?.fixed && (
        <FloatingChip
          color={colorForId(drag.pid)}
          name={provinces.find(q=>q.id===drag.pid)?.name_vi || drag.pid}
          x={drag.fixed.x} y={drag.fixed.y}
          onMove={(cx,cy)=> setDrag(d=> d ? ({ ...d, fixed:{ x:cx-28, y:cy-18 } }) : d)}
          onUp={(cx,cy)=>{ onTryDrop(drag.pid, cx, cy); setDrag(null); }}
          onCancel={()=> setDrag(null)}
        />
      )}

      {/* TOAST feedback */}
      {feedback && createPortal(
        <div
          style={{
            position:'fixed', top: 14, left: '50%', transform: 'translateX(-50%)',
            zIndex: 2147483000, padding: '6px 10px', borderRadius: 8, color: '#fff',
            background: feedback==='ok' ? 'rgba(5,150,105,.95)' : 'rgba(244,63,94,.95)',
            boxShadow: '0 2px 8px rgba(0,0,0,.35)'
          }}
        >
          {feedback==='ok' ? '✓ Đúng rồi!' : '✗ Chưa đúng, thử lại nhé!'}
        </div>,
        document.body
      )}
      {/* AnchorTuner giữ nguyên, overlay phía ngoài stage */}
      {dev && <AnchorTuner bundle={bundle} vw={vw} vh={vh} />}

      {/* POPUP thắng cuộc (có Top 5, nút Đóng là tắt hẳn) */}
      {showWin && (
        <WinDialog
          lbKey={LB_KEY}
          ms={ms}
          onClose={()=> setShowWin(false)}
        />
      )}
    </div>
  );
}

/* ===== components ===== */
function NameChip({ province, disabled, onStart }:{
  province: Province; disabled: boolean; onStart: (cx:number, cy:number)=>void;
}){
  const color = colorForId(province.id);
  function onPointerDown(e:React.PointerEvent){
    if (disabled) return;
    onStart(e.clientX, e.clientY);
  }
  return (
    <div
      onPointerDown={onPointerDown}
      className={`h-12 w-full grid place-items-center rounded border text-4xl font-medium select-none cursor-grab text-slate-900
                  ${disabled ? 'opacity-35 line-through pointer-events-none' : ''}`}
      style={{ background: color.chipBg, borderColor: color.chipBd }}
      title={province.name_en}
    >
      <span className="p-4 truncate">{province.name_vi}</span>
    </div>

  );
}

function FloatingChip({
   name, color, x, y, onMove, onUp, onCancel
}:{
  name: string; color: ReturnType<typeof colorForId>;
  x:number; y:number; onMove:(cx:number,cy:number)=>void; onUp:(cx:number,cy:number)=>void; onCancel:()=>void;
}){
  useEffect(()=>{
    function move(ev:PointerEvent){ onMove(ev.clientX, ev.clientY); }
    function up(ev:PointerEvent){ cleanup(); onUp(ev.clientX, ev.clientY); }
    function key(ev:KeyboardEvent){ if (ev.key==='Escape'){ cleanup(); onCancel(); } }
    function cleanup(){ window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('keydown', key); }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('keydown', key);
    return ()=> cleanup();
  }, [onMove, onUp, onCancel]);

  return (
    <div className="fixed z-50 select-none pointer-events-none" style={{ left:x, top:y }}>
      <div className="px-3 py-2 rounded border text-base font-medium shadow text-slate-900"
           style={{ background: color.chipBg, borderColor: color.chipBd }}>
        {name}
      </div>
    </div>
  );
}
// ---- Dev: chỉnh anchor nhanh ----
function AnchorTuner({ bundle, vw, vh }: { bundle: Bundle; vw: number; vh: number }) {
  const [pid, setPid] = useState(bundle.provinces[0]?.id || "");
  const [anchors, setAnchors] = useState<Record<string, [number, number]>>(
    Object.fromEntries(bundle.provinces.map(p => [p.id, [...p.anchor_px] as [number, number]]))
  );
  function onClickBoard(e: React.MouseEvent<HTMLDivElement>) {
    const host = e.currentTarget as HTMLElement;
    const r = host.getBoundingClientRect();
    const scaleX = vw / r.width;
    const scaleY = vh / r.height;
    const rawX = (e.clientX - r.left) * scaleX;
    const rawY = (e.clientY - r.top) * scaleY;
    const x = Math.min(Math.max(rawX, 0), vw);
    const y = Math.min(Math.max(rawY, 0), vh);
    setAnchors(a => ({ ...a, [pid]: [x, y] }));
  }

  function download() {
    const rows = bundle.provinces.map(p => {
      const [x, y] = anchors[p.id];
      return { province_id: p.id, anchor_x: +x.toFixed(1), anchor_y: +y.toFixed(1) };
    });
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "slots.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white/90 backdrop-blur rounded-lg border shadow p-3 w-[360px]">
      <div className="font-semibold mb-2 text-black">AnchorTuner (DEV)</div>
      <div className="flex items-center gap-2">
        <label className="text-sm text-black">Tỉnh:</label>
        <select className="border rounded px-2 py-1 text-sm flex-1 text-black" value={pid} onChange={e => setPid(e.target.value)}>
          {bundle.provinces.map(p => <option key={p.id} value={p.id}>{p.id} – {p.name_vi}</option>)}
        </select>
        <button className="px-2 py-1 text-sm rounded bg-slate-800 text-white" onClick={download}>Export slots.json</button>
      </div>
      <div className="text-xs text-slate-600 mt-1">Click lên ảnh dưới để đặt anchor cho tỉnh đang chọn.</div>

      <div className="mt-2 relative border rounded bg-slate-300" style={{ width: vw/2, height: vh/2 }}>
        <img src="/assets/board_blank_outline.svg" width={vw/2} height={vh/2} className="opacity-30" />
        <div className="absolute inset-0" onClick={onClickBoard} />
        {Object.entries(anchors).map(([id, [x, y]]) => (
          <div key={id} className="absolute" style={{ left: x/2 - 3, top: y/2 - 3 }}>
            <div className={`w-[6px] h-[6px] rounded-full ${id === pid ? "bg-emerald-600" : "bg-slate-400"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
function WinDialog({ lbKey, ms, onClose }:{
  lbKey: string; ms:number; onClose:()=>void;
}){
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState<string | null>(null);
  const [lb, setLb] = useState<LBItem[]>(() => readLB(lbKey));
  const top5 = useMemo(() => lb.slice(0,5), [lb]);

  function handleSave(){
    const cleaned = (name ?? "").trim();
    const safeName = cleaned.length ? cleaned.slice(0, 32) : "Ẩn danh";
    const list = pushLB(lbKey, { name: safeName, ms });
    setLb(list);
    setSavedName(safeName);
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white text-slate-900 rounded-2xl shadow-xl p-5 w-[min(92vw,520px)] anim-pop">
        <div className="text-center">
          <div className="text-3xl">🎉</div>
          <div className="mt-1 text-xl font-semibold">Xuất sắc!</div>
          <div className="text-slate-600 mt-1">Bạn đã ghép xong bản đồ cấp 1.</div>
          <div className="mt-2 text-sm text-slate-500">Thời gian: <b>{(ms/1000).toFixed(1)}s</b></div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold text-slate-700">🏆 Top 5</div>
          <div className="rounded border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-3 py-2 w-12">#</th>
                  <th className="text-left px-3 py-2">Tên</th>
                  <th className="text-right px-3 py-2 w-24">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {top5.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-3 text-center text-slate-500">Chưa có dữ liệu</td></tr>
                )}
                {top5.map((r, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-3 py-1.5">{i+1}</td>
                    <td className="px-3 py-1.5">{r.name}</td>
                    <td className="px-3 py-1.5 text-right">{(r.ms/1000).toFixed(1)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <label className="text-sm text-slate-700">Tên bạn</label>
            <div className="mt-1 flex gap-2">
              <input
                className="flex-1 border rounded px-3 py-2 text-sm"
                placeholder="Nhập tên để lưu BXH"
                value={name}
                onChange={e=>setName(e.target.value)}
              />
              <button
                className="px-3 py-2 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
                onClick={handleSave}
              >
                Lưu
              </button>
            </div>
            {savedName && (
              <div className="mt-2 text-sm text-emerald-700">
                ✅ Đã lưu: <b>{savedName}</b>
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end">
          <button className="px-3 py-1.5 text-sm rounded border" onClick={onClose}>Đóng</button>
        </div>
      </div>
    </div>
  );
}
