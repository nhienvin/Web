import { useEffect, useMemo, useState } from 'react';
import { loadBundle } from './core/bundle';
import type { Bundle, Province } from './types';
import Level1 from './levels/Level1';
import Level2 from './levels/Level2';

type Screen = 'menu'|'level1'|'level2';

export default function App(){
  const [bundle, setBundle] = useState<Bundle|null>(null);
  const [screen, setScreen] = useState<Screen>('menu');

  useEffect(()=>{ loadBundle().then(setBundle).catch(console.error); }, []);
  if (!bundle) return <div className="p-6">Đang tải dữ liệu…</div>;

  return (
    <div className="h-full flex flex-col">
      <header className="p-3 border-b bg-white sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <h1 className="font-bold text-lg">Xuyên Việt – Địa lí căn bản</h1>
          <nav className="ml-auto flex gap-2">
            <button onClick={()=>setScreen('menu')} className="px-3 py-1 rounded bg-slate-200 hover:bg-slate-300">Menu</button>
            <button onClick={()=>setScreen('level1')} className="px-3 py-1 rounded bg-emerald-600 text-white">Cấp 1</button>
            <button onClick={()=>setScreen('level2')} className="px-3 py-1 rounded bg-blue-600 text-white">Cấp 2</button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {screen==='menu'  && <Menu onStartL1={()=>setScreen('level1')} onStartL2={()=>setScreen('level2')} />}
        {screen==='level1'&& <Level1 bundle={bundle} />}
        {screen==='level2'&& <Level2 bundle={bundle} />}
      </main>
    </div>
  );
}

function Menu({onStartL1,onStartL2}:{onStartL1:()=>void; onStartL2:()=>void;}){
  return (
    <div className="max-w-6xl mx-auto p-6 grid md:grid-cols-2 gap-6">
      <Card title="Cấp 1: Kéo tên vào bản đồ" onStart={onStartL1}
        desc="Bản đồ có đường ranh. Nhiệm vụ: kéo thẻ tên tỉnh vào đúng vị trí (theo neo nhãn)."/>
      <Card title="Cấp 2: Kéo mảnh hình tỉnh" onStart={onStartL2}
        desc="Bản đồ trống đường ranh. Kéo mảnh silhouette tỉnh vào vị trí đúng (snap theo anchor)."/>
    </div>
  );
}
function Card({title,desc,onStart}:{title:string;desc:string;onStart:()=>void}){
  return (
    <div className="rounded-2xl border bg-white p-5 shadow-sm">
      <h3 className="font-semibold">{title}</h3>
      <p className="text-sm text-slate-600 mt-2">{desc}</p>
      <button onClick={onStart} className="mt-4 px-4 py-2 rounded bg-slate-900 text-white">Bắt đầu</button>
    </div>
  );
}
