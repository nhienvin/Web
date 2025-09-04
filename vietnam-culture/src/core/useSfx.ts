import { useMemo } from 'react';

function makeOsc(freq:number, time=0.12) {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start();
    setTimeout(()=>{ osc.stop(); ctx.close(); }, time*1000);
  } catch {}
}

export function useSfx() {
  const aCorrect = useMemo(()=>{
    const el = new Audio('/sfx/correct.mp3'); el.preload = 'auto'; return el;
  },[]);
  const aWrong = useMemo(()=>{
    const el = new Audio('/sfx/wrong.mp3'); el.preload = 'auto'; return el;
  },[]);

  function playCorrect(){
    if (aCorrect.src) { aCorrect.currentTime = 0; aCorrect.play().catch(()=>makeOsc(880)); }
    else makeOsc(880);
  }
  function playWrong(){
    if (aWrong.src) { aWrong.currentTime = 0; aWrong.play().catch(()=>makeOsc(220)); }
    else makeOsc(220);
  }
  return { playCorrect, playWrong };
}
