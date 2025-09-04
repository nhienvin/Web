import { useEffect, useRef, useState } from 'react';
export function useTimer(run:boolean) {
  const t0 = useRef<number|undefined>(undefined);
  const [ms, setMs] = useState(0);
  useEffect(()=> {
    if (!run) return;
    t0.current ??= performance.now();
    let id = requestAnimationFrame(function tick(){
      setMs(Math.floor(performance.now() - (t0.current as number)));
      id = requestAnimationFrame(tick);
    });
    return ()=> cancelAnimationFrame(id);
  }, [run]);
  const reset = ()=> { t0.current = performance.now(); setMs(0); };
  return { ms, reset };
}
