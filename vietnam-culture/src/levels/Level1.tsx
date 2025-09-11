import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Bundle, Province } from "../types";
import { dist, within } from "../core/math";
import { useTimer } from "../core/useTimer";
import { pushLB } from "../core/leaderboard";
import { useSfx } from "../core/useSfx";
import { useAtlasPaths } from "../core/useAtlas";

/* ================= Helpers: màu, random, scale stage ================= */
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
/* ===================================================================== */

const LB_KEY = 'lb:pack1:level1';

export default function Level1({ bundle }: { bundle: Bundle }) {
  const atlasPaths = useAtlasPaths("/assets/atlas.svg");
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<{ pid: string; fixed?: {x:number;y:number} }|null>(null);
  const [name, setName] = useState("");
  const [showWin, setShowWin] = useState(false);

  const { ms } = useTimer(Object.keys(placed).length !== bundle.provinces.length);
  const { playCorrect, playWrong, playWin } = useSfx();

  const boardRef = useRef<HTMLDivElement>(null);
  const [vx, vy, vw, vh] = bundle.viewBox;
  const [shake, setShake] = useState(false);
  const [feedback, setFeedback] = useState<null | 'ok' | 'bad'>(null);

  /* —— Random tên tỉnh —— */
  const [seed] = useState(seedFromURLorLS());
  const provinces = useMemo(()=> shuffleSeeded([...bundle.provinces], seed), [bundle, seed]);

  /* —— Stage fit màn hình (không có scroll dọc trang) —— */
  const panelW = 340, gap = 16;
  const stageW = vw + gap + panelW;
  const stageH = vh;
  const scale  = useStageScale(stageW, stageH, 24);

  useEffect(()=>{ if (Object.keys(placed).length === provinces.length) { setShowWin(true); playWin(); } }, [placed, provinces.length, playWin]);

  function onTryDrop(pid: string, clientX:number, clientY:number) {
    const r = boardRef.current!.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
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
    return ok;

  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-900 text-slate-100">
      
      {/* HUD cố định – luôn thấy thời gian */}
      <div className="fixed top-3 left-3 z-40 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/70 text-slate-100 shadow">
        <span className="text-sm">
          Thời gian: <b>{(ms/1000).toFixed(1)}s</b>
          {" • "}Đã đặt: <b>{Object.keys(placed).length}/{bundle.provinces.length}</b>
        </span>
      </div>
      {/* Stage center + scale */}
      <div
        className="absolute"
        style={{
          left: '50%', top: '50%',
          width: stageW, height: stageH,
          transform: `translate(-50%,-50%) scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        <div className="grid gap-4" style={{ display:'grid', gridTemplateColumns: `${vw}px ${panelW}px` }}>
          {/* BOARD */}
          <div className={`relative ${shake ? 'anim-shake' : ''}`} style={{ width: vw, height: vh }}>
            <img src="/assets/board_with_borders.svg" width={vw} height={vh}
                //  className="select-none pointer-events-none rounded-lg border border-slate-700 bg-white"/>
                className="select-none pointer-events-none rounded-lg border border-slate-700 shadow-sm"/>


            {/* Fill tỉnh đã đúng (màu) */}
            <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${vw} ${vh}`}>
              {bundle.provinces.map(p=>{
                if (!placed[p.id]) return null;
                const d = atlasPaths[p.id]; if (!d) return null;
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
              {/* aim circle */}
              {drag?.pid && (() => {
                const p = provinces.find(q=>q.id===drag.pid)!;
                const tol = Math.max(p.snap_tolerance_px || 18, 28);
                return (
                  <div className="aim" style={{ left: p.anchor_px[0]-tol, top: p.anchor_px[1]-tol, width: tol*2, height: tol*2 }}/>
                );
              })()}
            </div>
          </div>

          {/* SIDEBAR (ẩn scrollbar, vẫn cuộn) */}
          <aside className="relative w-[340px]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">Thời gian: <b>{(ms/1000).toFixed(1)}s</b></div>
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

      {/* FLOATING CHIP (position:fixed) */}
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

      {/* POPUP thắng cuộc */}
      {showWin && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white text-slate-900 rounded-2xl shadow-xl p-5 w-[min(92vw,420px)] anim-pop">
            <div className="text-center">
              <div className="text-3xl">🎉</div>
              <div className="mt-1 text-xl font-semibold">Xuất sắc!</div>
              <div className="text-slate-600 mt-1">Bạn đã ghép xong bản đồ cấp 1.</div>
              <div className="mt-3 text-sm text-slate-500">Thời gian: <b>{(ms/1000).toFixed(1)}s</b></div>
            </div>
            <SaveBox lbKey={LB_KEY} ms={ms} onClose={()=>{ setShowWin(false); }} />
          </div>
        </div>
      )}
      {feedback && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-40 px-3 py-1.5 rounded-md shadow text-sm font-medium anim-pop
                        ${feedback==='ok' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          {feedback==='ok' ? '✓ Đúng rồi!' : '✗ Chưa đúng, thử lại nhé!'}
        </div>
      )}

    </div>
  );
}

/* ---------------- Components ---------------- */
function NameChip({ province, disabled, onStart }:{
  province: Province; disabled: boolean; onStart: (cx:number, cy:number)=>void;
}){
  const color = colorForId(province.id);
  function onPointerDown(e:React.PointerEvent){
    if (disabled) return;
    onStart(e.clientX, e.clientY); // không setPointerCapture để vẫn wheel scroll tự nhiên
  }
  return (
    <div
      onPointerDown={onPointerDown}
      className={`px-2 py-1 rounded border text-sm select-none mb-2 cursor-grab ${disabled?'opacity-40 line-through pointer-events-none':''} text-slate-900`}
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

function SaveBox({ lbKey, ms, onClose }:{ lbKey:string; ms:number; onClose:()=>void }){
  const [name,setName]=useState("");
  return (
    <div className="mt-4">
      <label className="text-sm text-slate-700">Tên bạn</label>
      <input className="mt-1 w-full border rounded px-3 py-2 text-sm"
             placeholder="Nhập tên để lưu BXH" value={name} onChange={e=>setName(e.target.value)} />
      <div className="mt-4 flex items-center justify-end gap-2">
        <button className="px-3 py-1.5 text-sm rounded border" onClick={onClose}>Đóng</button>
        <button className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white"
                onClick={()=>{ const list = pushLB(lbKey, { name: name || 'Ẩn danh', ms }); onClose(); alert(`Đã lưu! Top 1: ${list[0].name} – ${(list[0].ms/1000).toFixed(1)}s`); }}>
          Lưu BXH
        </button>
      </div>
    </div>
  );
}
