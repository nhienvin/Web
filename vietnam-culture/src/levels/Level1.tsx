// src/levels/Level1.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Bundle, Province } from "../types";
import { dist, within } from "../core/math";
import { useTimer } from "../core/useTimer";
import { pushLB } from "../core/leaderboard";
import { useSfx } from "../core/useSfx";

/* ---------- helpers: màu + rng + confetti ---------- */
function hash32(s: string) { let h = 2166136261 >>> 0; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h,16777619); } return h>>>0; }
function colorForId(id: string) {
  const h = hash32(id) % 360;
  return {
    fill: `hsl(${h} 75% 62%)`,
    stroke: `hsl(${h} 55% 30%)`,
    chipBg: `hsl(${h} 90% 94%)`,
    chipBd: `hsl(${h} 70% 70%)`
  };
}

function Confetti({ runMs=2400 }: { runMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cvs = ref.current!; const ctx = cvs.getContext('2d')!;
    let w = cvs.width = window.innerWidth, h = cvs.height = window.innerHeight;
    const onResize = () => { w=cvs.width=window.innerWidth; h=cvs.height=window.innerHeight; };
    window.addEventListener('resize', onResize);
    const N = 160; const parts = Array.from({length:N}, ()=>({
      x: Math.random()*w, y: -20 - Math.random()*h*0.3,
      vx: -1 + Math.random()*2, vy: 2 + Math.random()*3,
      s: 4 + Math.random()*3, r: Math.random()*Math.PI, dr: -0.2+Math.random()*0.4,
      c: `hsl(${Math.floor(Math.random()*360)} 90% 60%)`
    }));
    let raf=0; function tick(){ ctx.clearRect(0,0,w,h);
      for(const p of parts){ p.x+=p.vx; p.y+=p.vy; p.r+=p.dr;
        if(p.y>h+20){ p.y=-10; p.x=Math.random()*w; }
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
        ctx.fillStyle=p.c; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s); ctx.restore();
      } raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    const stop=setTimeout(()=>cancelAnimationFrame(raf), runMs);
    return ()=>{ cancelAnimationFrame(raf); clearTimeout(stop); window.removeEventListener('resize', onResize); };
  }, [runMs]);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none" />;
}

/* ---------- main ---------- */
const BOARD_KEY = 'lb:pack1:level1';

export default function Level1({ bundle }: { bundle: Bundle }) {
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<{ pid: string; fixed?: {x:number;y:number} }|null>(null);
  const [name, setName] = useState("");
  const [showWin, setShowWin] = useState(false);
  const [shake, setShake] = useState(false);
  const { ms } = useTimer(Object.keys(placed).length !== bundle.provinces.length);
  const { playCorrect, playWrong, playWin } = useSfx();

  const boardRef = useRef<HTMLDivElement>(null);
  const [vx, vy, vw, vh] = bundle.viewBox;

  const provinces = useMemo(()=> [...bundle.provinces], [bundle]); // có thể shuffle nếu muốn

  useEffect(()=>{ if (Object.keys(placed).length === provinces.length) { setShowWin(true); playWin(); } }, [placed, provinces.length, playWin]);

  function onTryDrop(pid: string, clientX:number, clientY:number) {
    const r = boardRef.current!.getBoundingClientRect();
    const x = clientX - r.left, y = clientY - r.top;
    const p = provinces.find(q=>q.id===pid)!;
    const ax = Math.min(Math.max(p.anchor_px[0], 0), vw);
    const ay = Math.min(Math.max(p.anchor_px[1], 0), vh);
    const tol = Math.max(p.snap_tolerance_px || 18, 28); // hơi nới cho dễ
    const ok = within(dist(x,y, ax,ay), tol);

    if (ok) {
      setPlaced(s=>({ ...s, [pid]: true }));
      playCorrect();
    } else {
      setShake(true); setTimeout(() => setShake(false), 480);
      if (navigator.vibrate) navigator.vibrate(40);
      playWrong();
    }
    return ok;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 grid gap-4"
         style={{ display:'grid', gridTemplateColumns: `${vw}px 340px`, maxWidth: vw+340+48 }}>
      {/* BOARD với ranh giới + điểm neo + vòng tròn aim */}
      <div  className={`relative ${shake ? "anim-shake" : ""}`} style={{ width: vw, height: vh }}>
        <img src="/assets/board_with_borders.svg" width={vw} height={vh}
             className="select-none pointer-events-none rounded-lg border"/>

        <div ref={boardRef} className="absolute inset-0">
          {/* điểm neo + tick */}
          {bundle.provinces.map(p=>{
            const [x,y] = p.anchor_px;
            const ok = !!placed[p.id];
            return (
              <div key={p.id} className="absolute" style={{ left:x-4, top:y-4, width:8, height:8 }}>
                <div className={`w-2 h-2 rounded-full ${ok?'bg-emerald-600':'bg-slate-300'} opacity-70`} />
                {ok && (
                  <div className="absolute left-3 top-[-2px] tick-badge anim-pop">
                    ✓ {p.name_vi}
                  </div>
                )}
              </div>
            );
          })}
          {/* aim circle khi đang kéo một tỉnh */}
          {drag?.pid && (() => {
            const p = provinces.find(q=>q.id===drag.pid)!;
            const tol = Math.max(p.snap_tolerance_px || 18, 28);
            return (
              <div className="aim" style={{
                left: p.anchor_px[0]-tol, top: p.anchor_px[1]-tol,
                width: tol*2, height: tol*2
              }}/>
            );
          })()}
        </div>
      </div>

      {/* SIDEBAR: danh sách tên tỉnh (kéo bằng pointer – vẫn wheel scroll được) */}
      <aside className="relative w-[340px]">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Thời gian: <b>{(ms/1000).toFixed(1)}s</b></div>
          <button className="text-xs underline" onClick={()=>location.reload()}>Làm lại</button>
        </div>

        <div className="mt-3 border rounded-lg bg-white" style={{ height: vh }}>
          <div className="h-full overflow-y-auto p-3">
            {provinces.map(p=>(
              <NameChip
                key={p.id}
                province={p}
                disabled={!!placed[p.id]}
                onStart={(clientX, clientY)=>{
                  setDrag({ pid: p.id, fixed: { x: clientX-24, y: clientY-16 } });
                }}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* FLOATING CHIP đang kéo (position:fixed) – cho phép wheel scroll tự nhiên */}
      {drag?.fixed && (
        <FloatingChip
          pid={drag.pid}
          color={colorForId(drag.pid)}
          name={provinces.find(q=>q.id===drag.pid)?.name_vi || drag.pid}
          x={drag.fixed.x}
          y={drag.fixed.y}
          onMove={(cx,cy)=> setDrag(d=> d ? ({ ...d, fixed:{ x:cx-24, y:cy-16 } }) : d)}
          onUp={(cx,cy)=>{
            const ok = onTryDrop(drag.pid, cx, cy);
            setDrag(null);
          }}
          onCancel={()=> setDrag(null)}
        />
      )}

      {/* POPUP thắng cuộc */}
      {showWin && (
        <>
          <Confetti runMs={2600}/>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-5 w-[min(92vw,420px)] anim-pop">
              <div className="text-center">
                <div className="text-3xl">🎉</div>
                <div className="mt-1 text-xl font-semibold">Xuất sắc!</div>
                <div className="text-slate-600 mt-1">Bạn đã ghép xong bản đồ cấp 1.</div>
                <div className="mt-3 text-sm text-slate-500">Thời gian: <b>{(ms/1000).toFixed(1)}s</b></div>
              </div>
              <div className="mt-4">
                <label className="text-sm text-slate-700">Tên bạn</label>
                <input className="mt-1 w-full border rounded px-3 py-2 text-sm"
                       placeholder="Nhập tên để lưu BXH"
                       value={name} onChange={e=>setName(e.target.value)} />
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 text-sm rounded border" onClick={()=> setShowWin(false)}>Đóng</button>
                <button className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white"
                        onClick={()=>{
                          const list = pushLB(BOARD_KEY, { name: name || 'Ẩn danh', ms });
                          setShowWin(false);
                          alert(`Đã lưu! Top 1: ${list[0].name} – ${(list[0].ms/1000).toFixed(1)}s`);
                        }}>
                  Lưu BXH
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- components ---------- */
function NameChip({ province, disabled, onStart }:{
  province: Province;
  disabled: boolean;
  onStart: (clientX:number, clientY:number)=>void;
}){
  const color = colorForId(province.id);
  function onPointerDown(e:React.PointerEvent){
    if (disabled) return;
    // KHÔNG setPointerCapture để vẫn wheel scroll khi kéo
    onStart(e.clientX, e.clientY);
    // lắng nghe move/up ở window
    // (được xử ở FloatingChip để gọn)
  }
  return (
    <div
      onPointerDown={onPointerDown}
      className={`px-2 py-1 rounded border text-sm select-none mb-2 cursor-grab ${disabled?'opacity-40 line-through pointer-events-none':''}`}
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
  pid: string;
  name: string;
  color: ReturnType<typeof colorForId>;
  x: number; y: number;
  onMove: (cx:number,cy:number)=>void;
  onUp: (cx:number,cy:number)=>void;
  onCancel: ()=>void;
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
    <div className="fixed z-50 select-none pointer-events-none"
         style={{ left:x, top:y }}>
      <div className="px-2 py-1 rounded border text-sm shadow"
           style={{ background: color.chipBg, borderColor: color.chipBd }}>
        {name}
      </div>
    </div>
  );
}
