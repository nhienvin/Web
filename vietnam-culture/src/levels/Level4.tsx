import { useEffect, useMemo, useRef, useState } from "react";
import type { Bundle, Province } from "../types";
import { useTimer } from "../core/useTimer";
import { useSfx } from "../core/useSfx";
import { pushLB } from "../core/leaderboard";
import { useAtlasPaths } from "../core/useAtlas";
import { viewBoxNearAnchorSmart } from "../core/svg";

const LB_KEY = "lb:pack1:level4";
const OPTION_COUNT = 4;
const HINT_STAGE_COUNT = 4;
const HINT_DELAY_MS = 5000;
const HINT_SCORES = [100, 75, 50, 25];
// Ảnh gợi ý được lấy từ thư mục public/assets/province-photos với định dạng "{id}_{1-4}.{ext}".
const HINT_IMAGE_BASE_PATH = "/assets/province-photos";
const HINT_IMAGE_EXTENSIONS = ["webp", "jpg", "jpeg", "png"] as const;
const HARD_MODE_BONUS = 15;

type AnswerState = "idle" | "correct" | "wrong";
type LBItem = { name: string; ms: number };

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

const hintImageCache = new Map<string, string | null>();

function createIdVariants(id: string): string[] {
  const raw = (id || "").trim();
  if (!raw) return [];

  const variants = new Set<string>();
  variants.add(raw);

  if (raw.length < 2) {
    variants.add(raw.padStart(2, "0"));
  }

  if (/^\d+$/.test(raw)) {
    const padded2 = raw.padStart(2, "0");
    const padded3 = raw.padStart(3, "0");
    variants.add(padded2);
    variants.add(padded3);
  }

  const compact = raw.replace(/[^a-z0-9]+/gi, "").toLowerCase();
  if (compact && compact !== raw) {
    variants.add(compact);
  }

  return Array.from(variants);
}

function buildHintCandidates(id: string, stage: number): string[] {
  const suffix = `${stage}`;
  const idVariants = createIdVariants(id);
  if (!idVariants.length) return [];

  const candidates: string[] = [];
  for (const variant of idVariants) {
    for (const ext of HINT_IMAGE_EXTENSIONS) {
      candidates.push(`${HINT_IMAGE_BASE_PATH}/${variant}_${suffix}.${ext}`);
    }
  }
  return candidates;
}

async function findHintImageSrc(id: string, stage: number): Promise<string | null> {
  const cacheKey = `${id}#${stage}`;
  if (hintImageCache.has(cacheKey)) {
    return hintImageCache.get(cacheKey) ?? null;
  }

  const candidates = buildHintCandidates(id, stage);
  if (candidates.length === 0) {
    hintImageCache.set(cacheKey, null);
    return null;
  }

  if (typeof fetch !== "function") {
    const fallback = candidates[0] ?? null;
    hintImageCache.set(cacheKey, fallback);
    return fallback ?? null;
  }

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { method: "HEAD" });
      if (response.ok) {
        hintImageCache.set(cacheKey, candidate);
        return candidate;
      }
      if (response.status === 405) {
        const getResponse = await fetch(candidate, { method: "GET" });
        if (getResponse.ok) {
          hintImageCache.set(cacheKey, candidate);
          return candidate;
        }
      }
    } catch {
      // continue searching other candidates
    }
  }

  hintImageCache.set(cacheKey, null);
  return null;
}

export default function Level4({ bundle, onBack }: { bundle: Bundle; onBack: () => void }) {
  const atlasPaths = useAtlasPaths("/assets/atlas.svg");
  const { playCorrect, playWrong, playWin } = useSfx();

  const [questionIds, setQuestionIds] = useState<string[]>(() => createQuestionOrder(bundle.provinces));
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answerState, setAnswerState] = useState<AnswerState>("idle");
  const [showWin, setShowWin] = useState(false);
  const [hardMode, setHardMode] = useState(false);
  const [visibleHintCount, setVisibleHintCount] = useState(0);
  const [hintSources, setHintSources] = useState<(string | null)[]>(() => Array(HINT_STAGE_COUNT).fill(null));

  const transitionTimeout = useRef<number | null>(null);
  const hintTimeout = useRef<number | null>(null);
  const hintActive = useRef(false);
  const doneRef = useRef(false);
  const prevProvinceIdRef = useRef<string | null>(null);

  const total = questionIds.length || bundle.provinces.length;
  const done = total > 0 && currentIndex >= total;

  const { ms, reset: resetTimer } = useTimer(total > 0 && !done);
  const resetTimerRef = useRef(resetTimer);
  resetTimerRef.current = resetTimer;

  useEffect(() => () => {
    if (transitionTimeout.current != null) {
      window.clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }
    if (hintTimeout.current != null) {
      window.clearTimeout(hintTimeout.current);
      hintTimeout.current = null;
    }
  }, []);

  useEffect(() => {
    setQuestionIds(createQuestionOrder(bundle.provinces));
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setSelectedId(null);
    setAnswerState("idle");
    setShowWin(false);
    setVisibleHintCount(0);
    doneRef.current = false;
    stopHintSequence();
    if (transitionTimeout.current != null) {
      window.clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }
    resetTimerRef.current();
  }, [bundle]);

  useEffect(() => {
    if (!done) return;
    if (doneRef.current) return;
    doneRef.current = true;
    playWin();
    setShowWin(true);
    stopHintSequence();
  }, [done, playWin]);

  const provinceMap = useMemo(() => new Map(bundle.provinces.map((p) => [p.id, p])), [bundle.provinces]);
  const currentProvince = !done ? provinceMap.get(questionIds[currentIndex]) ?? null : null;

  useEffect(() => {
    if (!currentProvince) {
      setHintSources(Array(HINT_STAGE_COUNT).fill(null));
      return;
    }

    let cancelled = false;
    const provinceId = currentProvince.id;
    setHintSources(Array(HINT_STAGE_COUNT).fill(null));

    void (async () => {
      const resolved: (string | null)[] = [];
      for (let stage = 1; stage <= HINT_STAGE_COUNT; stage += 1) {
        const src = await findHintImageSrc(provinceId, stage);
        if (cancelled) {
          return;
        }
        resolved.push(src);
      }
      if (!cancelled) {
        setHintSources(resolved);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentProvince?.id]);

  const totalHintStages = useMemo(() => {
    const available = hintSources.reduce((count, src) => (src ? count + 1 : count), 0);
    return Math.max(1, Math.min(HINT_STAGE_COUNT, available || 0));
  }, [hintSources]);

  const hintSlots = useMemo(() => {
    return Array.from({ length: HINT_STAGE_COUNT }, (_, idx) => hintSources[idx] ?? null);
  }, [hintSources]);

  const options = useMemo(() => {
    if (!currentProvince) return [];
    const others = bundle.provinces.filter((p) => p.id !== currentProvince.id);
    const distractors = shuffleArray(others).slice(0, Math.max(0, OPTION_COUNT - 1));
    return shuffleArray([...distractors, currentProvince]);
  }, [currentProvince?.id, bundle.provinces]);

  const currentStageIndex = Math.max(0, Math.min(HINT_SCORES.length - 1, visibleHintCount > 0 ? visibleHintCount - 1 : 0));
  const currentQuestionPotential = HINT_SCORES[currentStageIndex] + (hardMode ? HARD_MODE_BONUS : 0);

  function clearHintTimer() {
    if (hintTimeout.current != null) {
      window.clearTimeout(hintTimeout.current);
      hintTimeout.current = null;
    }
  }

  function stopHintSequence() {
    hintActive.current = false;
    clearHintTimer();
  }

  useEffect(() => {
    const provinceId = currentProvince?.id ?? null;

    if (!provinceId) {
      prevProvinceIdRef.current = null;
      stopHintSequence();
      setVisibleHintCount(0);
      return;
    }

    const previousId = prevProvinceIdRef.current;
    const isNewProvince = previousId !== provinceId;
    prevProvinceIdRef.current = provinceId;

    stopHintSequence();

    let revealed = 0;
    setVisibleHintCount((prev) => {
      const basePrev = isNewProvince ? 0 : prev;
      const safePrev = Math.max(0, Math.min(basePrev, totalHintStages));
      const initial = totalHintStages > 0 ? Math.max(1, safePrev || 1) : 0;
      revealed = initial;
      return initial;
    });

    if (totalHintStages <= 0) {
      return () => {
        stopHintSequence();
      };
    }

    hintActive.current = true;

    function scheduleNext() {
      if (!hintActive.current) return;
      if (revealed >= totalHintStages) return;
      hintTimeout.current = window.setTimeout(() => {
        if (!hintActive.current) return;
        revealed += 1;
        setVisibleHintCount(revealed);
        scheduleNext();
      }, HINT_DELAY_MS);
    }

    scheduleNext();

    return () => {
      stopHintSequence();
    };
  }, [currentProvince?.id, totalHintStages]);

  useEffect(() => {
    return () => {
      stopHintSequence();
    };
  }, []);

  function handleAnswer(option: Province) {
    if (!currentProvince || done || answerState !== "idle") {
      return;
    }

    setSelectedId(option.id);

    const isCorrect = option.id === currentProvince.id;

    if (isCorrect) {
      const stageIndex = Math.max(0, Math.min(HINT_SCORES.length - 1, visibleHintCount > 0 ? visibleHintCount - 1 : 0));
      const basePoints = HINT_SCORES[stageIndex];
      const bonus = hardMode ? HARD_MODE_BONUS : 0;
      setScore((prev) => prev + basePoints + bonus);
      setCorrectCount((prev) => prev + 1);
      setAnswerState("correct");
      playCorrect();
    } else {
      setAnswerState("wrong");
      playWrong();
    }

    stopHintSequence();

    if (transitionTimeout.current != null) {
      window.clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }

    transitionTimeout.current = window.setTimeout(() => {
      setSelectedId(null);
      setAnswerState("idle");
      setVisibleHintCount(0);
      setCurrentIndex((idx) => idx + 1);
      transitionTimeout.current = null;
    }, 900);
  }

  function resetGame() {
    setQuestionIds(createQuestionOrder(bundle.provinces));
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setSelectedId(null);
    setAnswerState("idle");
    setShowWin(false);
    setVisibleHintCount(0);
    doneRef.current = false;
    stopHintSequence();
    if (transitionTimeout.current != null) {
      window.clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }
    resetTimerRef.current();
  }

  const answeredCount = Math.min(currentIndex, total);
  const progressLabel = done ? "Hoàn thành" : `Câu ${currentIndex + 1}/${total}`;

  return (
    <>
      <div className="fixed inset-0 flex flex-col bg-slate-950 text-slate-100">
        <header className="flex flex-col gap-4 border-b border-slate-800/60 bg-slate-900/70 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-semibold uppercase tracking-wide">Level 4: Đoán tỉnh qua ảnh</div>
            <div className="mt-1 text-sm text-slate-400">Mỗi 5 giây mở thêm 1 gợi ý, trả lời càng sớm điểm càng cao.</div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm sm:text-base">
            <span>Thời gian: <b>{(ms / 1000).toFixed(1)}s</b></span>
            <span className="hidden sm:inline" aria-hidden>
              •
            </span>
            <span>Điểm: <b>{score}</b></span>
            <span className="hidden sm:inline" aria-hidden>
              •
            </span>
            <span>{progressLabel}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
          <section className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-lg font-semibold">Gợi ý bằng hình ảnh</div>
                <div className="text-sm text-slate-400">
                  Điểm nếu trả lời ngay: <b className="text-emerald-400">{currentQuestionPotential}</b>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {hintSlots.map((src, idx) => {
                  const stageScore = HINT_SCORES[Math.min(idx, HINT_SCORES.length - 1)] + (hardMode ? HARD_MODE_BONUS : 0);
                  const isStageActive = idx < totalHintStages;
                  const isRevealed = isStageActive && idx < visibleHintCount;

                  return (
                    <div
                      key={`hint-${idx}`}
                      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60"
                    >
                      <div className="absolute left-0 top-0 rounded-br-xl bg-slate-900/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-300">
                        Gợi ý {idx + 1} · +{stageScore}
                      </div>
                      {isRevealed ? (
                        src ? (
                          <img
                            src={src}
                            alt={`Gợi ý ${idx + 1}`}
                            className="h-48 w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-48 w-full items-center justify-center px-4 text-center text-sm text-slate-400">
                            Chưa có ảnh cho gợi ý này.
                          </div>
                        )
                      ) : isStageActive ? (
                        <div className="flex h-48 w-full items-center justify-center px-4 text-center text-sm text-slate-500">
                          Ảnh sẽ mở sau {Math.max(1, (idx - visibleHintCount + 1) * (HINT_DELAY_MS / 1000))} giây.
                        </div>
                      ) : (
                        <div className="flex h-48 w-full items-center justify-center px-4 text-center text-sm text-slate-500">
                          Đang cập nhật thêm gợi ý.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="flex w-full max-w-xl flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="text-base text-slate-300">Chọn đáp án đúng:</div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-sky-400 focus:ring-sky-400"
                  checked={hardMode}
                  onChange={(event) => setHardMode(event.target.checked)}
                />
                <span>Chế độ khó (+{HARD_MODE_BONUS} điểm, hiển thị SVG)</span>
              </label>
            </div>

            <div className="grid gap-3">
              {options.map((option) => {
                const isSelected = selectedId === option.id;
                const isCorrectAnswer = currentProvince && option.id === currentProvince.id;
                const showCorrect = answerState === "wrong" && isCorrectAnswer;

                const baseClasses = "w-full rounded-2xl border transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
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
                    className={`${baseClasses} ${stateClasses} ${hardMode ? "flex flex-col items-center gap-3 px-4 py-4" : "px-4 py-4 text-left text-lg font-semibold"} disabled:cursor-not-allowed disabled:opacity-70`}
                  >
                    {hardMode ? (
                      <>
                        <ProvinceShapePreview province={option} atlasPaths={atlasPaths} className="h-24 w-full text-sky-300" />
                        <span className="sr-only">{option.name_vi}</span>
                      </>
                    ) : (
                      option.name_vi
                    )}
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
              <div>
                Bạn đã trả lời đúng <b>{correctCount}</b>/<b>{answeredCount}</b> câu.
              </div>
              <div>
                Tổng điểm hiện tại: <b>{score}</b> • Mỗi câu đúng ở chế độ khó được cộng thêm {HARD_MODE_BONUS} điểm.
              </div>
              {done && !showWin && (
                <div className="mt-4 flex flex-col gap-3">
                  <div className="text-base font-semibold text-emerald-400">Bạn đã hoàn thành tất cả câu hỏi!</div>
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
          correctCount={correctCount}
          total={total}
          onClose={() => setShowWin(false)}
        />
      )}
    </>
  );
}

function WinDialog({
  lbKey,
  ms,
  score,
  correctCount,
  total,
  onClose,
}: {
  lbKey: string;
  ms: number;
  score: number;
  correctCount: number;
  total: number;
  onClose: () => void;
}) {
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
      <div className="w-[min(92vw,520px)] rounded-2xl bg-white p-5 text-slate-900 shadow-xl anim-pop">
        <div className="text-center">
          <div className="text-2xl font-semibold">Hoàn thành Level 4!</div>
          <div className="mt-1 text-sm text-slate-600">
            Thời gian: <b>{(ms / 1000).toFixed(1)}s</b>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Điểm số: <b>{score}</b>
          </div>
          <div className="mt-1 text-sm text-slate-600">
            Đúng {correctCount}/{total} câu
          </div>
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
                    <td colSpan={3} className="px-3 py-3 text-center text-slate-500">
                      Chưa có dữ liệu
                    </td>
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
              onChange={(event) => setName(event.target.value)}
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

type ProvinceShapePreviewProps = {
  province: Province;
  atlasPaths: Record<string, string>;
  className?: string;
};

function ProvinceShapePreview({ province, atlasPaths, className }: ProvinceShapePreviewProps) {
  const path = atlasPaths[province.id];
  const [anchorX, anchorY] = province.anchor_px;

  const viewBox = useMemo(() => {
    if (!path) return null;
    return viewBoxNearAnchorSmart(path, anchorX, anchorY, 10, 600, 220);
  }, [path, anchorX, anchorY]);

  if (!path || !viewBox) {
    return (
      <div className="flex h-24 w-full items-center justify-center rounded-xl border border-dashed border-slate-600/60 bg-slate-900/60 text-center text-xs text-slate-400">
        Không có dữ liệu bản đồ
      </div>
    );
  }

  return (
    <svg
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
      className={className}
      preserveAspectRatio="xMidYMid meet"
    >
      <path d={path} fill="currentColor" fillOpacity={0.8} stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}