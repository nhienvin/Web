import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Bundle, Province } from "../types";
import { dist, within } from "../core/math";
import { useTimer } from "../core/useTimer";
import { pushLB } from "../core/leaderboard";
import { useSfx } from "../core/useSfx";
import { useAtlasPaths } from "../core/useAtlas";

/* ================= Helpers: màu, random, scale ================= */
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
function seedFromURLorLS(key='seed:l1'){const qs=new URLSearchParams(window.location.search||'');const q=qs.get('seed');if(q&&/^\d+$/.test(q))return Number(q)>>>0;const s=localStorage.getItem(key);if(s)return Number(s)>>>0;const r=(crypto.getRandomValues(new Uint32Array(1))[0])>>>0;localStorage.setItem(key,String(r));return r;}
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
// ——— lấy path từ SVG rời nếu atlas thiếu ———
const svgCache = new Map<string, string>();
function normalizeUrl(p: string){ return p?.startsWith('/') ? p : ('/'+p); }
async function fetchProvincePathD(url: string): Promise<string>{
  const key = normalizeUrl(url);
  if (svgCache.has(key)) return svgCache.get(key)!;
  const res = await fetch(key);
  if (!res.ok) return "";
  const txt = await res.text();
  const d = [...txt.matchAll(/<path[^>]*\sd=(?:"([^"]+)"|'([^']+)')/gi)]
            .map(m => m[1] || m[2] || "").join(" ");
  svgCache.set(key, d);
  return d;
}

// ——— đo bbox center của d để “bắt” path gần anchor ———
let measureSvg: SVGSVGElement | null = null;
function ensureMeasureSvg(){ if (!measureSvg){ measureSvg = document.createElementNS('http://www.w3.org/2000/svg','svg'); measureSvg.setAttribute('viewBox','0 0 10 10'); measureSvg.style.position='absolute'; measureSvg.style.left='-99999px'; measureSvg.style.top='-99999px'; document.body.appendChild(measureSvg); } }
function centerOfPathD(d: string){ ensureMeasureSvg(); const path = document.createElementNS('http://www.w3.org/2000/svg','path'); path.setAttribute('d', d); measureSvg!.appendChild(path); const b = path.getBBox(); measureSvg!.removeChild(path); return { cx: b.x + b.width/2, cy: b.y + b.height/2 }; }

// ——— chọn d đúng theo id hoặc gần anchor ———
const mapCache = new Map<string, string>(); // province_id -> d
function resolvePathForProvince(p: Province, atlasPaths: Record<string,string>, extra: Record<string,string>): string {
  // 1) ưu tiên file rời nếu đã có
  if (extra[p.id]) return extra[p.id];
  // 2) thử nhiều khoá id trong atlas
  const kCandidates = [p.id, `p-${p.id}`, `VN-${p.id}`];
  for (const k of kCandidates){ if (atlasPaths[k]) return atlasPaths[k]; }
  // 3) fallback: tìm path có tâm gần anchor nhất
  const key = p.id;
  if (mapCache.has(key)) return mapCache.get(key)!;
  let bestD = "", bestDist = Infinity;
  const ax = p.anchor_px[0], ay = p.anchor_px[1];
  for (const d of Object.values(atlasPaths)){
    try {
      const {cx, cy} = centerOfPathD(d);
      const dd = (cx-ax)*(cx-ax) + (cy-ay)*(cy-ay);
      if (dd < bestDist){ bestDist = dd; bestD = d; }
    } catch {}
  }
  if (bestD) mapCache.set(key, bestD);
  return bestD;
}

/* =============================================================== */

const LB_KEY = 'lb:pack1:level1';

export default function Level1({ bundle }: { bundle: Bundle }) {
  const atlasPaths = useAtlasPaths("/assets/atlas.svg");

  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<{ pid: string; fixed?: {x:number;y:number} }|null>(null);
  const [showWin, setShowWin] = useState(false);
  const [feedback, setFeedback] = useState<null | 'ok' | 'bad'>(null);
  const [shake, setShake] = useState(false);

  const { ms } = useTimer(Object.keys(placed).length !== bundle.provinces.length);
  const { playCorrect, playWrong, playWin } = useSfx();

  const boardRef = useRef<HTMLDivElement>(null);
  const [vx, vy, vw, vh] = bundle.viewBox;

  // random tên tỉnh
  const [seed] = useState(seedFromURLorLS());
  const provinces = useMemo(()=> shuffleSeeded([...bundle.provinces], seed), [bundle, seed]);

  // Stage fit màn hình (không có scroll dọc)
  const panelW = 340, gap = 16;
  const stageW = vw + gap + panelW;
  const stageH = vh;
  const stageScale = useStageScale(stageW, stageH, 24);

  // Preload fallback path cho tỉnh thiếu atlas (không block UI)
  const [extraPaths, setExtraPaths] = useState<Record<string,string>>({});
  useEffect(()=>{
    (async ()=>{
      const upd: Record<string,string> = {};
      for (const p of bundle.provinces){
        if (atlasPaths[p.id] || atlasPaths['p-'+p.id] || atlasPaths['VN-'+p.id]) continue;
        if (!p.svg_path_file) continue;
        const d = await fetchProvincePathD(p.svg_path_file);
        if (d) upd[p.id] = d;
      }
      if (Object.keys(upd).length) setExtraPaths(s=>({ ...s, ...upd }));
    })();
  }, [bundle.provinces, atlasPaths]);


  useEffect(()=>{
    if (Object.keys(placed).length === provinces.length){
      setShowWin(true);
      playWin();
    }
  }, [placed, provinces.length, playWin]);

  // >>>> QUAN TRỌNG: chuyển clientXY -> toạ độ gốc (viewBox) của board bằng scale thực <<<<
  function onTryDrop(pid: string, clientX:number, clientY:number) {
    const rect = boardRef.current!.getBoundingClientRect();
    const sx = rect.width  / vw;       // scale X thực
    const sy = rect.height / vh;       // scale Y thực
    const x = (clientX - rect.left) / sx;
    const y = (clientY - rect.top)  / sy;

    const p = provinces.find(q=>q.id===pid)!;
    const ax = Math.min(Math.max(p.anchor_px[0], 0), vw);
    const ay = Math.min(Math.max(p.anchor_px[1], 0), vh);
    const tol = Math.max(p.snap_tolerance_px || 18, 28);
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
  }


  // lấy path để fill (ưu tiên atlas, thiếu thì extraPaths)
  const getPathD = (p: Province) => atlasPaths[p.id] || extraPaths[p.id] || "";

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-900 text-slate-100">
      {/* HUD cố định (không scale) */}
      <div
        style={{
          position: 'fixed',
          top: 12, left: 12,
          zIndex: 2147483647,
          background: 'rgba(30,41,59,.85)',
          color: '#fff',
          border: '1px solid rgba(51,65,85,.9)',
          borderRadius: 8,
          padding: '6px 10px',
          boxShadow: '0 2px 8px rgba(0,0,0,.35)',
          pointerEvents: 'none'
        }}
      >
        <span style={{ fontSize: 14 }}>
          Thời gian: <b>{(ms/1000).toFixed(1)}s</b>
          {' • '}Đã đặt: <b>{Object.keys(placed).length}/{bundle.provinces.length}</b>
        </span>
      </div>


      {/* Stage center & scale */}
      <div
        className="absolute"
        style={{
          left: '50%', top: '50%',
          width: stageW, height: stageH,
          transform: `translate(-50%,-50%) scale(${stageScale})`,
          transformOrigin: 'center center'
        }}
      >
        <div className="grid gap-4" style={{ display:'grid', gridTemplateColumns: `${vw}px ${panelW}px` }}>
          {/* BOARD */}
          <div className={`relative ${shake ? 'anim-shake' : ''}`} style={{ width: vw, height: vh }}>
            <img
              src="/assets/board_with_borders.svg"
              width={vw} height={vh}
              className="select-none pointer-events-none rounded-lg border border-slate-700 shadow-sm"
              alt="Vietnam board"
            />

            {/* Fill tỉnh đã đúng (atlas hoặc fallback) */}
            <svg className="absolute inset-0 pointer-events-none z-10" viewBox={`0 0 ${vw} ${vh}`}>
              {bundle.provinces.map(p=>{
                if (!placed[p.id]) return null;
                const d = resolvePathForProvince(p, atlasPaths, extraPaths);  // ⬅ dùng hàm mới
                if (!d) return null;
                const c = colorForId(p.id);
                return <path key={p.id} d={d} fill={c.fill} stroke={c.stroke} strokeWidth={1}/>;
              })}
            </svg>


            <div ref={boardRef} className="absolute inset-0">
              {/* điểm neo + tick */}
              {bundle.provinces.map(p=>{
                const [x,y] = p.anchor_px; const ok = !!placed[p.id];
                return (
                  <div key={p.id} className="absolute" style={{ left:x-4, top:y-4, width:8, height:8 }}>
                    <div className={`w-2 h-2 rounded-full ${ok?'bg-emerald-500':'bg-slate-400'} opacity-80`} />
                    {ok && <div className="absolute left-3 -top-1 text-emerald-300 text-[11px]">✓ {p.name_vi}</div>}
                  </div>
                );
              })}
              {/* aim circle khi đang kéo */}
              {drag?.pid && (() => {
                const p = provinces.find(q=>q.id===drag.pid)!;
                const tol = Math.max(p.snap_tolerance_px || 18, 28);
                return <div className="aim" style={{ left: p.anchor_px[0]-tol, top: p.anchor_px[1]-tol, width: tol*2, height: tol*2 }}/>;
              })()}
            </div>
          </div>

          {/* SIDEBAR (ẩn scrollbar, vẫn cuộn) */}
          <aside className="relative w-[340px]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">
                Thời gian: <b>{(ms/1000).toFixed(1)}s</b>
              </div>
              <button className="text-xs underline" onClick={()=>location.reload()}>Làm lại</button>
            </div>

            <div className="mt-3 border border-slate-700 rounded-lg bg-slate-800/60" style={{ height: vh }}>
              <div className="h-full p-3 no-scrollbar">
                {provinces.map(p=>(
                  <NameChip key={p.id} province={p}
                    disabled={!!placed[p.id]}
                    onStart={(clientX, clientY)=> setDrag({ pid: p.id, fixed: { x: clientX-24, y: clientY-16 } })}
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* CHIP đang kéo (fixed) */}
      {drag?.fixed && (
        <FloatingChip
          pid={drag.pid}
          color={colorForId(drag.pid)}
          name={provinces.find(q=>q.id===drag.pid)?.name_vi || drag.pid}
          x={drag.fixed.x} y={drag.fixed.y}
          onMove={(cx,cy)=> setDrag(d=> d ? ({ ...d, fixed:{ x:cx-24, y:cy-16 } }) : d)}
          onUp={(cx,cy)=>{ onTryDrop(drag.pid, cx, cy); setDrag(null); }}
          onCancel={()=> setDrag(null)}
        />
      )}

      {/* TOAST feedback đúng/sai (cố định, không scale) */}
      {feedback && (
        <div
          style={{
            position:'fixed',
            top: 14, left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 2147483000,
            padding: '6px 10px',
            borderRadius: 8,
            color: '#fff',
            background: feedback==='ok' ? 'rgba(5,150,105,.95)' : 'rgba(244,63,94,.95)',
            boxShadow: '0 2px 8px rgba(0,0,0,.35)'
          }}
        >
          {feedback==='ok' ? '✓ Đúng rồi!' : '✗ Chưa đúng, thử lại nhé!'}
        </div>
      )}

      {/* POPUP thắng cuộc */}
      {showWin && (
        <WinDialog
          ms={ms}
          onSave={(name)=>{
            const list = pushLB(LB_KEY, { name: name || 'Ẩn danh', ms });
            alert(`Đã lưu! Top 1: ${list[0].name} – ${(list[0].ms/1000).toFixed(1)}s`);
          }}
          onClose={()=> setShowWin(false)}
        />
      )}
    </div>
  );
}

/* ---------- Components ---------- */
function NameChip({ province, disabled, onStart }:{
  province: Province; disabled: boolean; onStart: (cx:number, cy:number)=>void;
}){
  const color = colorForId(province.id);
  function onPointerDown(e:React.PointerEvent){
    if (disabled) return;
    onStart(e.clientX, e.clientY); // không setPointerCapture để vẫn wheel scroll
  }
  return (
    <div
      onPointerDown={onPointerDown}
      className={`px-2 py-1 rounded border text-sm select-none mb-2 cursor-grab text-slate-900 ${disabled?'opacity-40 line-through pointer-events-none':''}`}
      style={{ background: color.chipBg, borderColor: color.chipBd }}
      title={province.name_en}
    >
      {province.name_vi}
    </div>
  );
}

function FloatingChip({
  pid, name, color, x, y, onMove, onUp, onCancel
}:{
  pid: string; name: string; color: ReturnType<typeof colorForId>;
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
      <div className="px-2 py-1 rounded border text-sm shadow text-slate-900"
           style={{ background: color.chipBg, borderColor: color.chipBd }}>
        {name}
      </div>
    </div>
  );
}

function WinDialog({ ms, onSave, onClose }:{ ms:number; onSave:(name:string)=>void; onClose:()=>void }){
  const [name,setName]=useState("");
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white text-slate-900 rounded-2xl shadow-xl p-5 w-[min(92vw,420px)] anim-pop">
        <div className="text-center">
          <div className="text-3xl">🎉</div>
          <div className="mt-1 text-xl font-semibold">Xuất sắc!</div>
          <div className="text-slate-600 mt-1">Bạn đã ghép xong bản đồ cấp 1.</div>
          <div className="mt-3 text-sm text-slate-500">Thời gian: <b>{(ms/1000).toFixed(1)}s</b></div>
        </div>
        <div className="mt-4">
          <label className="text-sm text-slate-700">Tên bạn</label>
          <input className="mt-1 w-full border rounded px-3 py-2 text-sm"
                 placeholder="Nhập tên để lưu BXH" value={name} onChange={e=>setName(e.target.value)} />
        </div>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button className="px-3 py-1.5 text-sm rounded border" onClick={onClose}>Đóng</button>
          <button className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white"
                  onClick={()=>{ onSave(name); onClose(); }}>
            Lưu BXH
          </button>
        </div>
      </div>
    </div>
  );
}
