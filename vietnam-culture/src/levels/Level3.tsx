// src/levels/Level2.tsx
import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Bundle, Province } from "../types";
import { dist, within } from "../core/math";
import { useTimer } from "../core/useTimer";
import { pushLB } from "../core/leaderboard";
import { useSfx } from "../core/useSfx";
import { useAtlasPaths } from "../core/useAtlas";
import { viewBoxNearAnchorSmart } from "../core/svg";
import { createPortal } from "react-dom";
// ---- helpers ----



function useStageScale(stageW: number, stageH: number, pad = 24) {
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const recalc = () => {
      const aw = window.innerWidth - pad * 2;
      const ah = window.innerHeight - pad * 2;
      setScale(Math.min(aw / stageW, ah / stageH, 1));
    };
    recalc();
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, [stageW, stageH, pad]);
  return scale;
}

function getDevFlag(): boolean {
  try {
    return localStorage.getItem("dev") === "1";
  } catch { return false; }
}

const LB_KEY = "lb:pack1:level3";

type LBItem = { name: string; ms: number };
function readLB(key: string): LBItem[] {
  try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; }
}

// ---- main ----
export default function Level3({ bundle, onBack }: { bundle: Bundle; onBack: () => void }) {
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [activePid, setActivePid] = useState<string | null>(null);
  const done = Object.keys(placed).length === bundle.provinces.length;
  const { ms, reset: resetTimer } = useTimer(!done);
  const { playCorrect, playWrong, playWin } = useSfx();
  const [shake, setShake] = useState(false);
  const [dev, setDev] = useState(getDevFlag());
  const [showWin, setShowWin] = useState(false);
  const doneRef = useRef<boolean>(false);
  const solved = Object.keys(placed).length;
  const total = bundle?.provinces?.length ?? 0;

  const atlasPaths = useAtlasPaths("/assets/atlas.svg");
  const boardRef = useRef<HTMLDivElement>(null);
  const [vx, vy, vw, vh] = bundle.viewBox;
  const [startPositions, setStartPositions] = useState(() => randomStartPositions(bundle.provinces));
  const [colorMap, setColorMap] = useState<ProvinceColorMap>(() => randomColorMap(bundle.provinces));
  const uniqueId = useId().replace(/:/g, "");
  const gradientId = `${uniqueId}-gradient`;
  const shadowId = `${uniqueId}-shadow`;

  const truongSaMarkers = [
    [0.96, 0.73],
    [0.97, 0.74],
    [0.95, 0.75],
    [0.93, 0.78],
    [0.98, 0.76],
  
  ];
  const truongSaRadius = Math.max(3, Math.min(9, Math.max(vw, vh) * 0.006));
  const truongSaStroke = Math.max(0.7, Math.min(3, Math.max(vw, vh) * 0.0012));
  const truongSaFontSize = Math.max(12, Math.min(32, vw * 0.02));
  const hoangSaMarkers = [
    [0.92, 0.48],
    [0.90, 0.45],
    [0.95, 0.43],
  ];
  const hoangSaRadius = Math.max(2.5, Math.min(7, Math.max(vw, vh) * 0.004));
  const hoangSaStroke = Math.max(0.6, Math.min(2.4, Math.max(vw, vh) * 0.001));
  const hoangSaFontSize = Math.max(10, Math.min(26, vw * 0.016));

// === HUD portal setup (không bị scale) ===
  const portalElRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = document.createElement("div");
    el.setAttribute("data-level2-portal", "");
    document.body.appendChild(el);
    portalElRef.current = el;
    return () => {
      if (el.parentNode) el.parentNode.removeChild(el);
      portalElRef.current = null;
    };
  }, []);
  const portalRoot = portalElRef.current || document.body;

  useEffect(() => {
    setStartPositions(randomStartPositions(bundle.provinces));
    setColorMap(randomColorMap(bundle.provinces));
  }, [bundle]);

  useEffect(() => {
    if (!done) {
      doneRef.current = false;
      return;
    }
    if (doneRef.current) return;
    doneRef.current = true;
    setShowWin(true);
    playWin();
  }, [done, playWin]);

  function resetGame() {
    setPlaced({});
    setActivePid(null);
    setShowWin(false);
    setShake(false);
    doneRef.current = false;
    setStartPositions(randomStartPositions(bundle.provinces));
    setColorMap(randomColorMap(bundle.provinces));
    resetTimer();
  }

  function tryDrop(pid: string, cx: number, cy: number) {
    const el = boardRef.current!;
    const r = el.getBoundingClientRect();

    // thêm scale-safe:
    const sx = r.width / vw;
    const sy = r.height / vh;
    const x = (cx - r.left) / sx;
    const y = (cy - r.top) / sy;

    const p = bundle.provinces.find(q => q.id === pid)!;

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


  const activeProvince = activePid ? bundle.provinces.find(p => p.id === activePid) : null;
  const tol = activeProvince ? Math.max(activeProvince.snap_tolerance_px || 18, 36) : 0;

  // kích thước stage gốc (chưa scale)
  const PANEL_W = 340;
  const GAP = 16;
  const stageW = vw + GAP + PANEL_W;
  const stageH = vh;
  const stageScale = useStageScale(stageW, stageH, 24);

  return (<>
    <div className="fixed inset-0 overflow-hidden bg-slate-900 text-slate-100">
      {/* Stage center + scale để vừa màn hình */}
      <div
        className="absolute"
        style={{
          left: "50%",
          top: "50%",
          width: stageW,
          height: stageH,
          transform: `translate(-50%,-50%) scale(${stageScale})`,
          transformOrigin: "center center",
        }}
      >
        <div
          className="grid gap-4"
          style={{ display: "grid", gridTemplateColumns: `${vw}px ${PANEL_W}px` }}
        >
          
          {/* BOARD (giữ nguyên, chỉ thêm border/shadow phù hợp nền tối) */}
          <div className={`relative ${shake ? "anim-shake" : ""}`} style={{ width: vw, height: vh }}>
            <div
              aria-hidden
              className="select-none pointer-events-none rounded-lg border border-slate-700 shadow-lg overflow-hidden"
              style={{ width: '100%', height: '100%' }}
            >
              <svg
                className="block h-full w-full"
                viewBox={`0 0 ${vw} ${vh}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id={gradientId} x1="4%" y1="0%" x2="96%" y2="100%">
                    <stop offset="0%" stopColor="rgba(15,23,42,0.95)" />
                    <stop offset="100%" stopColor="rgba(30,41,59,0.85)" />
                  </linearGradient>
                  <filter id={shadowId} x="-4%" y="-4%" width="108%" height="108%" colorInterpolationFilters="sRGB">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#020617" floodOpacity="0.8" />
                  </filter>
                </defs>
                <rect width={vw} height={vh} fill={`url(#${gradientId})`} />
                <g fill="rgba(4, 34, 104, 0.92)" filter={`url(#${shadowId})`}>
                  {bundle.provinces.map(p => {
                    const d = atlasPaths[p.id];
                    if (!d) return null;
                    return <path key={`bg-${p.id}`} d={d} />;
                  })}
                </g>
              </svg>
            </div>
            <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${vw} ${vh}`}>
              <g stroke="#38bdf8" fill="#38bdf8" fillOpacity={0.75} strokeWidth={truongSaStroke}>
                {truongSaMarkers.map(([fx, fy], idx) => (
                  <circle key={`ts-${idx}`} cx={vw * fx} cy={vh * fy} r={truongSaRadius} />
                ))}
              </g>
              <g stroke="#fbbf24" fill="#fbbf24" fillOpacity={0.75} strokeWidth={hoangSaStroke}>
                {hoangSaMarkers.map(([fx, fy], idx) => (
                  <circle key={`hs-${idx}`} cx={vw * fx} cy={vh * fy} r={hoangSaRadius} />
                ))}
              </g>
              <text
                x={vw * 0.88}
                y={vh * 0.80}
                fill="#38bdf8"
                fontSize={truongSaFontSize}
                fontWeight={600}
                opacity={0.8}
              >
                Trường Sa
              </text>
              <text
                x={vw * 0.86}
                y={vh * 0.44}
                fill="#fbbf24"
                fontSize={hoangSaFontSize}
                fontWeight={600}
                opacity={0.85}
              >
                Hoàng Sa
              </text>
              {bundle.provinces.map(p => {
                if (!placed[p.id]) return null;
                const d = atlasPaths[p.id];
                if (!d) return null;
                const color = colorMap[p.id];
                const fillColor = color?.fill || "rgba(226, 238, 118, 0.95)";
                const strokeColor = color?.stroke || "rgba(86, 233, 186, 0.95)";
                return (
                  <path
                    key={p.id}
                    d={d}
                    fill={fillColor}
                    stroke={strokeColor}
                    strokeWidth={1}
                  />
                );
              })}
              <g
                fontSize={12}
                textAnchor="middle"
                style={{ pointerEvents: "none", paintOrder: "stroke", stroke: "#fff", strokeWidth: 3 }}
              >
                {bundle.provinces.map(p => {
                  const [ax, ay] = p.anchor_px;
                  const isPlaced = !!placed[p.id];
                  return (
                    <text
                      key={`label-${p.id}`}
                      x={ax}
                      y={ay - 6}
                      fill={isPlaced ? "#0f172a" : "#1e293b"}
                      opacity={isPlaced ? 1 : 0.7}
                    >
                      {p.name_vi}
                    </text>
                  );
                })}
              </g>
            </svg>
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

          {/* PANEL MẢNH – giữ header (thời gian/nút), container tối, KHÔNG tạo scroll toàn trang */}
          <aside className="relative w-[340px]">
            <div className="sticky top-0 z-20 flex items-center justify-evenly px-3 py-2 rounded-t-lg bg-slate-800/90 backdrop-blur border-b border-slate-700">
              <div className="text-m text-slate-200">Thời gian: <b>{(ms/1000).toFixed(1)}s</b>
                {' • '}<b>{solved}/{total}</b>
              </div>
              <button
                onClick={onBack}
                style={{ pointerEvents:'auto', fontSize:16, padding:'4px 8px',
                borderRadius:6, border:'1px solid #475569',
                background:'#334155', color:'#fff', cursor:'pointer' }}
                title="Quay lại menu">
                ← 
              </button>
              <button
              onClick={resetGame}
              style={{ pointerEvents:'auto', fontSize:16, padding:'4px 8px',
                borderRadius:6, border:'1px solid #475569',
                background:'#334155', color:'#fff', cursor:'pointer' }}
              title="Làm lại (random thứ tự mới)"
              >↻</button>
              {/* <button
                className="text-sm px-2 py-1 rounded border border-slate-600 bg-slate-700"
                onClick={() => { const next = !dev; setDev(next); localStorage.setItem("dev", next ? "1":"0"); }}
                title="Bật/tắt bảng DEV">
                DEV {dev ? "ON" : "OFF"}
              </button> */}
            </div>
            <div
              className="mt-3 relative rounded-lg border bg-slate-800/70 border-slate-700"
              style={{ height: vh }}
            >
              <div className="h-full overflow-y-auto p-3 scroll-stable touch-none">
                {bundle.provinces.map((p, i) => (
                  <Piece
                    key={p.id}
                    p={p}
                    defaultPos={startPositions[i]}
                    locked={!!placed[p.id]}
                    onDrop={(x, y) => tryDrop(p.id, x, y)}
                    onDragState={(s) => setActivePid(s ? p.id : null)}
                    d={atlasPaths[p.id] || ""}
                    color={colorMap[p.id]}
                  />
                ))}
              </div>
            </div>

            {done && !showWin && (
              <div className="mt-4 rounded-lg border border-slate-700 bg-slate-800/80 p-3 text-slate-100">
                <div className="font-semibold">Hoàn thành! {(ms / 1000).toFixed(1)}s</div>
                <button
                  className="mt-2 w-full rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
                  onClick={() => setShowWin(true)}
                >
                  Xem bảng xếp hạng
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* AnchorTuner giữ nguyên, overlay phía ngoài stage */}
      {dev && <AnchorTuner bundle={bundle} vw={vw} vh={vh} />}
    </div>

    {showWin && (
      <WinDialog
        lbKey={LB_KEY}
        ms={ms}
        onClose={() => setShowWin(false)}
      />
    )}
    </>
  );
}
// ---- Piece: icon kéo (dính chuột; ẩn sau khi đặt đúng) ----
// ---- Piece: icon kéo (dính đúng điểm click; vẽ qua portal để khỏi lệch) ----
function Piece({
  p, defaultPos, locked, onDrop, onDragState, d, color
}:{
  p: Province;
  defaultPos: { x: number; y: number };
  locked: boolean;
  onDrop: (clientX: number, clientY: number) => boolean;
  onDragState: (dragging: boolean) => void;
  d: string; // path từ atlas
  color?: ProvinceColor;
}) {
  const [pos, setPos] = useState(defaultPos);                // vị trí trong panel (khi KHÔNG kéo)
  const [dragging, setDragging] = useState(false);
  const [dragXY, setDragXY] = useState<{x:number; y:number}>({x:0,y:0}); // toạ độ viewport khi kéo (fixed)
  const offRef = useRef({ dx: 0, dy: 0 });                   // offset điểm click trong icon
  useEffect(() => {
    setPos(defaultPos);
  }, [defaultPos]);
  const pointerIdRef = useRef<number | null>(null);

  // nếu đã đặt đúng -> ẩn icon
  useEffect(() => {
    if (locked) {
      setDragging(false);
      onDragState(false);
    }
  }, [locked, onDragState]);

  if (locked) return null;

  function onPointerDown(e: React.PointerEvent) {
    e.preventDefault();
    e.stopPropagation();

    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();

    // *** BÁM ĐÚNG ĐIỂM CLICK ***
    offRef.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    pointerIdRef.current = e.pointerId;

    // chuyển chế độ kéo
    setDragging(true);
    onDragState(true);

    // set vị trí bắt đầu cho layer kéo (viewport coords)
    setDragXY({ x: e.clientX, y: e.clientY });

    // giữ capture trên CHÍNH phần tử này
    el.setPointerCapture(e.pointerId);

    const move = (ev: PointerEvent) => {
      // cập nhật theo viewport, chặn scroll trên mobile
      setDragXY({ x: ev.clientX, y: ev.clientY });
      ev.preventDefault?.();
    };

    const up = (ev: PointerEvent) => {
      try { if (pointerIdRef.current != null) el.releasePointerCapture(pointerIdRef.current); } catch {}
      window.removeEventListener("pointermove", move as any);
      window.removeEventListener("pointerup", up as any);
      window.removeEventListener("pointercancel", up as any);

      // thử thả lên board (dựa vào clientX/Y thật)
      const ok = onDrop(ev.clientX, ev.clientY);
      if (!ok) {
        // quay về icon trong panel
        setDragging(false);
        onDragState(false);
      } else {
        // parent chuyển locked=true -> component tự ẩn
        setDragging(false);
        onDragState(false);
      }
      pointerIdRef.current = null;
    };

    window.addEventListener("pointermove", move as any, { passive: false });
    window.addEventListener("pointerup", up as any, { once: true });
    window.addEventListener("pointercancel", up as any, { once: true });
  }

  // cắt icon quanh anchor để bỏ cụm đảo xa (Trường Sa…)
  const vb = d
    ? viewBoxNearAnchorSmart(d, p.anchor_px[0], p.anchor_px[1], 6, 600, 220)
    : { x: 0, y: 0, w: 100, h: 100 };

  const iconFill = color?.iconFill || "#f1f5f9";
  const iconStroke = color?.iconStroke || "#334155";
  const icon = d
    ? <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width={48} height={48} preserveAspectRatio="xMidYMid meet">
        <path d={d} fill={iconFill} stroke={iconStroke} strokeWidth={1.2} />
      </svg>
    : <div className="w-12 h-12 rounded bg-slate-200 animate-pulse" />;

  // 1) Nút trong panel (KHÔNG kéo): absolute trong panel, nhận pointerdown
  // 2) Khi kéo: icon bay qua portal ở body, position:fixed theo viewport → hết lệch
  return (
    <>
      <div
        onPointerDown={onPointerDown}
        className={`absolute select-none ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
        style={{
          left: pos.x,
          top: pos.y,
          width: 48,
          height: 48,
          // Khi đang kéo, ẩn nút gốc để tránh double-image
          opacity: dragging ? 0 : 1,
          pointerEvents: dragging ? "none" : "auto",
          zIndex: 1,
        }}
        title={p.name_vi}
      >
        {icon}
      </div>

      {dragging && createPortal(
        <div
          className="fixed z-[3000] select-none pointer-events-none"
          style={{
            left: dragXY.x - offRef.current.dx,
            top:  dragXY.y - offRef.current.dy,
            width: 48,
            height: 48,
          }}
        >
          {icon}
        </div>,
        document.body
      )}
    </>
  );
}


function WinDialog({ lbKey, ms, onClose }: { lbKey: string; ms: number; onClose: () => void }) {
  const [name, setName] = useState("");
  const [entries, setEntries] = useState<LBItem[]>(() => readLB(lbKey));
  const [saved, setSaved] = useState<LBItem | null>(null);

  const top5 = useMemo(() => entries.slice(0, 5), [entries]);
  const savedRank = saved
    ? top5.findIndex(e => e.name === saved.name && e.ms === saved.ms)
    : -1;

  function handleSave() {
    const cleaned = (name || "").trim();
    const safeName = cleaned.length ? cleaned.slice(0, 32) : "Ẩn danh";
    const list = pushLB(lbKey, { name: safeName, ms });
    setEntries(list);
    setSaved({ name: safeName, ms });
    setName("");
  }

  return (
    <div className="fixed inset-0 z-[2147483600] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="w-[min(92vw,520px)] rounded-2xl bg-white text-slate-900 shadow-xl p-5 anim-pop">
        <div className="text-center">
          <div className="text-2xl font-semibold">Hoàn thành Level 2!</div>
          <div className="mt-1 text-sm text-slate-600">Thời gian: <b>{(ms / 1000).toFixed(1)}s</b></div>
        </div>

        <div className="mt-4">
          <div className="mb-2 text-sm font-semibold text-slate-700">Bảng xếp hạng Top 5</div>
          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="w-12 px-3 py-2 text-left">#</th>
                  <th className="px-3 py-2 text-left">Tên</th>
                  <th className="w-28 px-3 py-2 text-right">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {top5.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center text-slate-500">Chưa có dữ liệu</td>
                  </tr>
                )}
                {top5.map((entry, idx) => (
                  <tr
                    key={`${entry.name}-${entry.ms}-${idx}`}
                    className={`border-t ${idx === savedRank ? "bg-emerald-50" : ""}`}
                  >
                    <td className="px-3 py-1.5">{idx + 1}</td>
                    <td className="px-3 py-1.5">{entry.name}</td>
                    <td className="px-3 py-1.5 text-right">{(entry.ms / 1000).toFixed(1)}s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {saved && (
            <div className="mt-3 text-sm">
              {savedRank >= 0 ? (
                <span className="text-emerald-700">
                  Bạn đang ở hạng #{savedRank + 1} với {(saved.ms / 1000).toFixed(1)}s.
                </span>
              ) : (
                <span className="text-slate-600">
                  Thời gian hiện chưa vào Top 5, thử lại nhanh hơn nhé!
                </span>
              )}
            </div>
          )}
        </div>

        <div className="mt-5">
          <label className="text-sm text-slate-700">Nhập tên của bạn</label>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="Tên hiển thị"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button
              className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700"
              onClick={handleSave}
            >
              Lưu
            </button>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end">
          <button
            className="rounded border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}




// ---- Dev: chỉnh anchor nhanh ----
function AnchorTuner({ bundle, vw, vh }: { bundle: Bundle; vw: number; vh: number }) {
  const [pid, setPid] = useState(bundle.provinces[0]?.id || "");
  const [anchors, setAnchors] = useState<Record<string, [number, number]>>(
    Object.fromEntries(bundle.provinces.map(p => [p.id, [...p.anchor_px] as [number, number]]))
  );
  const cur = bundle.provinces.find(p => p.id === pid);

  function onClickBoard(e: React.MouseEvent<HTMLDivElement>) {
    const host = e.currentTarget as HTMLElement;
    const r = host.getBoundingClientRect();
    const x = Math.min(Math.max(e.clientX - r.left, 0), vw);
    const y = Math.min(Math.max(e.clientY - r.top, 0), vh);
    setAnchors(a => ({ ...a, [pid]: [x, y] }));
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
    <div className="fixed bottom-4 left-4 z-50 bg-white/90 backdrop-blur rounded-lg border shadow p-3 w-[360px]">
      <div className="font-semibold mb-2">AnchorTuner (DEV)</div>
      <div className="flex items-center gap-2">
        <label className="text-sm">Tỉnh:</label>
        <select className="border rounded px-2 py-1 text-sm flex-1" value={pid} onChange={e => setPid(e.target.value)}>
          {bundle.provinces.map(p => <option key={p.id} value={p.id}>{p.id} – {p.name_vi}</option>)}
        </select>
        <button className="px-2 py-1 text-sm rounded bg-slate-800 text-white" onClick={download}>Export slots.json</button>
      </div>
      <div className="text-xs text-slate-600 mt-1">Click lên ảnh dưới để đặt anchor cho tỉnh đang chọn.</div>

      <div className="mt-2 relative border rounded bg-white" style={{ width: vw/2, height: vh/2 }}>
        <img src="/assets/board_blank_outline.svg" width={vw/2} height={vh/2} className="opacity-30" />
        <div className="absolute inset-0" onClick={onClickBoard} />
        {Object.entries(anchors).map(([id, [x, y]]) => (
          <div key={id} className="absolute" style={{ left: x/2 - 3, top: y/2 - 3 }}>
            <div className={`w-[6px] h-[6px] rounded-full ${id === pid ? "bg-emerald-600" : "bg-slate-400"}`} />
          </div>
        ))}
      </div>
    </div>
  );
}

type ProvinceColor = { fill: string; stroke: string; iconFill: string; iconStroke: string };
type ProvinceColorMap = Record<string, ProvinceColor>;

function randomColorMap(list: Province[]): ProvinceColorMap {
  return Object.fromEntries(list.map((p) => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 55 + Math.random() * 25; // 55-80
    const light = 52 + Math.random() * 12; // 52-64
    const fill = `hsl(${hue} ${saturation}% ${light}%)`;
    const stroke = `hsl(${hue} ${Math.max(30, saturation - 25)}% ${Math.max(18, light - 28)}%)`;
    const iconFill = `hsl(${hue} ${Math.min(95, saturation + 12)}% ${Math.min(88, light + 18)}%)`;
    const iconStroke = stroke;
    return [p.id, { fill, stroke, iconFill, iconStroke }];
  }));
}

// ---- utils ----
function randomStartPositions(list: Province[]) {
  const slots = list.map((_, i) => ({
    x: 40 + (i % 2) * 140,
    y: 30 + Math.floor(i / 2) * 60,
  }));
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = slots[i];
    slots[i] = slots[j];
    slots[j] = tmp;
  }
  return slots;
}
