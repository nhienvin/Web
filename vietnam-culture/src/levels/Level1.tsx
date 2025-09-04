import { useMemo, useRef, useState } from 'react';
import type { Bundle, Province } from '../types';
import { dist, within } from '../core/math';
import { useTimer } from '../core/useTimer';
import { pushLB } from '../core/leaderboard';
import { useSfx } from '../core/useSfx';

const BOARD_W = 800, BOARD_H = 1400;
const LB_KEY = 'lb:pack1:level1';

export default function Level1({bundle}:{bundle:Bundle}){
  const provinces = useMemo(()=> shuffle([...bundle.provinces]), [bundle]);
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [flashOk, setFlashOk] = useState<string|null>(null);     // tỉnh vừa đúng để pop
  const [shake, setShake] = useState(false);                     // rung board khi sai
  const done = Object.keys(placed).length === provinces.length;
  const { ms } = useTimer(!done);
  const [name, setName] = useState("");
  const { playCorrect, playWrong } = useSfx();

  const boardRef = useRef<HTMLDivElement>(null);

  function onDropName(pid:string, clientX:number, clientY:number){
    const el = boardRef.current!;
    const r = el.getBoundingClientRect();
    const x = (clientX - r.left);
    const y = (clientY - r.top);
    const p = provincesById(bundle)[pid];
    const ok = within(dist(x,y, p.anchor_px[0],p.anchor_px[1]), p.snap_tolerance_px);

    if (ok) {
      setPlaced(prev=> ({...prev, [pid]: true}));
      setFlashOk(pid); setTimeout(()=>setFlashOk(null), 450);
      playCorrect();
    } else {
      // rung board + vibrate + âm sai
      setShake(true); setTimeout(()=>setShake(false), 480);
      if (navigator.vibrate) navigator.vibrate(50);
      playWrong();
    }
  }

  function onSave(){
    const list = pushLB(LB_KEY, { name: name || 'Ẩn danh', ms });
    alert(`Đã lưu! Top 1 hiện tại: ${list[0].name} – ${(list[0].ms/1000).toFixed(1)}s`);
  }

  return (
    <div className="max-w-6xl mx-auto p-4 grid grid-cols-[800px_1fr] gap-4">
      {/* Board */}
      <div className={`relative ${shake?'anim-shake':''}`} style={{width:BOARD_W, height:BOARD_H}}>
        <img src="/assets/board_with_borders.svg" width={BOARD_W} height={BOARD_H}
             className="select-none pointer-events-none rounded-lg border"/>

        {/* Drop layer */}
        <div
          ref={boardRef}
          className="absolute inset-0"
          onDragOver={(e)=> e.preventDefault()}
          onDrop={(e)=>{ e.preventDefault(); const pid=e.dataTransfer?.getData('text/province'); if(pid) onDropName(pid,e.clientX,e.clientY); }}
        >
          {/* anchors & tick */}
          {bundle.provinces.map(p=>{
            const [x,y] = p.anchor_px;
            const ok = placed[p.id];
            const just = flashOk === p.id;     // đúng mới xong → pop
            return (
              <div key={p.id} className="absolute" style={{left:x-4, top:y-4, width:8, height:8}}>
                <div className={`w-2 h-2 rounded-full ${ok?'bg-emerald-600':'bg-slate-300'} opacity-70`} />
                {ok && (
                  <div className={`absolute left-3 top-[-2px] tick-badge ${just?'anim-pop':''}`}>
                    ✓ {p.name_vi}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar: chips + timer */}
      <aside className="flex flex-col">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">Thời gian: <b>{(ms/1000).toFixed(1)}s</b></div>
          <button className="text-xs underline" onClick={()=>location.reload()}>Làm lại</button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 auto-rows-max">
          {provinces.map(p=>(
            <NameChip key={p.id} province={p} disabled={!!placed[p.id]} />
          ))}
        </div>

        {done && (
          <div className="mt-4 p-3 rounded-lg border bg-white">
            <div className="font-semibold">Hoàn thành! {(ms/1000).toFixed(1)}s</div>
            <input className="mt-2 w-full border rounded px-2 py-1" placeholder="Tên bạn" value={name} onChange={e=>setName(e.target.value)} />
            <button className="mt-2 px-3 py-1 rounded bg-emerald-600 text-white" onClick={onSave}>Lưu BXH Top-5</button>
          </div>
        )}
      </aside>
    </div>
  );
}

function NameChip({province, disabled}:{province:Province; disabled:boolean;}){
  function onDragStart(e:React.DragEvent) {
    e.dataTransfer.setData('text/province', province.id);
    e.dataTransfer.effectAllowed = 'move';
  }
  return (
    <div
      draggable={!disabled}
      onDragStart={onDragStart}
      className={`px-2 py-1 rounded border text-sm bg-white ${disabled?'opacity-40 line-through pointer-events-none':''}`}
      title={province.name_en}
    >
      {province.name_vi}
    </div>
  );
}

function provincesById(bundle:Bundle){ const m:Record<string,Province>={}; bundle.provinces.forEach(p=>m[p.id]=p); return m; }
function shuffle<T>(a:T[]):T[]{ for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]];} return a; }
