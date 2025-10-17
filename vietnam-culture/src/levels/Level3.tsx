import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Bundle, Province } from "../types";
import { useTimer } from "../core/useTimer";
import { pushLB } from "../core/leaderboard";
import { useSfx } from "../core/useSfx";
import { useAtlasPaths } from "../core/useAtlas";
import { viewBoxNearAnchorSmart } from "../core/svg";


const LB_KEY = "lb:pack1:level3";
const OPTION_COUNT = 4;

type LBItem = { name: string; ms: number };

type AnswerState = "idle" | "correct" | "wrong";

function readLB(key: string): LBItem[] {
    try {
      return JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      return [];
    }
  }
  
  function shuffleArray<T>(source: T[]): T[] {
    const arr = [...source];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
  
  function createQuestionOrder(list: Province[]): string[] {
    return shuffleArray(list.map((p) => p.id));
  }

export default function Level3({ bundle, onBack }: { bundle: Bundle; onBack: () => void }) {
    const atlasPaths = useAtlasPaths("/assets/atlas.svg");
    const { playCorrect, playWrong, playWin } = useSfx();
    const gradientId = useId().replace(/:/g, "");

    const [questionIds, setQuestionIds] = useState<string[]>(() => createQuestionOrder(bundle.provinces));
    const [currentIndex, setCurrentIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [answerState, setAnswerState] = useState<AnswerState>("idle");
    const [showWin, setShowWin] = useState(false);
    const transitionTimeout = useRef<number | null>(null);
    const doneRef = useRef(false);
    const total = questionIds.length || bundle.provinces.length;
    const done = total > 0 && currentIndex >= total;

    const { ms, reset: resetTimer } = useTimer(total > 0 && !done);
    const resetTimerRef = useRef(resetTimer);
    resetTimerRef.current = resetTimer;

  useEffect(() => () => {
    if (transitionTimeout.current != null) {
      window.clearTimeout(transitionTimeout.current);
    }
  }, []);

  useEffect(() => {
    setQuestionIds(createQuestionOrder(bundle.provinces));
    setCurrentIndex(0);
    setScore(0);
    setSelectedId(null);
    setAnswerState("idle");
    setShowWin(false);
    doneRef.current = false;
    if (transitionTimeout.current != null) {
      window.clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }
    resetTimerRef.current();
  }, [bundle]);

  useEffect(() => {
    if (!done) {
      return;
    }
    if (doneRef.current) {
      return;
    }
    doneRef.current = true;
    playWin();
    setShowWin(true);
  }, [done, playWin]);

  const provinceMap = useMemo(() => new Map(bundle.provinces.map((p) => [p.id, p])), [bundle.provinces]);
  const currentProvince = !done ? provinceMap.get(questionIds[currentIndex]) ?? null : null;

  const options = useMemo(() => {
    if (!currentProvince) return [];
    const others = bundle.provinces.filter((p) => p.id !== currentProvince.id);
    const distractors = shuffleArray(others).slice(0, Math.max(0, OPTION_COUNT - 1));
    return shuffleArray([...distractors, currentProvince]);
  }, [currentProvince?.id, bundle.provinces]);

  const provincePath = currentProvince ? atlasPaths[currentProvince.id] : undefined;

  const previewViewBox = useMemo(() => {
    if (!currentProvince || !provincePath) {
      return { x: 0, y: 0, w: 100, h: 100 };
    }
    const [ax, ay] = currentProvince.anchor_px;
    return viewBoxNearAnchorSmart(provincePath, ax, ay, 6, 600, 220);
  }, [currentProvince?.id, provincePath]);

  function handleAnswer(option: Province) {
    if (!currentProvince || done || answerState !== "idle") {
      return;
    }

    setSelectedId(option.id);
    const isCorrect = option.id === currentProvince.id;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      setAnswerState("correct");
      playCorrect();
    } else {
      setAnswerState("wrong");
      playWrong();
    }

    if (transitionTimeout.current != null) {
      window.clearTimeout(transitionTimeout.current);
    }

    transitionTimeout.current = window.setTimeout(() => {
      setSelectedId(null);
      setAnswerState("idle");
      setCurrentIndex((idx) => idx + 1);
      transitionTimeout.current = null;
    }, 900);
  }

  function resetGame() {
    setQuestionIds(createQuestionOrder(bundle.provinces));
    setCurrentIndex(0);
    setScore(0);
    setSelectedId(null);
    setAnswerState("idle");
    setShowWin(false);
    doneRef.current = false;
    if (transitionTimeout.current != null) {
      window.clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }
    resetTimerRef.current();
  }

  const answered = Math.min(currentIndex, total);
  const progressLabel = done ? "Hoàn thành" : `Câu ${currentIndex + 1}/${total}`;

  return (
    <>
      <div className="fixed inset-0 flex flex-col bg-slate-950 text-slate-100">
        <header className="flex items-center justify-between gap-4 border-b border-slate-800/60 bg-slate-900/70 px-6 py-4 backdrop-blur">
          <div className="text-xl font-semibold uppercase tracking-wide">Level 3: Đoán tỉnh qua bản đồ</div>
          <div className="flex items-center gap-3 text-lg">
            <span>Thời gian: <b>{(ms / 1000).toFixed(1)}s</b></span>
            <span className="hidden sm:inline" aria-hidden>•</span>
            <span>Điểm: <b>{score}</b></span>
            <span className="hidden sm:inline" aria-hidden>•</span>
            <span>{progressLabel}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onBack}
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium hover:bg-slate-700"
            >
              ← Quay lại
            </button>
            <button
              onClick={resetGame}
              className="rounded-lg border border-slate-700 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              Chơi lại
            </button>
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-8 overflow-auto px-6 py-8 lg:flex-row">
          <section className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-[580px] aspect-square rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-2xl">
              <div className="flex h-full items-center justify-center rounded-2xl bg-slate-950/60">
                {currentProvince && provincePath ? (
                  <svg
                    viewBox={`${previewViewBox.x} ${previewViewBox.y} ${previewViewBox.w} ${previewViewBox.h}`}
                    className="h-full w-full"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <path
                      d={provincePath}
                      fill={`url(#${gradientId})`}
                      stroke="#38bdf8"
                      strokeWidth={1.6}
                    />
                    <defs>
                      <linearGradient id={gradientId} x1="15%" y1="10%" x2="85%" y2="90%">
                        <stop offset="0%" stopColor="#1d4ed8" />
                        <stop offset="100%" stopColor="#38bdf8" />
                      </linearGradient>
                    </defs>
                  </svg>
                ) : (
                  <div className="text-center text-sm text-slate-400">
                    {done ? "Bạn đã hoàn thành tất cả câu hỏi!" : "Đang tải dữ liệu bản đồ..."}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="flex w-full max-w-xl flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
            <div className="text-base text-slate-300">
              Chọn tên tỉnh/thành ứng với hình bên trái:
            </div>
            <div className="flex flex-col gap-3">
              {options.map((option) => {
                const isSelected = selectedId === option.id;
                const isCorrectAnswer = currentProvince && option.id === currentProvince.id;
                const showCorrect = answerState === "wrong" && isCorrectAnswer;

                const baseClasses = "w-full rounded-2xl border px-4 py-4 text-left text-lg font-semibold transition";
                let stateClasses = "border-slate-700 bg-slate-800/80 hover:bg-slate-700";

                if (isSelected && answerState === "correct") {
                  stateClasses = "border-emerald-500 bg-emerald-600 text-white";
                } else if (isSelected && answerState === "wrong") {
                  stateClasses = "border-rose-500 bg-rose-600 text-white";
                } else if (showCorrect) {
                  stateClasses = "border-emerald-400 bg-emerald-500/80 text-white";
                }

                return (
                  <button
                    key={option.id}
                    onClick={() => handleAnswer(option)}
                    disabled={answerState !== "idle" || done}
                    className={`${baseClasses} ${stateClasses} disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {option.name_vi}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <div>Tiến độ: <b>{score}</b> điểm sau <b>{answered}</b> câu hỏi.</div>
              <div>Hoàn thành tất cả {total} câu để lưu lại thành tích của bạn.</div>
              {done && !showWin && (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="text-base font-semibold text-emerald-400">Bạn đã trả lời đúng {score}/{total}!</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowWin(true)}
                      className="flex-1 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
                    >
                      Xem bảng xếp hạng
                    </button>
                    <button
                      onClick={resetGame}
                      className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 hover:bg-slate-800"
                    >
                      Chơi lại
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>

      {showWin && (
        <WinDialog
          lbKey={LB_KEY}
          ms={ms}
          score={score}
          total={total}
          onClose={() => setShowWin(false)}
        />
      )}
    </>
  );
}

function WinDialog({ lbKey, ms, score, total, onClose }: { lbKey: string; ms: number; score: number; total: number; onClose: () => void }) {
  const [name, setName] = useState("");
  const [entries, setEntries] = useState<LBItem[]>(() => readLB(lbKey));
  const [saved, setSaved] = useState<LBItem | null>(null);

  const top5 = useMemo(() => entries.slice(0, 5), [entries]);
  const savedRank = saved ? top5.findIndex((e) => e.name === saved.name && e.ms === saved.ms) : -1;

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
          <div className="text-2xl font-semibold">Hoàn thành Level 3!</div>
          <div className="mt-1 text-sm text-slate-600">Thời gian: <b>{(ms / 1000).toFixed(1)}s</b></div>
          <div className="mt-1 text-sm text-slate-600">Điểm: <b>{score}/{total}</b></div>
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
