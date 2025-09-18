// src/levels/Level2.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
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
    const qs = new URLSearchParams(window.location.search || "");
    if (qs.get("dev") === "1") return true;
    const hash = String(window.location.hash || "");
    const hs = new URLSearchParams(hash.includes("?") ? hash.split("?")[1] : "");
    if (hs.get("dev") === "1") return true;
    return localStorage.getItem("dev") === "1";
  } catch { return false; }
}

const LB_KEY = "lb:pack1:level2";

// ---- main ----
export default function Level2({ bundle }: { bundle: Bundle }) {
  const [placed, setPlaced] = useState<Record<string, boolean>>({});
  const [activePid, setActivePid] = useState<string | null>(null);
  const done = Object.keys(placed).length === bundle.provinces.length;
  const { ms } = useTimer(!done);
  const [name, setName] = useState("");
  const { playCorrect, playWrong } = useSfx();
  const [shake, setShake] = useState(false);
  const [dev, setDev] = useState(getDevFlag());

  const atlasPaths = useAtlasPaths("/assets/atlas.svg");
  const boardRef = useRef<HTMLDivElement>(null);
  const [vx, vy, vw, vh] = bundle.viewBox;
  const startPositions = useMemo(() => randomStartPositions(bundle.provinces), [bundle]);
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


  function onSave() {
    const list = pushLB(LB_KEY, { name: name || "Ẩn danh", ms });
    alert(`Đã lưu! Top 1: ${list[0].name} – ${(list[0].ms / 1000).toFixed(1)}s`);
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
    {/* === HUD overlay: luôn rõ, không bị thu nhỏ === */}
      {createPortal(
        <div
          className="fixed top-2 left-3 z-[2147483647] flex items-center gap-2
                    bg-slate-800/90 text-white border border-slate-700 rounded-lg
                    px-3 py-2 shadow-lg pointer-events-auto"
        >
          <span className="text-sm">
            Thời gian: <b>{(ms / 1000).toFixed(1)}s</b>
          </span>
          <button
            className="text-xs px-2 py-1 rounded border border-slate-600 bg-slate-700 hover:bg-slate-600"
            onClick={() => location.reload()}
            title="Làm lại"
          >
            ↻
          </button>
          <button
            className="text-[11px] px-2 py-1 rounded border border-slate-600 bg-slate-700"
            onClick={() => { const next = !dev; setDev(next); localStorage.setItem("dev", next ? "1":"0"); }}
            title="Bật/tắt bảng DEV"
          >
            DEV {dev ? "ON" : "OFF"}
          </button>
        </div>,
        portalRoot
      )}
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
            <img
              src="/assets/board_blank_outline.svg"
              width={vw}
              height={vh}
              className="select-none pointer-events-none rounded-lg border border-slate-700 shadow-lg"
            />
            <svg className="absolute inset-0 pointer-events-none" viewBox={`0 0 ${vw} ${vh}`}>
              {bundle.provinces.map(p => {
                if (!placed[p.id]) return null;
                const d = atlasPaths[p.id];
                if (!d) return null;
                return (
                  <path
                    key={p.id}
                    d={d}
                    fill="rgba(16,185,129,.22)"
                    stroke="rgba(5,150,105,.95)"
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
            <div
              className="mt-3 relative rounded-lg border bg-slate-800/70 border-slate-700"
              style={{ height: vh }}
            >
              <div className="h-full overflow-y-scroll p-3 scroll-stable touch-none">
                {bundle.provinces.map((p, i) => (
                  <Piece
                    key={p.id}
                    p={p}
                    defaultPos={startPositions[i]}
                    locked={!!placed[p.id]}
                    onDrop={(x, y) => tryDrop(p.id, x, y)}
                    onDragState={(s) => setActivePid(s ? p.id : null)}
                    d={atlasPaths[p.id] || ""}
                  />
                ))}
              </div>
            </div>

            {done && (
              <div className="mt-4 p-3 rounded-lg border bg-slate-800/80 border-slate-700 text-slate-100">
                <div className="font-semibold">Hoàn thành! {(ms / 1000).toFixed(1)}s</div>
                <input
                  className="mt-2 w-full border rounded px-2 py-1 bg-slate-900 border-slate-600"
                  placeholder="Tên bạn"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <button className="mt-2 px-3 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700" onClick={onSave}>
                  Lưu BXH Top-5
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* AnchorTuner giữ nguyên, overlay phía ngoài stage */}
      {dev && <AnchorTuner bundle={bundle} vw={vw} vh={vh} />}
    </div>
    </>
  );
}
// ---- Piece: icon kéo (dính chuột; ẩn sau khi đặt đúng) ----
// ---- Piece: icon kéo (dính đúng điểm click; vẽ qua portal để khỏi lệch) ----
function Piece({
  p, defaultPos, locked, onDrop, onDragState, d
}:{
  p: Province;
  defaultPos: { x: number; y: number };
  locked: boolean;
  onDrop: (clientX: number, clientY: number) => boolean;
  onDragState: (dragging: boolean) => void;
  d: string; // path từ atlas
}) {
  const [pos, setPos] = useState(defaultPos);                // vị trí trong panel (khi KHÔNG kéo)
  const [dragging, setDragging] = useState(false);
  const [dragXY, setDragXY] = useState<{x:number; y:number}>({x:0,y:0}); // toạ độ viewport khi kéo (fixed)
  const offRef = useRef({ dx: 0, dy: 0 });                   // offset điểm click trong icon
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

  const icon = d
    ? <svg viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`} width={48} height={48} preserveAspectRatio="xMidYMid meet">
        <path d={d} fill="#fff" stroke="#334155" strokeWidth={1.2} />
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
