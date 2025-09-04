import { useEffect, useMemo, useRef, useState } from 'react';
import type { Bundle, Province } from '../types';
import { dist, within } from '../core/math';
import { useTimer } from '../core/useTimer';
import { pushLB } from '../core/leaderboard';
import { useAtlasPaths } from '../core/useAtlas';
import { viewBoxNearAnchorSmart } from '../core/svg';
import { useSfx } from '../core/useSfx';

const BOARD_W = 800, BOARD_H = 1400;
const LB_KEY = 'lb:pack1:level2';

function getDevFlag(): boolean {
  try {
    const w = window as any;
    const qs = new URLSearchParams(w.location.search);
    if (qs.get('dev') === '1') return true;
    // nếu dùng hash router: http://.../#/?dev=1
    const hash = String(w.location.hash || '');
    const hs = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
    if (hs.get('dev') === '1') return true;
    // bật tay qua localStorage
    return localStorage.getItem('dev') === '1';
  } catch { return false; }
}
const [dev, setDev] = useState(getDevFlag());

export default function Level2({bundle}:{bundle:Bundle}){
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [activePid, setActivePid] = useState<string|null>(null); // mảnh đang kéo
  const done = Object.keys(placed).length === bundle.provinces.length;
  const { ms } = useTimer(!done);
  const [name, setName] = useState("");
  const { playCorrect, playWrong } = useSfx();
  const [shake, setShake] = useState(false);
  const atlas = useAtlasPaths("/assets/atlas.svg");
  const boardRef = useRef<HTMLDivElement>(null);
  const startPositions = useMemo(()=>randomStartPositions(bundle.provinces), [bundle]);

  // snap thử tại toạ độ client
  function tryDrop(pid:string, cx:number, cy:number){
    const el = boardRef.current!;
    const r = el.getBoundingClientRect();
    const x = (cx - r.left), y = (cy - r.top);
    const p = bundle.provinces.find(q=>q.id===pid)!;

    const tol = Math.max(p.snap_tolerance_px || 18, 36);
    const ok = within(dist(x,y, p.anchor_px[0], p.anchor_px[1]), tol);

    if (ok) {
      setPlaced(s=>({...s,[pid]:true}));
      playCorrect();
    } else {
      setShake(true); setTimeout(()=>setShake(false), 480);
      if (navigator.vibrate) navigator.vibrate(50);
      playWrong();
    }
    return ok;
  }

  function onSave(){
    const list = pushLB(LB_KEY, { name: name || 'Ẩn danh', ms });
    alert(`Đã lưu! Top 1: ${list[0].name} – ${(list[0].ms/1000).toFixed(1)}s`);
  }

  // aim-assist circle (hiện khi đang kéo)
  const activeProvince = activePid ? bundle.provinces.find(p=>p.id===activePid) : null;
  const tol = activeProvince ? Math.max(activeProvince.snap_tolerance_px || 18, 36) : 0;

  return (
    <div className="max-w-6xl mx-auto p-4 grid grid-cols-[800px_340px] gap-4">
      {/* Board */}
      <div className={`relative ${shake?'anim-shake':''}`} style={{width:BOARD_W, height:BOARD_H}}>
        <img src="/assets/board_blank_outline.svg" width={BOARD_W} height={BOARD_H}
             className="select-none pointer-events-none rounded-lg border"/>
        <svg className="absolute inset-0 pointer-events-none" viewBox="0 0 800 1400">
          {Object.entries(placed).map(([pid, ok])=>{
            if (!ok) return null;
            const d = atlas[pid];
            if (!d) return null;
            return (
              <path key={pid} d={d} fill="rgba(16,185,129,.20)" stroke="rgba(5,150,105,.9)" strokeWidth={1}/>
            );
          })}
        </svg>
        <div ref={boardRef} className="absolute inset-0">
          {/* aim circle */}
          {activeProvince && (
            <div
              className="aim"
              style={{
                left: activeProvince.anchor_px[0] - tol,
                top:  activeProvince.anchor_px[1] - tol,
                width: tol*2, height: tol*2
              }}
            />
          )}
        </div>
      </div>

      {/* Panel mảnh ghép */}
      <aside className="relative w-[340px]">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Thời gian: <b>{(ms/1000).toFixed(1)}s</b></div>
          <button className="text-xs underline" onClick={()=>location.reload()}>Làm lại</button>
          <button
            className="text-[11px] px-2 py-1 rounded border ml-2"
            onClick={()=>{
              const next = !dev;
              setDev(next);
              localStorage.setItem('dev', next ? '1' : '0');
            }}
          >
            DEV {dev ? 'ON' : 'OFF'}
          </button>

        </div>

        <div className="mt-3 relative border rounded-lg bg-white h-[1400px] overflow-y-scroll p-3 scroll-stable">
          {bundle.provinces.map((p,i)=>(
            <Piece key={p.id} p={p}
              defaultPos={startPositions[i]}
              locked={!!placed[p.id]}
              onDrop={(x,y)=> tryDrop(p.id, x,y)}
              onDragState={s=> setActivePid(s ? p.id : null)}
            />
          ))}
        </div>

        {done && (
          <div className="mt-4 p-3 rounded-lg border bg-white">
            <div className="font-semibold">Hoàn thành! {(ms/1000).toFixed(1)}s</div>
            <input className="mt-2 w-full border rounded px-2 py-1" placeholder="Tên bạn" value={name} onChange={e=>setName(e.target.value)} />
            <button className="mt-2 px-3 py-1 rounded bg-blue-600 text-white" onClick={onSave}>Lưu BXH Top-5</button>
          </div>
        )}
      </aside>
      
    </div>
    
  );
  {dev && (
    <AnchorTuner
      bundle={bundle}
      placed={placed}
      vw={600}
      vh={400}
    />
  )}
}

function randomStartPositions(list:Province[]){
  return list.map((_,i)=>({ x: 40 + (i%2)*140, y: 30 + Math.floor(i/2)*60 }));
}

function Piece({
  p, defaultPos, locked,
  onDrop, onDragState
}:{
  p:Province; defaultPos:{x:number;y:number};
  locked:boolean;
  onDrop:(clientX:number, clientY:number)=>boolean;
  onDragState:(dragging:boolean)=>void;
}){
  const [pos, setPos] = useState(defaultPos);
  const [d, setD] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const [fixedPos, setFixedPos] = useState<{x:number;y:number}|null>(null); // position:fixed khi kéo
  const [grabOffset, setGrabOffset] = useState<{dx:number;dy:number}>({dx:0, dy:0});
  const atlas = useAtlasPaths("/assets/atlas.svg");

  // lấy path (atlas ưu tiên)
  useEffect(()=>{
    const fromAtlas = atlas[p.id];
    if (fromAtlas) { setD(fromAtlas); return; }
    const url = p.svg_path_file.startsWith("/") ? p.svg_path_file : "/"+p.svg_path_file.replace(/\\/g,'/');
    fetch(url).then(r=>r.text()).then(txt=>{
      const m = txt.match(/d=(?:"([^"]+)"|'([^']+)')/i);
      setD(m ? (m[1] || m[2]) : "");
    }).catch(()=> setD(""));
  }, [atlas, p.id, p.svg_path_file]);

  // khóa về anchor khi đặt đúng
  useEffect(()=>{ if(locked){ setFixedPos(null); setDragging(false); onDragState(false); setPos({ x:p.anchor_px[0]-24, y:p.anchor_px[1]-24 }); }}, [locked]);

  // ESC để huỷ kéo
  useEffect(()=>{
    function onEsc(e:KeyboardEvent){ if (e.key==='Escape' && dragging){ setDragging(false); setFixedPos(null); onDragState(false); } }
    window.addEventListener('keydown', onEsc);
    return ()=> window.removeEventListener('keydown', onEsc);
  }, [dragging, onDragState]);

  function onPointerDown(e:React.PointerEvent){
    if (locked) return;
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    setGrabOffset({dx, dy});
    setDragging(true);
    onDragState(true);
    // bật mode fixed để bay qua board
    setFixedPos({ x: e.clientX - dx, y: e.clientY - dy });

    el.setPointerCapture(e.pointerId);

    function move(ev:PointerEvent){
      setFixedPos(fp => fp ? { x: ev.clientX - dx, y: ev.clientY - dy } : { x: ev.clientX - dx, y: ev.clientY - dy });
    }
    function up(ev:PointerEvent){
      try { el.releasePointerCapture(e.pointerId); } catch {}
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);

      // thử drop theo clientX/clientY
      const ok = onDrop(ev.clientX, ev.clientY);
      if (!ok){
        // trả về vị trí cũ trong panel
        setFixedPos(null);
        setPos(prev => prev); // giữ nguyên pos
      } else {
        setFixedPos(null);
        // pos sẽ được set về anchor trong useEffect(locked)
      }
      setDragging(false);
      onDragState(false);
    }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up, { once:true });
  }

  // viewBox thông minh (đất liền gần anchor) + cache
  const vb = d
    ? viewBoxNearAnchorSmart(d, p.anchor_px[0], p.anchor_px[1], 6, 600, 220)
    : { x:0, y:0, w:100, h:100 };
  if (locked) return null;
  // Khi kéo: render ở position:fixed (bay qua 2 cột). Khi không kéo: position:absolute trong panel.
  const base = (
    d
    ? <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width={48} height={48} preserveAspectRatio="xMidYMid meet">
        <path d={d} fill="#fff" stroke="#334155" strokeWidth={1.2}/>
      </svg>
    : <div className="w-12 h-12 rounded bg-slate-200 animate-pulse" />
  );

  return fixedPos ? (
    <div
      className={`fixed z-50 select-none ${locked?'opacity-60':''}`}
      style={{ left:fixedPos.x, top:fixedPos.y, width:48, height:48, cursor:'grabbing' }}
      onPointerDown={onPointerDown}
      title={p.name_vi}
    >
      {base}
    </div>
  ) : (
    <div
      className={`absolute select-none ${locked?'opacity-60':''}`}
      style={{ left:pos.x, top:pos.y, width:48, height:48, cursor: locked ? 'default' : 'grab' }}
      onPointerDown={onPointerDown}
      title={p.name_vi}
    >
      {base}
    </div>
  );
}


function AnchorTuner({bundle, placed, vw, vh}:{bundle:Bundle; placed:Record<string,boolean>; vw:number; vh:number;}){
  const [pid, setPid] = useState(bundle.provinces[0]?.id || "");
  const [anchors, setAnchors] = useState<Record<string,[number,number]>>(
    Object.fromEntries(bundle.provinces.map(p=>[p.id, [...p.anchor_px] as [number,number]]))
  );
  const cur = bundle.provinces.find(p=>p.id===pid);

  function onClickBoard(e:React.MouseEvent){
    const host = e.currentTarget as HTMLElement;
    const r = host.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - r.left, 0), vw);
    const y = Math.min(Math.max(e.clientY - r.top , 0), vh);
    setAnchors(a=> ({...a, [pid]: [x,y]}));
  }

  function download(){
    const rows = bundle.provinces.map(p=>{
      const [x,y] = anchors[p.id];
      return { province_id: p.id, anchor_x: +x.toFixed(1), anchor_y: +y.toFixed(1) };
    });
    const blob = new Blob([JSON.stringify(rows, null, 2)], {type:'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'slots.json';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white/90 backdrop-blur rounded-lg border shadow p-3 w-[360px]">
      <div className="font-semibold mb-2">AnchorTuner (DEV)</div>
      <div className="flex items-center gap-2">
        <label className="text-sm">Tỉnh:</label>
        <select className="border rounded px-2 py-1 text-sm flex-1" value={pid} onChange={e=>setPid(e.target.value)}>
          {bundle.provinces.map(p=> <option key={p.id} value={p.id}>{p.id} – {p.name_vi}</option>)}
        </select>
        <button className="px-2 py-1 text-sm rounded bg-slate-800 text-white" onClick={download}>Export slots.json</button>
      </div>
      <div className="text-xs text-slate-600 mt-1">Click lên bản đồ để đặt anchor cho tỉnh đang chọn.</div>

      {/* overlay hiển thị anchor hiện tại */}
      <div className="mt-2 relative border rounded bg-white" style={{width:vw, height:vh}}>
        <img src="/assets/board_blank_outline.svg" width={vw} height={vh} className="opacity-20"/>
        <div className="absolute inset-0" onClick={onClickBoard} />
        {Object.entries(anchors).map(([id,[x,y]])=>(
          <div key={id} className="absolute" style={{ left:x-3, top:y-3 }}>
            <div className={`w-[6px] h-[6px] rounded-full ${id===pid?'bg-emerald-600':'bg-slate-400'}`} />
          </div>
        ))}
      </div>
    </div>
  );
}
