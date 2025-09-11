import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Bundle, Province } from "../types";
import { dist, within } from "../core/math";
import { useTimer } from "../core/useTimer";
import { pushLB } from "../core/leaderboard";
import { useSfx } from "../core/useSfx";
import { useAtlasPaths } from "../core/useAtlas";
import { viewBoxNearAnchorSmart } from "../core/svg";

/* =============== Helpers: màu, random, scale, fallback SVG =============== */
function hash32(s: string) { let h = 2166136261>>>0; for (let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619);} return h>>>0; }
function colorForId(id: string, seed:number){
  const h = (hash32(id) ^ seed) % 360;
  return {
    fill: `hsl(${h} 75% 60%)`,
    stroke: `hsl(${h} 55% 35%)`,
    overlay: `hsl(${h} 70% 50% / .25)`,
    overlayStroke: `hsl(${h} 70% 35% / .85)`
  };
}
function mulberry32(a:number){return function(){let t=(a+=0x6D2B79F5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),61);return((t^(t>>>14))>>>0)/4294967296;}}
function shuffleSeeded<T>(arr:T[], seed:number){const rnd=mulberry32(seed);for(let i=arr.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
function getSeedFromURLorLS(key='seed:l2'){const qs=new URLSearchParams(window.location.search||'');const q=qs.get('seed');if(q&&/^\d+$/.test(q))return Number(q)>>>0;const s=localStorage.getItem(key);if(s)return Number(s)>>>0;const r=(crypto.getRandomValues(new Uint32Array(1))[0])>>>0;localStorage.setItem(key,String(r));return r;}
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

// Fallback loader cho SVG tỉnh rời
type SvgEntry = { d: string };
const svgCache = new Map<string, SvgEntry>();
function parseProvinceSvg(txt: string): SvgEntry {
  const re = /<path[^>]*\sd=(?:"([^"]+)"|'([^']+)')[^>]*>/gi;
  let m: RegExpExecArray | null, ds: string[] = [];
  while ((m = re.exec(txt))) ds.push(m[1] || m[2] || '');
  return { d: ds.join(' ') };
}
async function loadProvinceSvg(url: string): Promise<SvgEntry> {
  const key = url.replace(/\\/g,'/').replace(/^([^/])/, '/$1');
  if (svgCache.has(key)) return svgCache.get(key)!;
  const res = await fetch(key);
  if (!res.ok) throw new Error(`Cannot load ${key}`);
  const txt = await res.text();
  const entry = parseProvinceSvg(txt);
  svgCache.set(key, entry);
  return entry;
}
function getCachedProvinceD(url: string): string | undefined {
  const key = url.replace(/\\/g,'/').replace(/^([^/])/, '/$1');
  return svgCache.get(key)?.d;
}
/* ======================================================================== */

const LB_KEY = 'lb:pack1:level2';
const PANEL_W = 340;
const GAP = 16;

export default function Level2({bundle}:{bundle:Bundle}){
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [activePid, setActivePid] = useState<string|null>(null);
  const done = Object.keys(placed).length === bundle.provinces.length;
  const { ms } = useTimer(!done);
  const [name, setName] = useState("");
  const { playCorrect, playWrong, playWin } = useSfx();
  const [shake, setShake] = useState(false);

  const atlasPaths = useAtlasPaths("/assets/atlas.svg");
  const boardRef = useRef<HTMLDivElement>(null);
  const [vx, vy, vw, vh] = bundle.viewBox;

  // stage fit màn hình (không scroll dọc trang)
  const stageW = vw + GAP + PANEL_W;
  const stageH = vh;
  const scale  = useStageScale(stageW, stageH, 24);

  // random thứ tự + màu
  const [seed, setSeed] = useState(getSeedFromURLorLS());
  const order = useMemo(() => shuffleSeeded([...bundle.provinces], seed), [bundle, seed]);
  const colorsById = useMemo(
    () => Object.fromEntries(order.map(p => [p.id, colorForId(p.id, seed)])),
    [order, seed]
  );

  function tryDrop(pid:string, cx:number, cy:number){
    const el = boardRef.current!;
    const r = el.getBoundingClientRect();
    const x = (cx - r.left), y = (cy - r.top);
    const p = bundle.provinces.find(q=>q.id===pid)!;
    const ax = Math.min(Math.max(p.anchor_px[0], 0), vw);
    const ay = Math.min(Math.max(p.anchor_px[1], 0), vh);
    const tol = Math.max(p.snap_tolerance_px || 18, 36);
    const ok = within(dist(x,y, ax, ay), tol);

    if (ok) { setPlaced(s=>({...s,[pid]:true})); playCorrect(); }
    else { setShake(true); setTimeout(()=>setShake(false), 480); if (navigator.vibrate) navigator.vibrate(50); playWrong(); }
    return ok;
  }

  useEffect(()=>{ if (done) { playWin(); } }, [done, playWin]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-900 text-slate-100">
      <div
        className="absolute"
        style={{
          left: '50%', top: '50%',
          width: stageW, height: stageH,
          transform: `translate(-50%,-50%) scale(${scale})`,
          transformOrigin: 'center center'
        }}
      >
        <div className="grid gap-4" style={{ display:'grid', gridTemplateColumns: `${vw}px ${PANEL_W}px` }}>
          {/* Board */}
          <div className={`relative ${shake?'anim-shake':''}`} style={{width:vw, height:vh}}>
            {/* nền tối giúp board trắng nổi bật */}
            <img src="/assets/board_blank_outline.svg" width={vw} height={vh}
                //  className="select-none pointer-events-none rounded-lg border border-slate-700 bg-white"/>
                className="select-none pointer-events-none rounded-lg border border-slate-700 shadow-sm"/>


            {/* Silhouette các tỉnh đã đặt (atlas hoặc fallback) */}
            <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${vw} ${vh}`}>
              {bundle.provinces.map(p=>{
                if (!placed[p.id]) return null;
                const d = atlasPaths[p.id] || getCachedProvinceD(p.svg_path_file.startsWith('/')?p.svg_path_file:('/'+p.svg_path_file));
                if (!d) return null;
                const c = colorsById[p.id];
                return <path key={p.id} d={d} fill={c.overlay} stroke={c.overlayStroke} strokeWidth={1} />;
              })}
            </svg>

            {/* Aim circle */}
            <div ref={boardRef} className="absolute inset-0">
              {activePid && (() => {
                const p = bundle.provinces.find(q=>q.id===activePid)!;
                const tol = Math.max(p.snap_tolerance_px || 18, 36);
                return <div className="aim" style={{ left:p.anchor_px[0]-tol, top:p.anchor_px[1]-tol, width:tol*2, height:tol*2 }}/>;
              })()}
            </div>
          </div>

          {/* Panel mảnh – ẩn scrollbar (vẫn cuộn được) */}
          <aside className="relative w-[340px]">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-300">Thời gian: <b>{(ms/1000).toFixed(1)}s</b></div>
              <div className="flex items-center gap-2">
                <button className="text-xs underline" onClick={()=>location.reload()}>Làm lại</button>
                <button className="text-[11px] px-2 py-1 rounded border"
                        onClick={()=>{ setPlaced({}); const next=(crypto.getRandomValues(new Uint32Array(1))[0])>>>0; localStorage.setItem('seed:l2', String(next)); setSeed(next); }}>
                  Đổi thứ tự
                </button>
              </div>
            </div>

            <div className="mt-3 relative border border-slate-700 rounded-lg bg-slate-800/60" style={{ height: vh }}>
              <div className="h-full p-3 no-scrollbar">
                {order.map((p,i)=>(
                  <Piece key={p.id} p={p}
                    defaultPos={{ x: 40 + (i%2)*140, y: 30 + Math.floor(i/2)*60 }}
                    locked={!!placed[p.id]}
                    onDrop={(x,y)=> tryDrop(p.id, x,y)}
                    onDragState={s=> setActivePid(s ? p.id : null)}
                    d={atlasPaths[p.id] || ""}
                    color={colorForId(p.id, seed)}
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Piece (có fallback SVG rời) ---------------- */
function Piece({
  p, defaultPos, locked, onDrop, onDragState, d, color
}:{
  p:Province; defaultPos:{x:number;y:number}; locked:boolean;
  onDrop:(clientX:number, clientY:number)=>boolean; onDragState:(dragging:boolean)=>void;
  d:string; color:{fill:string; stroke:string};
}){
  const [pos, setPos] = useState(defaultPos);
  const [fixedPos, setFixedPos] = useState<{x:number;y:number}|null>(null);
  const [pathD, setPathD] = useState<string>(d);

  // nếu atlas không có -> fallback tải SVG tỉnh
  useEffect(()=>{
    if (d) { setPathD(d); return; }
    const url = p.svg_path_file.startsWith('/') ? p.svg_path_file : '/'+p.svg_path_file;
    const cached = getCachedProvinceD(url);
    if (cached) { setPathD(cached); return; }
    loadProvinceSvg(url).then(ent=> setPathD(ent.d)).catch(()=> setPathD(""));
  }, [d, p.svg_path_file]);

  useEffect(()=>{ if (locked){ setFixedPos(null); onDragState(false); } }, [locked, onDragState]);
  if (locked) return null;

  function onPointerDown(e:React.PointerEvent){
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    onDragState(true);
    setFixedPos({ x: e.clientX - dx, y: e.clientY - dy });
    el.setPointerCapture(e.pointerId);

    function move(ev:PointerEvent){ setFixedPos({ x: ev.clientX - dx, y: ev.clientY - dy }); }
    function up(ev:PointerEvent){
      try { el.releasePointerCapture(e.pointerId); } catch {}
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const ok = onDrop(ev.clientX, ev.clientY);
      if (!ok) setFixedPos(null);
      onDragState(false);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once:true });
  }

  const vb = pathD
    ? viewBoxNearAnchorSmart(pathD, p.anchor_px[0], p.anchor_px[1], 6, 600, 220)
    : { x:0, y:0, w:100, h:100 };

  const icon = pathD
    ? <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width={48} height={48} preserveAspectRatio="xMidYMid meet">
        <path d={pathD} fill={color.fill} stroke={color.stroke} strokeWidth={1.2}/>
      </svg>
    : <div className="w-12 h-12 rounded bg-slate-600 animate-pulse" />;

  return fixedPos ? (
    <div className="fixed z-50 select-none" style={{ left:fixedPos.x, top:fixedPos.y, width:48, height:48, cursor:'grabbing' }} onPointerDown={onPointerDown} title={p.name_vi}>
      {icon}
    </div>
  ) : (
    <div className="absolute select-none" style={{ left:pos.x, top:pos.y, width:48, height:48, cursor:'grab' }} onPointerDown={onPointerDown} title={p.name_vi}>
      {icon}
    </div>
  );
}
