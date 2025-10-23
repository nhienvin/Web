import { useEffect, useMemo, useRef, useState } from "react";
import type { Bundle, Province } from "../types";
import { useTimer } from "../core/useTimer";
import { useSfx } from "../core/useSfx";
import { pushLB } from "../core/leaderboard";
import { useAtlasPaths } from "../core/useAtlas";
import { viewBoxNearAnchorSmart } from "../core/svg";

const LB_KEY = "lb:pack1:level5";
const OPTION_COUNT = 4;
const HARD_MODE_BONUS = 1;
const SOUND_BASE_PATH = "/assets/province-sounds";
const SOUND_EXTENSIONS = ["mp3", "ogg", "wav", "m4a", "aac"] as const;

const BASE_POINTS = 1;

type AnswerState = "idle" | "correct" | "wrong";
type LBItem = { name: string; ms: number };

type SoundStatus = "idle" | "loading" | "ready" | "missing";

const soundCache = new Map<string, string | null>();

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

function createIdVariants(id: string): string[] {
  const raw = (id || "").trim();
  if (!raw) return [];

  const variants = new Set<string>();
  variants.add(raw);

  if (raw.length < 2) {
    variants.add(raw.padStart(2, "0"));
  }

  if (/^\d+$/.test(raw)) {
    variants.add(raw.padStart(2, "0"));
    variants.add(raw.padStart(3, "0"));
  }

  const compact = raw.replace(/[^a-z0-9]+/gi, "").toLowerCase();
  if (compact && compact !== raw) {
    variants.add(compact);
  }

  return Array.from(variants);
}

function buildSoundCandidates(id: string): string[] {
  const variants = createIdVariants(id);
  if (!variants.length) return [];

  const candidates: string[] = [];
  for (const variant of variants) {
    for (const ext of SOUND_EXTENSIONS) {
      candidates.push(`${SOUND_BASE_PATH}/${variant}.${ext}`);
    }
  }
  return candidates;
}

async function findSoundSource(id: string): Promise<string | null> {
  if (soundCache.has(id)) {
    return soundCache.get(id) ?? null;
  }

  const candidates = buildSoundCandidates(id);
  if (candidates.length === 0) {
    soundCache.set(id, null);
    return null;
  }

  if (typeof fetch !== "function") {
    const fallback = candidates[0] ?? null;
    soundCache.set(id, fallback);
    return fallback;
  }

  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, { method: "HEAD" });
      if (response.ok) {
        soundCache.set(id, candidate);
        return candidate;
      }
      if (response.status === 405) {
        const getResponse = await fetch(candidate, { method: "GET" });
        if (getResponse.ok) {
          soundCache.set(id, candidate);
          return candidate;
        }
      }
    } catch {
      // try next candidate
    }
  }

  soundCache.set(id, null);
  return null;
}

export default function Level5({ bundle, onBack }: { bundle: Bundle; onBack: () => void }) {
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
  const [soundSrc, setSoundSrc] = useState<string | null>(null);
  const [soundStatus, setSoundStatus] = useState<SoundStatus>("idle");
  const [isPlaying, setIsPlaying] = useState(false);

  const transitionTimeout = useRef<number | null>(null);
  const doneRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
    stopAudioPlayback();
  }, []);

  useEffect(() => {
    setQuestionIds(createQuestionOrder(bundle.provinces));
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setSelectedId(null);
    setAnswerState("idle");
    setShowWin(false);
    setHardMode(false);
    setSoundSrc(null);
    setSoundStatus("idle");
    setIsPlaying(false);
    doneRef.current = false;
    if (transitionTimeout.current != null) {
      window.clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }
    stopAudioPlayback();
    resetTimerRef.current();
  }, [bundle]);

  useEffect(() => {
    if (!done) return;
    if (doneRef.current) return;
    doneRef.current = true;
    playWin();
    setShowWin(true);
    stopAudioPlayback();
  }, [done, playWin]);

  const provinceMap = useMemo(() => new Map(bundle.provinces.map((p) => [p.id, p])), [bundle.provinces]);
  const currentProvince = !done ? provinceMap.get(questionIds[currentIndex]) ?? null : null;

  useEffect(() => {
    const audio = audioRef.current;
    audio?.pause();
    if (audio) {
      audio.currentTime = 0;
    }
    setIsPlaying(false);

    const provinceId = currentProvince?.id ?? null;
    if (!provinceId) {
      setSoundSrc(null);
      setSoundStatus("idle");
      return;
    }

    let cancelled = false;
    setSoundStatus("loading");
    setSoundSrc(null);

    void (async () => {
      const src = await findSoundSource(provinceId);
      if (cancelled) {
        return;
      }
      if (src) {
        setSoundSrc(src);
        setSoundStatus("ready");
      } else {
        setSoundSrc(null);
        setSoundStatus("missing");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentProvince?.id]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    if (soundSrc) {
      audio.load();
    }
    setIsPlaying(false);
  }, [soundSrc]);

  function stopAudioPlayback() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {
      // ignore if failed to reset
    }
    setIsPlaying(false);
  }

  const options = useMemo(() => {
    if (!currentProvince) return [];
    const others = bundle.provinces.filter((p) => p.id !== currentProvince.id);
    const distractors = shuffleArray(others).slice(0, Math.max(0, OPTION_COUNT - 1));
    return shuffleArray([...distractors, currentProvince]);
  }, [currentProvince?.id, bundle.provinces]);

  const currentQuestionPotential = BASE_POINTS + (hardMode ? HARD_MODE_BONUS : 0);

  function handleAnswer(option: Province) {
    if (!currentProvince || done || answerState !== "idle") {
      return;
    }

    setSelectedId(option.id);

    const isCorrect = option.id === currentProvince.id;

    if (isCorrect) {
      setScore((prev) => prev + BASE_POINTS + (hardMode ? HARD_MODE_BONUS : 0));
      setCorrectCount((prev) => prev + 1);
      setAnswerState("correct");
      playCorrect();
    } else {
      setAnswerState("wrong");
      playWrong();
    }

    stopAudioPlayback();

    if (transitionTimeout.current != null) {
      window.clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }

    transitionTimeout.current = window.setTimeout(() => {
      setSelectedId(null);
      setAnswerState("idle");
      setCurrentIndex((idx) => idx + 1);
      transitionTimeout.current = null;
    }, 900);
  }

  function handleTogglePlayback() {
    if (!soundSrc || soundStatus !== "ready") {
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (isPlaying) {
      audio.pause();
      return;
    }

    void audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      // ignore playback error (likely due to browser restrictions)
    });
  }

  function resetGame() {
    setQuestionIds(createQuestionOrder(bundle.provinces));
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setSelectedId(null);
    setAnswerState("idle");
    setShowWin(false);
    setHardMode(false);
    setSoundSrc(null);
    setSoundStatus("idle");
    setIsPlaying(false);
    doneRef.current = false;
    if (transitionTimeout.current != null) {
      window.clearTimeout(transitionTimeout.current);
      transitionTimeout.current = null;
    }
    stopAudioPlayback();
    resetTimerRef.current();
  }

  const answeredCount = Math.min(currentIndex, total);
  const progressLabel = done ? "Hoàn thành" : `Câu ${currentIndex + 1}/${total}`;

  return (
    <>
      <div className="fixed inset-0 flex flex-col bg-slate-950 text-slate-100">
        <header className="flex flex-col gap-4 border-b border-slate-800/60 bg-slate-900/70 px-6 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-xl font-semibold uppercase tracking-wide">Level 5: Đoán tỉnh qua âm thanh</div>
            <div className="mt-1 text-sm text-slate-400">Nghe âm thanh gợi ý và chọn đúng tỉnh tương ứng.</div>
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
                <div className="text-lg font-semibold">Gợi ý bằng âm thanh</div>
                <div className="text-sm text-slate-400">
                  Điểm nếu trả lời đúng: <b className="text-emerald-400">{currentQuestionPotential}</b>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-center">
                {soundStatus === "loading" && <div className="text-sm text-slate-400">Đang tải âm thanh gợi ý...</div>}
                {soundStatus === "missing" && (
                  <div className="text-sm text-slate-400">
                    Chưa có âm thanh cho tỉnh này. Hãy trả lời dựa trên kiến thức của bạn!
                  </div>
                )}
                {soundStatus === "ready" && (
                  <div className="text-sm text-slate-300">
                    Nhấn nút bên dưới để nghe âm thanh đại diện cho tỉnh.
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleTogglePlayback}
                  disabled={soundStatus !== "ready" || answerState !== "idle" || done}
                  className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-6 py-2 text-sm font-semibold uppercase tracking-wide text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {soundStatus !== "ready"
                    ? "Âm thanh chưa sẵn sàng"
                    : isPlaying
                    ? "Đang phát..."
                    : "Nghe gợi ý"}
                </button>
                <audio
                  key={currentProvince?.id ?? "none"}
                  ref={audioRef}
                  src={soundSrc ?? undefined}
                  preload="auto"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  className="hidden"
                />
              </div>
            </div>
          </section>

          <section className="flex w-full max-w-xl flex-col gap-5 rounded-3xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="text-base text-slate-300">Chọn đáp án đúng:</div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-400 focus:ring-indigo-400"
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
                        <ProvinceShapePreview province={option} atlasPaths={atlasPaths} className="h-24 w-full text-indigo-300" />
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
          <div className="text-2xl font-semibold">Hoàn thành Level 5!</div>
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