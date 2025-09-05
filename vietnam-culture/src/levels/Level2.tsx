// src/levels/Level2.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Bundle, Province } from "../types";
import { dist, within } from "../core/math";
import { useTimer } from "../core/useTimer";
import { pushLB } from "../core/leaderboard";
import { useSfx } from "../core/useSfx";
import { useAtlasPaths } from "../core/useAtlas";
import { viewBoxNearAnchorSmart } from "../core/svg";

// ---- helpers ----
function getDevFlag(): boolean {
  try {
    const qs = new URLSearchParams(window.location.search || "");
    if (qs.get("dev") === "1") return true;
    const hash = String(window.location.hash || "");
    const hs = new URLSearchParams(hash.includes("?") ? hash.split("?")[1] : "");
    if (hs.get("dev") === "1") return true;
    return localStorage.getItem("dev") === "1";
  } catch { return false; }
}
// tạo slot vị trí theo lưới 2 cột, sau đó shuffle slot để tránh đè nhau
function makeStartSlots(n: number) {
  const colX = [40, 180];   // 2 cột bên panel phải
  const rowH = 60;          // cao mỗi hàng
  const top = 30;
  const slots: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    slots.push({ x: colX[col], y: top + row * rowH });
  }
  return slots;
}
// --- RNG có seed + shuffle ---
function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleSeeded<T>(arr: T[], seed: number) {
  const rnd = mulberry32(seed);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function getSeedFromURLorLS(key = 'seed:l2'): number {
  const qs = new URLSearchParams(window.location.search || '');
  const q = qs.get('seed');
  if (q && /^\d+$/.test(q)) return Number(q) >>> 0;
  const s = localStorage.getItem(key);
  if (s) return Number(s) >>> 0;
  const r = (crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0;
  localStorage.setItem(key, String(r));
  return r;
}

// --- màu theo id + seed (HSL) ---
function hash32(s: string) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function colorForId(id: string, seed: number) {
  const h = (hash32(id) ^ seed) % 360;
  const fill = `hsl(${h} 75% 60%)`;
  const stroke = `hsl(${h} 55% 35%)`;
  const overlay = `hsl(${h} 70% 50% / .25)`;
  const overlayStroke = `hsl(${h} 70% 35% / .85)`;
  return { fill, stroke, overlay, overlayStroke };
}


const LB_KEY = "lb:pack1:level2";

// ---- main ----
export default function Level2({ bundle }: { bundle: Bundle }) {
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [activePid, setActivePid] = useState<string | null>(null);
  // const done = Object.keys(placed).length === bundle.provinces.length;
  // const { ms } = useTimer(!done);
  const [name, setName] = useState("");
  const [showWin, setShowWin] = useState(false);
  const { playCorrect, playWrong, playWin } = useSfx(); // đã có
  const [player, setPlayer] = useState("");

  const [shake, setShake] = useState(false);
  const [dev, setDev] = useState(getDevFlag());

  const atlasPaths = useAtlasPaths("/assets/atlas.svg");
  const boardRef = useRef<HTMLDivElement>(null);
  const [vx, vy, vw, vh] = bundle.viewBox;
  const startPositions = useMemo(() => randomStartPositions(bundle.provinces), [bundle]);
  // seed điều khiển thứ tự để tái tạo được
  const [seed, setSeed] = useState(getSeedFromURLorLS());
  const order = useMemo(() => shuffleSeeded([...bundle.provinces], seed), [bundle, seed]);
  const colorsById = useMemo(
    () => Object.fromEntries(order.map(p => [p.id, colorForId(p.id, seed)])),
    [order, seed]
  );

  // vị trí khởi tạo: tạo lưới rồi cũng xáo slot để tránh “thành hàng”
  const startSlots = useMemo(() => {
    const slots = makeStartSlots(order.length);
    return shuffleSeeded(slots, seed ^ 0x9e3779b1); // xáo slot với seed khác
  }, [order.length, seed]);

  // done không đổi cách tính (đặt đủ số tỉnh)
  const done = Object.keys(placed).length === order.length;
  const { ms } = useTimer(!done);
  useEffect(()=>{ if (done) { setShowWin(true); playWin(); } }, [done]);
  function tryDrop(pid: string, cx: number, cy: number) {
    const el = boardRef.current!;
    const r = el.getBoundingClientRect();
    const x = cx - r.left, y = cy - r.top;
    const p = bundle.provinces.find(q => q.id === pid)!;

    // clamp anchor đề phòng anchor lệch khỏi viewBox
    const ax = Math.min(Math.max(p.anchor_px[0], 0), vw);
    const ay = Math.min(Math.max(p.anchor_px[1], 0), vh);

    const tol = Math.max(p.snap_tolerance_px || 18, 36);
    const ok = within(dist(x, y, ax, ay), tol);

    if (ok) {
      setPlaced(s => ({ ...s, [pid]: true }));
      playCorrect();
    } else {
      setShake(true); setTimeout(() => setShake(false), 480);
      if (navigator.vibrate) navigator.vibrate(50);
      playWrong();
    }
    return ok;
  }

  function onSave() {
    const list = pushLB(LB_KEY, { name: name || "Ẩn danh", ms });
    alert(`Đã lưu! Top 1: ${list[0].name} – ${(list[0].ms / 1000).toFixed(1)}s`);
  }

  const activeProvince = activePid ? bundle.provinces.find(p => p.id === activePid) : null;
  const tol = activeProvince ? Math.max(activeProvince.snap_tolerance_px || 18, 36) : 0;

  return (
    <div
      className="mx-auto p-4 grid gap-4"
      style={{
        display: "grid",
        gridTemplateColumns: `${vw}px 340px`,
        maxWidth: vw + 340 + 48 // padding
      }}
    >
      {/* BOARD */}
      <div className={`relative ${shake ? "anim-shake" : ""}`} style={{ width: vw, height: vh }}>
        <img
          src="/assets/board_blank_outline.svg"
          width={vw}
          height={vh}
          className="select-none pointer-events-none rounded-lg border"
        />

        {/* Silhouette đã đặt (từ atlas) */}
        {/* <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${vw} ${vh}`}>
          {bundle.provinces.map(p => {
            if (!placed[p.id]) return null;
            const d = atlasPaths[p.id];
            if (!d) return null;
            return (
              <path
                key={p.id}
                d={d}
                fill="rgba(16,185,129,.20)"
                stroke="rgba(5,150,105,.9)"
                strokeWidth={1}
              />
            );
          })}
        </svg> */}
        <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${vw} ${vh}`}>
          {bundle.provinces.map(p=>{
            if (!placed[p.id]) return null;
            const d = atlasPaths[p.id]; if (!d) return null;
            const c = colorsById[p.id] || { overlay:'rgba(16,185,129,.20)', overlayStroke:'rgba(5,150,105,.9)' };
            return <path key={p.id} d={d} fill={c.overlay} stroke={c.overlayStroke} strokeWidth={1} />;
          })}
        </svg>


        {/* Aim circle + drop layer */}
        <div ref={boardRef} className="absolute inset-0">
          {activeProvince && (
            <div
              className="aim"
              style={{
                left: activeProvince.anchor_px[0] - tol,
                top: activeProvince.anchor_px[1] - tol,
                width: tol * 2,
                height: tol * 2
              }}
            />
          )}
        </div>
      </div>

      {/* PANEL MẢNH – width cố định + scrollbar ổn định */}
      <aside className="relative w-[340px]">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-600">
            Thời gian: <b>{(ms / 1000).toFixed(1)}s</b>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-xs underline" onClick={() => location.reload()}>
              Làm lại
            </button>
            {/* <button
              className="text-[11px] px-2 py-1 rounded border"
              onClick={() => {
                const next = !dev; setDev(next);
                localStorage.setItem("dev", next ? "1" : "0");
              }}
            >
              DEV {dev ? "ON" : "OFF"}
            </button> */}
            <button
              className="text-[11px] px-2 py-1 rounded border"
              onClick={() => {
                // reset lượt chơi + xáo seed mới
                setPlaced({});
                const next = (crypto.getRandomValues(new Uint32Array(1))[0]) >>> 0;
                localStorage.setItem('seed:l2', String(next));
                setSeed(next);
              }}
            >
              Đổi thứ tự
            </button>

          </div>
        </div>

        <div className="mt-3 relative border rounded-lg bg-white" style={{ height: vh }}>
          <div className="h-full overflow-y-scroll p-3 scroll-stable">
            {/* {bundle.provinces.map((p, i) => (
              <Piece
                key={p.id}
                p={p}
                defaultPos={startPositions[i]}
                locked={!!placed[p.id]}
                onDrop={(x, y) => tryDrop(p.id, x, y)}
                onDragState={(s) => setActivePid(s ? p.id : null)}
                d={atlasPaths[p.id] || ""}
              />
            ))} */}
            {order.map((p, i) => (
              <Piece
                key={p.id}
                p={p}
                defaultPos={startPositions[i]}
                locked={!!placed[p.id]}
                onDrop={(x, y) => tryDrop(p.id, x, y)}
                onDragState={(s) => setActivePid(s ? p.id : null)}
                d={atlasPaths[p.id] || ""}
                color={colorsById[p.id]}
              />
            ))}


          </div>
        </div>

        {/* {done && (
          <div className="mt-4 p-3 rounded-lg border bg-white">
            <div className="font-semibold">Hoàn thành! {(ms / 1000).toFixed(1)}s</div>
            <input
              className="mt-2 w-full border rounded px-2 py-1"
              placeholder="Tên bạn"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="mt-2 px-3 py-1 rounded bg-blue-600 text-white" onClick={onSave}>
              Lưu BXH Top-5
            </button>
          </div>
        )} */}
      </aside>

      {/* DEV panel render BÊN TRONG root */}
      {dev && <AnchorTuner bundle={bundle} vw={vw} vh={vh} />}
      {showWin && (
        <>
          <Confetti runMs={2800}/>
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-xl p-5 w-[min(92vw,420px)] anim-pop">
              <div className="text-center">
                <div className="text-3xl">🎉</div>
                <div className="mt-1 text-xl font-semibold">Tuyệt vời!</div>
                <div className="text-slate-600 mt-1">Bạn đã ghép xong bản đồ cấp 2.</div>
                <div className="mt-3 text-sm text-slate-500">Thời gian: <b>{(ms/1000).toFixed(1)}s</b></div>
              </div>
              <div className="mt-4">
                <label className="text-sm text-slate-700">Tên bạn</label>
                <input
                  className="mt-1 w-full border rounded px-3 py-2 text-sm"
                  placeholder="Nhập tên để lưu BXH"
                  value={player}
                  onChange={e=>setPlayer(e.target.value)}
                />
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button className="px-3 py-1.5 text-sm rounded border" onClick={()=> setShowWin(false)}>Đóng</button>
                <button
                  className="px-3 py-1.5 text-sm rounded bg-emerald-600 text-white"
                  onClick={()=>{
                    const list = pushLB('lb:pack1:level2', { name: player || 'Ẩn danh', ms });
                    setShowWin(false);
                    alert(`Đã lưu! Top 1: ${list[0].name} – ${(list[0].ms/1000).toFixed(1)}s`);
                  }}
                >
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

// ---- Piece: icon kéo (ẩn sau khi đặt đúng) ----
function Piece({
  p, defaultPos, locked, onDrop, onDragState, d, color
}:{
  p: Province;
  defaultPos: { x: number; y: number };
  locked: boolean;
  onDrop: (clientX: number, clientY: number) => boolean;
  onDragState: (dragging: boolean) => void;
  d: string;
  color: { fill: string; stroke: string };
}) {

  const [pos, setPos] = useState(defaultPos);
  const [fixedPos, setFixedPos] = useState<{ x: number; y: number } | null>(null);

  // nếu đã đặt đúng -> ẩn icon
  useEffect(() => { if (locked) { setFixedPos(null); onDragState(false); } }, [locked, onDragState]);
  if (locked) return null;

  function onPointerDown(e: React.PointerEvent) {
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - rect.left;
    const dy = e.clientY - rect.top;
    onDragState(true);
    setFixedPos({ x: e.clientX - dx, y: e.clientY - dy });
    el.setPointerCapture(e.pointerId);

    function move(ev: PointerEvent) { setFixedPos({ x: ev.clientX - dx, y: ev.clientY - dy }); }
    function up(ev: PointerEvent) {
      try { el.releasePointerCapture(e.pointerId); } catch {}
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const ok = onDrop(ev.clientX, ev.clientY);
      if (!ok) setFixedPos(null);
      onDragState(false);
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  }

  // cắt icon quanh anchor để bỏ cụm đảo xa (Trường Sa…)
  const vb = d
    ? viewBoxNearAnchorSmart(d, p.anchor_px[0], p.anchor_px[1], 6, 600, 220)
    : { x: 0, y: 0, w: 100, h: 100 };

    const icon = d
    ? <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width={48} height={48} preserveAspectRatio="xMidYMid meet">
        <path d={d} fill={color.fill} stroke={color.stroke} strokeWidth={1.2} />
      </svg>
    : <div className="w-12 h-12 rounded bg-slate-200 animate-pulse" />;  

  return fixedPos ? (
    <div
      className="fixed z-50 select-none"
      style={{ left: fixedPos.x, top: fixedPos.y, width: 48, height: 48, cursor: "grabbing" }}
      onPointerDown={onPointerDown}
      title={p.name_vi}
    >
      {icon}
    </div>
  ) : (
    <div
      className="absolute select-none"
      style={{ left: pos.x, top: pos.y, width: 48, height: 48, cursor: "grab" }}
      onPointerDown={onPointerDown}
      title={p.name_vi}
    >
      {icon}
    </div>
  );
}

// ---- Dev: chỉnh anchor nhanh ----
function AnchorTuner({ bundle, vw, vh }: { bundle: Bundle; vw: number; vh: number }) {
  // --- KÍCH THƯỚC COMPACT ---
  const PANEL_W = 280;                        // panel hẹp
  const SCALE   = Math.min(PANEL_W / vw, 0.30); // preview co giãn theo board, tối đa 30%
  const PRE_W   = Math.round(vw * SCALE);
  const PRE_H   = Math.round(vh * SCALE);

  const [pid, setPid] = useState(bundle.provinces[0]?.id || "");
  const [anchors, setAnchors] = useState<Record<string, [number, number]>>(
    Object.fromEntries(bundle.provinces.map(p => [p.id, [...p.anchor_px] as [number, number]]))
  );

  const current = bundle.provinces.find(p => p.id === pid);

  function onClickPreview(e: React.MouseEvent<HTMLDivElement>) {
    const host = e.currentTarget as HTMLElement;
    const r = host.getBoundingClientRect();
    // toạ độ click trong PREVIEW (đơn vị px của preview)
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    // ---> CHUẨN HOÁ VỀ TOẠ ĐỘ THẬT CỦA BOARD
    const xFull = Math.min(Math.max(px / SCALE, 0), vw);
    const yFull = Math.min(Math.max(py / SCALE, 0), vh);
    setAnchors(a => ({ ...a, [pid]: [xFull, yFull] }));
  }

  function download() {
    const rows = bundle.provinces.map(p => {
      const [x, y] = anchors[p.id];
      return { province_id: p.id, anchor_x: +x.toFixed(1), anchor_y: +y.toFixed(1) };
    });
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "slots.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div
      className="fixed bottom-3 left-3 z-50 bg-white/90 backdrop-blur rounded-lg border shadow p-3"
      style={{ width: PANEL_W }}
    >
      <div className="flex items-center justify-between">
        <div className="font-semibold text-sm">AnchorTuner</div>
        <button
          className="text-[11px] px-2 py-0.5 rounded border"
          onClick={download}
          title="Xuất anchors ra slots.json"
        >
          Export
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2">
        <label className="text-xs text-slate-600 shrink-0">Tỉnh</label>
        <select
          className="border rounded px-2 py-1 text-xs w-full"
          value={pid}
          onChange={e => setPid(e.target.value)}
        >
          {bundle.provinces.map(p => (
            <option key={p.id} value={p.id}>
              {p.id} – {p.name_vi}
            </option>
          ))}
        </select>
      </div>

      {/* Preview nhỏ, click để đặt anchor */}
      <div
        className="mt-2 relative border rounded bg-white overflow-hidden"
        style={{ width: PRE_W, height: PRE_H, cursor: "crosshair" }}
        onClick={onClickPreview}
        title="Click để đặt anchor"
      >
        <img
          src="/assets/board_blank_outline.svg"
          width={PRE_W}
          height={PRE_H}
          className="opacity-25 select-none pointer-events-none"
        />
        {/* Dot cho tất cả anchors (mờ) */}
        {Object.entries(anchors).map(([id, [x, y]]) => (
          <div
            key={id}
            className="absolute"
            style={{ left: x * SCALE - 2, top: y * SCALE - 2 }}
          >
            <div
              className={`w-[4px] h-[4px] rounded-full ${
                id === pid ? "bg-emerald-600" : "bg-slate-400/70"
              }`}
            />
          </div>
        ))}
      </div>

      {/* Toạ độ hiện tại (đơn vị board px) */}
      {current && (
        <div className="mt-2 text-[11px] text-slate-600">
          {current.name_vi}:{" "}
          <b>
            {anchors[pid][0].toFixed(1)}, {anchors[pid][1].toFixed(1)}
          </b>
        </div>
      )}
      <div className="mt-1 text-[11px] text-slate-500">
        Gợi ý: Khánh Hòa đặt gần Nha Trang/Cam Ranh (đất liền).
      </div>
    </div>
  );
}

function Confetti({ runMs=2400 }: { runMs?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const cvs = ref.current!; const ctx = cvs.getContext('2d')!;
    let w = cvs.width = window.innerWidth, h = cvs.height = window.innerHeight;
    const onResize = () => { w=cvs.width=window.innerWidth; h=cvs.height=window.innerHeight; };
    window.addEventListener('resize', onResize);

    const N = 180; const parts = Array.from({length:N}, (_,i)=>({
      x: Math.random()*w, y: -20 - Math.random()*h*0.3,
      vx: -1 + Math.random()*2, vy: 2 + Math.random()*3,
      s: 4 + Math.random()*3, r: Math.random()*Math.PI, dr: -0.2+Math.random()*0.4,
      c: `hsl(${Math.floor(Math.random()*360)} 90% 60%)`
    }));
    let start = performance.now(), raf=0;
    function tick(t:number){
      const dt = Math.min(33, t - start); start = t;
      ctx.clearRect(0,0,w,h);
      for (const p of parts){
        p.x += p.vx; p.y += p.vy; p.r += p.dr;
        if (p.y > h+20) { p.y=-10; p.x=Math.random()*w; }
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s/2,-p.s/2,p.s,p.s);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    const stop = setTimeout(()=> cancelAnimationFrame(raf), runMs);
    return ()=> { cancelAnimationFrame(raf); clearTimeout(stop); window.removeEventListener('resize', onResize); };
  }, [runMs]);
  return <canvas ref={ref} className="fixed inset-0 pointer-events-none" />;
}

// ---- utils ----
function randomStartPositions(list: Province[]) {
  return list.map((_, i) => ({ x: 40 + (i % 2) * 140, y: 30 + Math.floor(i / 2) * 60 }));
}
