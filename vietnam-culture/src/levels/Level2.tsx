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

/* ========= SVG rời: đọc path + viewBox ========= */
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

/* ========= đo bbox để zoom mảnh trong ô ========= */
type BBox = { x:number; y:number; width:number; height:number };
let measureSvg: SVGSVGElement | null = null;
function ensureMeasureSvg(){
  if (!measureSvg){
    measureSvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
    measureSvg.setAttribute('viewBox','0 0 10 10');
    measureSvg.style.position='absolute';
    measureSvg.style.left='-10000px';
    measureSvg.style.top='-10000px';
    document.body.appendChild(measureSvg);
  }
}
const bboxCache = new Map<string, BBox>();
function getBBoxForPath(key: string, d: string): BBox {
  if (bboxCache.has(key)) return bboxCache.get(key)!;
  ensureMeasureSvg();
  const path = document.createElementNS('http://www.w3.org/2000/svg','path');
  path.setAttribute('d', d);
  measureSvg!.appendChild(path);
  const b = path.getBBox();
  measureSvg!.removeChild(path);
  const bb = { x:b.x, y:b.y, width:b.width, height:b.height };
  bboxCache.set(key, bb);
  return bb;
}
function expandBBox(bb: BBox, padRatio=0.08): BBox {
  const pad = Math.max(bb.width, bb.height) * padRatio;
  return { x: bb.x - pad, y: bb.y - pad, width: bb.width + pad*2, height: bb.height + pad*2 };
}

/* ========= leaderboard ========= */
type LBItem = { name: string; ms: number; ts?: number };
function readLB(lbKey: string): LBItem[] { try { return JSON.parse(localStorage.getItem(lbKey) || "[]"); } catch { return []; } }

/* ========= main ========= */
const LB_KEY = 'lb:pack1:level2';
const PANEL_W = 360;

export default function Level2({ bundle }: { bundle: Bundle }) {
  const atlasPaths = useAtlasPaths("/assets/atlas.svg"); // nếu không có atlas => rỗng

  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<{ pid: string; pos?: {x:number;y:number} }|null>(null);
  const [showWin, setShowWin] = useState(false);
  const [feedback, setFeedback] = useState<null | 'ok' | 'bad'>(null);
  const [shake, setShake] = useState(false);

  const [seed, setSeed] = useState(()=> (crypto.getRandomValues(new Uint32Array(1))[0])>>>0);

  const boardRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const doneOnceRef = useRef(false);
  const [vx, vy, vw, vh] = bundle.viewBox;

  // responsive: tính cols & tile từ bề rộng panel
  const [panelWState, setPanelWState] = useState(PANEL_W);
  const GAP = 12;       // gap giữa các ô
  const PADX = 24;      // padding ngang trong khối list (p-3)
  const cols = useMemo(()=>{
    // thử 3 cột nếu đủ chỗ, không thì 2 cột
    const inner = Math.max(0, panelWState - PADX);
    const minTile = 108; // mong muốn tối thiểu
    const can3 = Math.floor((inner + GAP) / (minTile + GAP)) >= 3;
    return can3 ? 3 : 2;
  }, [panelWState]);
  const tile = useMemo(()=>{
    const inner = Math.max(0, panelWState - PADX);
    return Math.max(96, Math.floor((inner - (cols-1)*GAP) / cols));
  }, [panelWState, cols]);

  useEffect(()=>{
    const recalc = ()=> setPanelWState(panelRef.current?.clientWidth || PANEL_W);
    recalc();
    window.addEventListener('resize', recalc);
    return ()=> window.removeEventListener('resize', recalc);
  },[]);

  // random danh sách mảnh
  const pieces = useMemo(()=> shuffleSeeded([...bundle.provinces], seed), [bundle, seed]);

  // Stage fit
  const stageW = vw + 16 + PANEL_W;
  const stageH = vh;
  const stageScale = useStageScale(stageW, stageH, 24);

  // timer
  const solved = Object.keys(placed).length;
  const total = bundle?.provinces?.length ?? 0;
  const ready = total > 0;
  const { ms } = useTimer(solved < total);

  const { playCorrect, playWrong, playWin } = useSfx();

  // preload SVG rời (khi không có atlas)
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

  // mở popup đúng lúc (1 lần)
  useEffect(()=>{
    if (!ready) return;
    const done = solved >= total;
    if (done && !doneOnceRef.current) {
      doneOnceRef.current = true;
      setShowWin(true);
      playWin();
    }
  }, [ready, solved, total, playWin]);

  // dọn DOM đo bbox khi unmount (an tâm vụ click menu)
  useEffect(()=>()=>{
    if (measureSvg && measureSvg.parentNode) {
      measureSvg.parentNode.removeChild(measureSvg);
      measureSvg = null;
    }
  },[]);

  function resetGame(){
    setPlaced({});
    setShowWin(false);
    doneOnceRef.current = false;
    setSeed((crypto.getRandomValues(new Uint32Array(1))[0])>>>0);
  }

  // snap: quy đổi client -> viewBox
  function tryDrop(pid: string, clientX:number, clientY:number) {
    const rect = boardRef.current!.getBoundingClientRect();
    const sx = rect.width  / vw;
    const sy = rect.height / vh;
    const x = (clientX - rect.left) / sx;
    const y = (clientY - rect.top)  / sy;

    const p = bundle.provinces.find(q=>q.id===pid)!;
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
    return ok;
  }

  function pathForFill(p: Province): string {
    const dAtlas = atlasPaths[p.id];
    if (dAtlas) return dAtlas;
    const meta = extraMeta[p.id];
    if (!meta) return "";
    if (isBoardAligned(meta.vb, vw, vh)) return meta.d; // chỉ fill khi trùng viewBox
    return "";
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-900 text-slate-100">
      {/* HUD qua portal – chuyển về góc phải để tránh đè nút Back/Menu */}
      {createPortal(
        <div
          style={{
            position: 'fixed', top: 12, right: 12, zIndex: 2147483647,
            background: 'rgba(30,41,59,.88)', color: '#fff',
            border: '1px solid rgba(51,65,85,.9)', borderRadius: 8,
            padding: '6px 10px', boxShadow: '0 2px 8px rgba(0,0,0,.35)',
            display:'flex', alignItems:'center', gap:10
          }}
        >
          <span style={{ fontSize: 14 }}>
            Thời gian: <b>{(ms/1000).toFixed(1)}s</b>
            {' • '}Đã đặt: <b>{solved}/{total}</b>
          </span>
          <button
            onClick={resetGame}
            style={{ pointerEvents:'auto', fontSize:12, padding:'4px 8px',
              borderRadius:6, border:'1px solid #475569',
              background:'#334155', color:'#fff', cursor:'pointer' }}
            title="Làm lại (random mảnh mới)"
          >↻</button>
        </div>,
        document.body
      )}

      {/* Stage */}
      <div
        className="absolute"
        style={{
          left: '50%', top: '50%',
          width: vw + 16 + PANEL_W, height: vh,
          transform: `translate(-50%,-50%) scale(${stageScale})`,
          transformOrigin: 'center center'
        }}
      >
        <div className="grid gap-4" style={{ display:'grid', gridTemplateColumns: `${vw}px ${PANEL_W}px` }}>
          {/* BOARD */}
          <div className={`relative ${shake ? 'anim-shake' : ''}`} style={{ width: vw, height: vh }}>
            <img
              src="/assets/board_blank_outline.svg"
              width={vw} height={vh}
              className="select-none pointer-events-none rounded-lg border border-slate-700 shadow-sm"
              alt="Vietnam blank board"
            />

            {/* Fill mảnh đã đặt */}
            <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${vw} ${vh}`} style={{ zIndex: 5 }}>
              {bundle.provinces.map(p=>{
                if (!placed[p.id]) return null;
                const d = pathForFill(p); if (!d) return null;
                const c = colorForId(p.id);
                return <path key={p.id} d={d} fill={c.fill} stroke={c.stroke} strokeWidth={1}/>;
              })}
            </svg>

            <div ref={boardRef} className="absolute inset-0">
              {drag?.pid && (() => {
                const p = bundle.provinces.find(q=>q.id===drag.pid)!;
                const tol = Math.max(p.snap_tolerance_px || 18, 28);
                return <div className="aim" style={{ left: p.anchor_px[0]-tol, top: p.anchor_px[1]-tol, width: tol*2, height: tol*2 }}/>;
              })()}
            </div>
          </div>

          {/* PANEL mảnh: ô vuông responsive 2–3 cột, đều nhau */}
          <aside ref={panelRef} className="relative w-[360px]">
            <div className="sticky top-0 z-20 flex items-center justify-between px-2 py-2 rounded-t-lg bg-slate-800/90 backdrop-blur border-b border-slate-700">
              <div className="text-sm text-slate-200">Thời gian: <b>{(ms/1000).toFixed(1)}s</b></div>
              <button
                className="text-xs px-2 py-1 rounded border border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600"
                onClick={resetGame}
              >
                Làm lại
              </button>
            </div>

            <div className="mt-3 border border-slate-700 rounded-lg bg-slate-800/60" style={{ height: vh }}>
              <div className="h-full p-3 no-scrollbar">
                <div
                  className="grid"
                  style={{
                    gridTemplateColumns: `repeat(${cols}, 1fr)`,
                    gap: GAP,
                  }}
                >
                  {pieces.map(p => (
                    <PieceTile
                      key={p.id}
                      pid={p.id}
                      province={p}
                      atlasD={atlasPaths[p.id]}
                      extraMeta={extraMeta[p.id]}
                      disabled={!!placed[p.id]}
                      tile={tile}
                      onStart={(cx, cy) => setDrag({ pid: p.id, pos: { x: cx - tile / 2, y: cy - tile / 2 } })}
                    />
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mảnh đang kéo – bám đúng tâm con trỏ, phóng to theo bbox */}
      {drag?.pos && (
        <FloatingPiece
          pid={drag.pid}
          name={bundle.provinces.find(q=>q.id===drag.pid)?.name_vi || drag.pid}
          atlasD={atlasPaths[drag.pid]}
          extraMeta={extraMeta[drag.pid]}
          x={drag.pos.x} y={drag.pos.y}
          tile={tile}
          onMove={(cx,cy)=> setDrag(d=> d ? ({ ...d, pos:{ x:cx - tile/2, y:cy - tile/2 } }) : d)}
          onUp={(cx,cy)=>{ tryDrop(drag.pid, cx, cy); setDrag(null); }}
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

      {/* POPUP thắng cuộc */}
      {showWin && (
        <WinDialog
          lbKey={'lb:pack1:level2'}
          ms={ms}
          onClose={()=> setShowWin(false)}
        />
      )}
    </div>
  );
}

/* ===== components ===== */

function PieceTile({
  pid, province, atlasD, extraMeta, disabled, tile, onStart
}:{
  pid: string;
  province: Province;
  atlasD?: string;
  extraMeta?: SvgMeta;
  disabled: boolean;
  tile: number;
  onStart: (cx:number, cy:number)=>void;
}){
  const d = atlasD || extraMeta?.d || "";
  const color = colorForId(province.id);

  function handlePointerDown(e:React.PointerEvent){
    if (disabled || !d) return;
    onStart(e.clientX, e.clientY);
  }

  const vbBBox = useMemo(()=>{
    if (!d) return null;
    const bb = getBBoxForPath(pid, d);
    return expandBBox(bb, 0.08);
  }, [pid, d]);

  return (
    <div
      onPointerDown={handlePointerDown}
      className={`rounded border cursor-grab bg-slate-900/50 grid place-items-center
                  ${disabled ? 'opacity-30 pointer-events-none' : ''}`}
      style={{ borderColor: color.chipBd, height: tile, minHeight: tile }}
      title={province.name_vi}
    >
      {d && vbBBox ? (
        <svg
          width={tile - 12}
          height={tile - 12}
          viewBox={`${vbBBox.x} ${vbBBox.y} ${vbBBox.width} ${vbBBox.height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <path d={d} fill={color.fill} stroke={color.stroke} strokeWidth={1} />
        </svg>
      ) : (
        <div className="text-xs text-slate-400">Không có SVG</div>
      )}
    </div>

  );
}

function FloatingPiece({
  pid, name, atlasD, extraMeta, x, y, tile, onMove, onUp, onCancel
}:{
  pid: string;
  name: string;
  atlasD?: string;
  extraMeta?: SvgMeta;
  x:number; y:number; tile:number;
  onMove:(cx:number,cy:number)=>void; onUp:(cx:number,cy:number)=>void; onCancel:()=>void;
}){
    useEffect(() => {
    function move(ev: PointerEvent) { onMove(ev.clientX, ev.clientY); }
    function up(ev: PointerEvent)  { cleanup(); onUp(ev.clientX, ev.clientY); }
    function cancel()              { cleanup(); onCancel(); }
    function vis() { if (document.hidden) cancel(); }
    function blur() { cancel(); }

    function cleanup() {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      window.removeEventListener('blur', blur);
      document.removeEventListener('visibilitychange', vis);
    }

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
    window.addEventListener('blur', blur);
    document.addEventListener('visibilitychange', vis);

    return () => cleanup();
  }, [onMove, onUp, onCancel]);


  const d = atlasD || extraMeta?.d || "";
  if (!d) return null;

  const vbBBox = (()=> {
    const bb = getBBoxForPath(`drag-${pid}`, d);
    return expandBBox(bb, 0.08);
  })();

  return (
    <div className="fixed z-[3000] select-none pointer-events-none" style={{ left:x, top:y }}>
      <svg
        width={tile}
        height={tile}
        viewBox={`${vbBBox.x} ${vbBBox.y} ${vbBBox.width} ${vbBBox.height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <path d={d} fill="rgba(148,163,184,.96)" stroke="#334155" strokeWidth={1} />
      </svg>

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
          <div className="text-slate-600 mt-1">Bạn đã ghép xong bản đồ cấp 2.</div>
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
