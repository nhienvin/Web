import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Bundle } from "../types";
import { useTimer } from "../core/useTimer";
import { useSfx } from "../core/useSfx";

const DATA_URL = "/data/geoTriples.json";

type Difficulty = "easy" | "normal" | "hard";
type PhaseStep = "intro" | "phaseA" | "phaseB" | "summary";

const VN_LAT_MIN = 8.0;
const VN_LAT_MAX = 23.8;
const VN_LNG_MIN = 102.0;
const VN_LNG_MAX = 109.6;
const SOURCE_HIT_RADIUS = 24;
const MOUTH_HIT_RADIUS = 32;
const DEFAULT_BUFFER_METERS = 26000;
const TRACE_SAMPLE_POINTS = 140;
const BOARD_OUTLINE_SRC = "/assets/board_blank_outline.svg";

const BASIN_MARKER_RADIUS = 22;
const BASIN_DROP_RADIUS = 38;

const BASIN_MARKER_OFFSETS: Record<string, { x: number; y: number }> = {
  ky_cung_bang_giang: { x: -102, y: 78 },
  hong_thai_binh: { x: -102, y: 18 },
  ma: { x: -86, y: 10 },
  ca_lam: { x: -66, y: -15 },
  huong: { x: -136, y: -95 },
  vu_gia_thu_bon: { x: -146, y: -115 },
  tra_khuc: { x: -146, y: -145 },
  ba_da_rang: { x: -146, y: -165 },
  dong_nai: { x: -166, y: -215 },
  mekong_cuu_long:{ x: -76, y: -245 },
};

const PROVINCE_NAME_ALIASES: Record<string, string> = {
  thuathienhue: "46",
  hue: "46",
  tphcm: "79",
  tphochiminh: "79",
  tphchimnh: "79",
  hochiminh: "79",
  tphcminh: "79",
};

const FLOW_PRIORITY: Record<Difficulty, string[]> = {
  easy: ["hong_thai_binh", "huong", "mekong_cuu_long"],
  normal: [],
  hard: [],
};

const FLOW_MOUTH_RADIUS: Record<Difficulty, number> = {
  easy: MOUTH_HIT_RADIUS + 10,
  normal: MOUTH_HIT_RADIUS,
  hard: Math.max(18, MOUTH_HIT_RADIUS - 8),
};

type BasinDefinition = {
  id: string;
  riverName: string;
  aliases?: string[];
  macroRegion?: string;
  provinces?: string[];
  centroid: { lat: number; lng: number };
  icon?: string;
  hint?: string;
};

type PhaseAScoring = {
  attemptScores: number[];
  maxAttemptsPerDrop: number;
  mistakePenalty: number;
  speedBonus?: {
    thresholdSeconds: number;
    bonus: number;
  };
  completionThreshold?: {
    minCorrect: number;
    autoAdvance?: boolean;
  };
};

type PhaseAConfig = {
  id: string;
  label: string;
  type: "drag-drop";
  maxScore: number;
  timeLimitSeconds?: number;
  scoring: PhaseAScoring;
  ui?: {
    showBasinsOverlay?: boolean;
    progressBar?: boolean;
    hintToggle?: boolean;
  };
  feedback?: {
    correct?: {
      animation?: string;
      showRiverTracePreview?: boolean;
    };
    incorrect?: {
      animation?: string;
      maxShakes?: number;
      hintPool?: string[];
    };
  };
  basins: BasinDefinition[];
};

type FlowPolyline = {
  encoding?: string;
  value: string;
};

type FlowPathDefinition = {
  basinId: string;
  sourceLabel: string;
  source: { lat: number; lng: number };
  mouthOptions: { label: string; lat: number; lng: number }[];
  polyline?: FlowPolyline;
  durationTargetsSeconds?: number[];
};

type PhaseBScoring = {
  thresholds: { timeSeconds: number; score: number }[];
  hintPenalty?: number;
  mistakePenalty?: number;
  autoAssistAfterMistakes?: number;
  floorScore?: number;
};

type PhaseBConfig = {
  id: string;
  label: string;
  type: "path-draw";
  maxScore: number;
  defaultSampleSize?: number;
  timeLimitSecondsPerRiver?: number;
  scoring: PhaseBScoring;
  bufferMeters?: {
    easy?: number;
    normal?: number;
    hard?: number;
  };
  assist?: {
    contourLines?: {
      enabledAfterMistakes?: number;
      alpha?: number;
    };
    ghostTrace?: {
      enabledAfterMistakes?: number;
      opacity?: number;
    };
  };
  routing?: {
    requireSourceTap?: boolean;
    allowMultipleMouths?: string[];
    snapToleranceKm?: number;
  };
  flowPaths: FlowPathDefinition[];
};

type DifficultyPreset = {
  description?: string;
  phaseA?: {
    showBasinsOverlay?: boolean;
    includeDistractors?: string[];
    maxMistakesPerCard?: number;
    showProvinceLabels?: boolean;
  };
  phaseB?: {
    sampleSize?: number;
    bufferMeters?: number;
    hintAutoRevealSeconds?: number;
    requireFullTrace?: boolean;
  };
};

type GeoTriplesBadge = {
  id: string;
  title: string;
  description: string;
  criteria: Record<string, unknown>;
};

type FactSlide = { id: string; title: string; body: string };

type GeoTriplesData = {
  id: string;
  slug: string;
  version?: number;
  title: string;
  locale?: string;
  category?: string[];
  overview?: {
    introText?: string;
    phases?: string[];
  };
  phases: {
    phaseA: PhaseAConfig;
    phaseB: PhaseBConfig;
  };
  difficultyPresets: Record<Difficulty, DifficultyPreset>;
  badges?: GeoTriplesBadge[];
  assets?: {
    maps?: {
      baseRelief?: string;
      provinceBorders?: string;
    };
    layers?: {
      basinsGeoJson?: string;
      riverPolylines?: string;
    };
    icons?: Record<string, string>;
    audio?: Record<string, unknown>;
  };
  quickMatch?: {
    label: string;
    bankId: string;
    questionMix: { phaseA: number; phaseB: number };
    timeLimitSeconds: number;
    difficulty: Difficulty;
  };
  classroomSettings?: Record<string, unknown>;
  export?: Record<string, unknown>;
  postGame?: {
    factSlides?: FactSlide[];
  };
  qaTargets?: Record<string, unknown>;
  telemetry?: {
    events: string[];
  };
};

type RiverCard = {
  id: string;
  label: string;
  basinId?: string;
  type: "main" | "distractor";
  icon?: string;
  hint?: string;
  macroRegion?: string;
};

type CardState = RiverCard & {
  attempts: number;
  locked: boolean;
  correct: boolean;
  lastTriedBasin?: string;
  shakesLeft: number;
};

type BasinPlacement = {
  cardId: string;
  attempts: number;
  isCorrect: boolean;
};

type PhaseAResult = {
  score: number;
  ms: number;
  correctCount: number;
  mistakes: number;
  firstTryCount: number;
  secondTryCount: number;
  thirdTryCount: number;
  bonusAwarded: boolean;
};

type PreparedMouth = {
  label: string;
  point: BoardPoint;
  radius: number;
};

type PreparedFlow = {
  id: string;
  basin: BasinDefinition;
  sourceLabel: string;
  source: BoardPoint;
  mouthOptions: PreparedMouth[];
  referencePath: BoardPoint[];
  allowMultipleMouths: boolean;
  meta: FlowPathDefinition;
};

type BoardPoint = { x: number; y: number };

type PhaseBResult = {
  score: number;
  ms: number;
  asked: number;
  solved: number;
  mistakes: number;
  hintsUsed: { contour: boolean; ghost: boolean };
  totalMistakes: number;
  perfectStreak: boolean;
  fastestTraceSeconds: number;
  fanDamPha: boolean;
};

type PhaseAViewProps = {
  bundle: Bundle;
  config: PhaseAConfig;
  preset: DifficultyPreset;
  difficulty: Difficulty;
  onComplete: (result: PhaseAResult) => void;
  boardSize: { width: number; height: number };
  seed: number;
  assets?: { icons?: Record<string, string> };
  sfx: ReturnType<typeof useSfx>;
};

type PhaseBViewProps = {
  config: PhaseBConfig;
  preset: DifficultyPreset;
  difficulty: Difficulty;
  basins: BasinDefinition[];
  boardSize: { width: number; height: number };
  onComplete: (result: PhaseBResult) => void;
  seed: number;
  sfx: ReturnType<typeof useSfx>;
};

const DISTRACTOR_LIBRARY: Record<string, RiverCard> = {
  vam_co_reference: {
    id: "vam_co_reference",
    label: "Sông Vàm Cỏ",
    type: "distractor",
    hint: "Vàm Cỏ là phụ lưu gần Đồng Nai – đừng nhầm thành lưu vực riêng!",
    macroRegion: "Đông Nam Bộ",
  },
};

function useGeoTriplesData() {
  const [data, setData] = useState<GeoTriplesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error(`Không tải được ${DATA_URL} (${response.status})`);
        const json = (await response.json()) as GeoTriplesData;
        if (!cancelled) {
          setData(json);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error, loading };
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function shuffleArray<T>(input: T[], seed?: number): T[] {
  const arr = [...input];
  const random = typeof seed === "number" ? seededRandom(seed) : Math.random;
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function projectLatLng(lat: number, lng: number, width: number, height: number): BoardPoint {
  const x = ((lng - VN_LNG_MIN) / (VN_LNG_MAX - VN_LNG_MIN)) * width;
  const y = ((VN_LAT_MAX - lat) / (VN_LAT_MAX - VN_LAT_MIN)) * height;
  return { x, y };
}

function distanceBetween(a: BoardPoint, b: BoardPoint) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function distancePointToSegment(p: BoardPoint, a: BoardPoint, b: BoardPoint) {
  const l2 = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
  if (l2 === 0) return distanceBetween(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
  return distanceBetween(p, projection);
}

function decodePolyline(value: string, precision = 6) {
  if (!value) return [];
  const points: { lat: number; lng: number }[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const factor = Math.pow(10, precision);
  while (index < value.length) {
    let result = 0;
    let shift = 0;
    let byte: number;
    do {
      byte = value.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      byte = value.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    points.push({ lat: lat / factor, lng: lng / factor });
  }
  return points;
}

function sampleTrace(points: BoardPoint[], maxPoints: number): BoardPoint[] {
  if (points.length <= maxPoints) return points;
  const result: BoardPoint[] = [];
  const step = (points.length - 1) / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i += 1) {
    const idx = Math.min(points.length - 1, Math.round(i * step));
    result.push(points[idx]);
  }
  return result;
}

function computeMaxDeviation(trace: BoardPoint[], reference: BoardPoint[]) {
  if (reference.length < 2) return Infinity;
  const segments: [BoardPoint, BoardPoint][] = [];
  for (let i = 0; i < reference.length - 1; i += 1) {
    segments.push([reference[i], reference[i + 1]]);
  }
  let maxDist = 0;
  for (const point of trace) {
    let minDist = Infinity;
    for (const [a, b] of segments) {
      const dist = distancePointToSegment(point, a, b);
      if (dist < minDist) minDist = dist;
    }
    if (minDist > maxDist) maxDist = minDist;
  }
  return maxDist;
}

function kmPerPixelY(height: number) {
  const latSpan = VN_LAT_MAX - VN_LAT_MIN;
  const kmNorthSouth = latSpan * 111.32;
  return kmNorthSouth / height;
}

function normalizeLabel(value?: string) {
  if (!value) return '';
  return value
    .replace(/[d�]/g, (ch) => (ch === 'd' ? 'd' : 'D'))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

function buildProvinceAnchorMap(bundle: Bundle): Map<string, BoardPoint> {
  const map = new Map<string, BoardPoint>();
  for (const province of bundle.provinces) {
    const [x, y] = province.anchor_px || [];
    if (typeof x !== 'number' || typeof y !== 'number') continue;
    const keys = new Set<string>();
    const normalizedVi = normalizeLabel(province.name_vi);
    const normalizedEn = normalizeLabel(province.name_en);
    if (normalizedVi) keys.add(normalizedVi);
    if (normalizedEn) keys.add(normalizedEn);
    keys.add(province.id);
    for (const key of keys) {
      if (!key) continue;
      map.set(key, { x, y });
    }
  }
  for (const [alias, canonical] of Object.entries(PROVINCE_NAME_ALIASES)) {
    if (map.has(canonical)) {
      map.set(alias, map.get(canonical)!);
    }
  }
  return map;
}

function averagePoints(points: BoardPoint[]): BoardPoint {
  if (!points.length) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
  }
  return { x: sumX / points.length, y: sumY / points.length };
}

function formatSeconds(value: number) {
  const seconds = Math.floor(value);
  const rest = Math.floor((value - seconds) * 10);
  return `${seconds}.${rest}s`;
}

function createCards(
  basins: BasinDefinition[],
  preset: DifficultyPreset,
  icons?: Record<string, string>,
  seed?: number,
): RiverCard[] {
  const baseCards: RiverCard[] = basins.map((basin) => ({
    id: basin.id,
    label: basin.riverName,
    basinId: basin.id,
    type: "main",
    icon: basin.icon ? icons?.[basin.icon] ?? basin.icon : undefined,
    hint: basin.hint,
    macroRegion: basin.macroRegion,
  }));
  const distractorIds = preset.phaseA?.includeDistractors ?? [];
  const distractors: RiverCard[] = distractorIds
    .map((id) => {
      if (DISTRACTOR_LIBRARY[id]) return DISTRACTOR_LIBRARY[id];
      return null;
    })
    .filter(Boolean) as RiverCard[];
  return shuffleArray([...baseCards, ...distractors], seed);
}

function prepareFlows(
  flowPaths: FlowPathDefinition[],
  basins: BasinDefinition[],
  board: { width: number; height: number },
  difficulty: Difficulty,
  preset: DifficultyPreset,
  seed?: number,
): PreparedFlow[] {
  const dictionary = new Map(basins.map((item) => [item.id, item]));
  const mouthRadius = FLOW_MOUTH_RADIUS[difficulty] ?? MOUTH_HIT_RADIUS;
  const baseSeed = seed ?? 0;
  const base = flowPaths
    .map((flow) => {
      const basin = dictionary.get(flow.basinId);
      if (!basin) return null;
      const reference = flow.polyline?.value
        ? decodePolyline(flow.polyline.value, flow.polyline.encoding === "polyline5" ? 5 : 6).map((pt) =>
            projectLatLng(pt.lat, pt.lng, board.width, board.height),
          )
        : [projectLatLng(flow.source.lat, flow.source.lng, board.width, board.height)];

      if (!flow.polyline || reference.length < 2) {
        const firstMouth = flow.mouthOptions[0];
        if (firstMouth) {
          reference.push(projectLatLng(firstMouth.lat, firstMouth.lng, board.width, board.height));
        }
      }

      return {
        id: `${flow.basinId}`,
        basin,
        sourceLabel: flow.sourceLabel,
        source: projectLatLng(flow.source.lat, flow.source.lng, board.width, board.height),
        mouthOptions: flow.mouthOptions.map((mouth) => ({
          label: mouth.label,
          point: projectLatLng(mouth.lat, mouth.lng, board.width, board.height),
          radius: mouthRadius,
        })),
        referencePath: reference,
        allowMultipleMouths: Boolean(flow.mouthOptions.length > 1),
        meta: flow,
      } satisfies PreparedFlow;
    })
    .filter(Boolean) as PreparedFlow[];

  const priorityIds = FLOW_PRIORITY[difficulty] ?? [];
  let ordered: PreparedFlow[];

  if (priorityIds.length) {
    const prioritySet = new Set(priorityIds);
    const prioritized = shuffleArray(
        priorityIds
          .map((id) => base.find((flow) => flow.basin.id === id))
          .filter(Boolean) as PreparedFlow[],
        baseSeed ^ 0x5a5a,
      );
      const remainder = shuffleArray(
        base.filter((flow) => !prioritySet.has(flow.basin.id)),
        baseSeed,
      );
    ordered = [...prioritized, ...remainder];
  } else {
    ordered = shuffleArray(base, seed);
  }

  const allowCount = preset.phaseB?.sampleSize ?? undefined;
  if (allowCount && ordered.length > allowCount) {
    return ordered.slice(0, allowCount);
  }
  return ordered;
}

function pickHint(feedback?: PhaseAConfig["feedback"]) {
  const hints = feedback?.incorrect?.hintPool ?? [];
  if (!hints.length) return null;
  const index = Math.floor(Math.random() * hints.length);
  return hints[index] ?? null;
}

function computePhaseABadges(
  badges: GeoTriplesBadge[],
  phaseA: PhaseAResult,
  phaseB: PhaseBResult,
): GeoTriplesBadge[] {
  if (!badges?.length) return [];
  const unlocked: GeoTriplesBadge[] = [];
  for (const badge of badges) {
    switch (badge.id) {
      case "thu_linh_luu_vuc":
        if (phaseA.firstTryCount >= 9) unlocked.push(badge);
        break;
      case "dong_chay_chuan":
        if (phaseB.asked > 0 && phaseB.solved === phaseB.asked && phaseB.ms / 1000 <= 60) {
          unlocked.push(badge);
        }
        break;
      case "mat_dia_hinh":
        if (!phaseB.hintsUsed.contour && !phaseB.hintsUsed.ghost) unlocked.push(badge);
        break;
      case "fan_dam_pha":
        if (phaseB.fanDamPha) unlocked.push(badge);
        break;
      default:
        break;
    }
  }
  return unlocked;
}

function PhaseAView({
  bundle,
  config,
  preset,
  difficulty,
  onComplete,
  boardSize,
  seed,
  assets,
  sfx,
}: PhaseAViewProps) {
  const { playCorrect, playWrong } = sfx;
  const cards = useMemo(
    () => createCards(config.basins, preset, assets?.icons, seed),
    [config.basins, preset, assets?.icons, seed],
  );
  const provinceAnchors = useMemo(() => buildProvinceAnchorMap(bundle), [bundle]);
  const basinBoardPositions = useMemo(() => {
    const map = new Map<string, BoardPoint>();
    for (const basin of config.basins) {
      const provinceNames = basin.provinces ?? [];
      const anchors = provinceNames
      .map((name) => {
        const normalized = normalizeLabel(name);
        return (
          provinceAnchors.get(normalized) ||
          (PROVINCE_NAME_ALIASES[normalized]
            ? provinceAnchors.get(PROVINCE_NAME_ALIASES[normalized])
            : undefined)
        );
      })
      .filter((point): point is BoardPoint => Boolean(point));
      if (anchors.length) {
        map.set(basin.id, averagePoints(anchors));
        continue;
      }
      if (basin.centroid) {
        map.set(
          basin.id,
          projectLatLng(basin.centroid.lat, basin.centroid.lng, boardSize.width, boardSize.height),
        );
      }
    }
    return map;
  }, [config.basins, provinceAnchors, boardSize.width, boardSize.height]);
  const [cardStates, setCardStates] = useState<Record<string, CardState>>(() =>
    Object.fromEntries(
      cards.map((card) => [
        card.id,
        {
          ...card,
          attempts: 0,
          locked: false,
          correct: false,
          shakesLeft: config.feedback?.incorrect?.maxShakes ?? 2,
        },
      ]),
    ),
  );
  const [placements, setPlacements] = useState<Record<string, BasinPlacement | null>>(() =>
    Object.fromEntries(config.basins.map((basin) => [basin.id, null])),
  );
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [firstTry, setFirstTry] = useState(0);
  const [secondTry, setSecondTry] = useState(0);
  const [thirdTry, setThirdTry] = useState(0);
  const [feedbackHint, setFeedbackHint] = useState<string | null>(null);
  const [phaseComplete, setPhaseComplete] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [shakeTarget, setShakeTarget] = useState<string | null>(null);
  const timer = useTimer(!phaseComplete);
  useEffect(() => {
    timer.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const targetTotal = config.basins.length;
  const overlayEnabled = preset.phaseA?.showBasinsOverlay ?? config.ui?.showBasinsOverlay ?? true;

  const handleCardSelect = useCallback(
    (cardId: string) => {
      const cardState = cardStates[cardId];
      if (!cardState || cardState.locked) return;
      setSelectedCard((current) => (current === cardId ? null : cardId));
      setFeedbackHint(null);
    },
    [cardStates],
  );

  const handleDrop = useCallback(
    (basinId: string, incomingId?: string) => {
      if (phaseComplete) return;
      const cardId = incomingId ?? selectedCard;
      if (!cardId) return;
      const cardState = cardStates[cardId];
      if (!cardState || cardState.locked) return;

      const isCorrect = cardState.type === "main" && cardState.basinId === basinId;
      const maxMistakesPerCard = preset.phaseA?.maxMistakesPerCard ?? config.scoring.maxAttemptsPerDrop;
      if (placements[basinId]?.isCorrect) return;

      if (isCorrect) {
        const attemptIndex = Math.min(cardState.attempts, config.scoring.attemptScores.length - 1);
        const gained = config.scoring.attemptScores[attemptIndex] ?? 0;
        const newPlacement: BasinPlacement = {
          cardId,
          attempts: cardState.attempts + 1,
          isCorrect: true,
        };
        setPlacements((prev) => ({ ...prev, [basinId]: newPlacement }));
        setCardStates((prev) => ({
          ...prev,
          [cardId]: {
            ...prev[cardId],
            locked: true,
            correct: true,
            attempts: cardState.attempts + 1,
          },
        }));
        setScore((prev) => prev + gained);
        setCorrectCount((prev) => prev + 1);
        if (attemptIndex === 0) setFirstTry((prev) => prev + 1);
        if (attemptIndex === 1) setSecondTry((prev) => prev + 1);
        if (attemptIndex >= 2) setThirdTry((prev) => prev + 1);
        setSelectedCard(null);
        setFeedbackHint(null);
        playCorrect();
      } else {
        playWrong();
        const nextAttempts = cardState.attempts + 1;
        const newMistakes = mistakes + 1;
        setMistakes(newMistakes);
        setScore((prev) => Math.max(0, prev - config.scoring.mistakePenalty));
        setCardStates((prev) => ({
          ...prev,
          [cardId]: {
            ...prev[cardId],
            attempts: nextAttempts,
            lastTriedBasin: basinId,
          },
        }));
        setShakeTarget(basinId);
        setTimeout(() => setShakeTarget(null), 420);
        if (maxMistakesPerCard && nextAttempts >= maxMistakesPerCard) {
          setFeedbackHint("Bạn đã thử quá nhiều lần – đổi thẻ khác nhé!");
        } else {
          setFeedbackHint(pickHint(config.feedback) ?? "Thử xem vùng núi / đồng bằng nào hợp nhé!");
        }
      }
    },
    [
      phaseComplete,
      selectedCard,
      cardStates,
      preset.phaseA?.maxMistakesPerCard,
      config.scoring.mistakePenalty,
      config.scoring.attemptScores,
      placements,
      mistakes,
      playCorrect,
      playWrong,
    ],
  );

  useEffect(() => {
    if (phaseComplete) return;
    const completionThreshold = config.scoring.completionThreshold?.minCorrect ?? targetTotal;
    if (correctCount >= completionThreshold) {
      const thresholdSeconds = config.scoring.speedBonus?.thresholdSeconds ?? Infinity;
      const elapsedSeconds = timer.ms / 1000;
      const bonus = elapsedSeconds <= thresholdSeconds ? config.scoring.speedBonus?.bonus ?? 0 : 0;
      const result: PhaseAResult = {
        score: score + (bonus ?? 0),
        ms: timer.ms,
        correctCount,
        mistakes,
        firstTryCount: firstTry,
        secondTryCount: secondTry,
        thirdTryCount: thirdTry,
        bonusAwarded: Boolean(bonus && bonus > 0),
      };
      setPhaseComplete(true);
      onComplete(result);
    }
  }, [
    phaseComplete,
    correctCount,
    config.scoring.completionThreshold?.minCorrect,
    targetTotal,
    timer.ms,
    score,
    mistakes,
    firstTry,
    secondTry,
    thirdTry,
    config.scoring.speedBonus?.thresholdSeconds,
    config.scoring.speedBonus?.bonus,
    onComplete,
  ]);

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-3 rounded-2xl bg-emerald-950/90 p-4 text-white shadow-lg md:flex-row md:items-center">
        <div>
          <div className="text-xs uppercase tracking-wide text-emerald-200/90">
            Pha A — Kéo tên sông vào đúng lưu vực
          </div>
          <div className="text-lg font-semibold">
            {correctCount}/{targetTotal} lưu vực đã khớp
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm md:text-base">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-emerald-800/80 px-2 py-1 text-xs uppercase tracking-wide text-emerald-200">
              Điểm
            </span>
            <span className="font-semibold">{score}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-white/10 px-2 py-1 text-xs uppercase tracking-wide text-emerald-200">
              Thời gian
            </span>
            <span className="font-semibold">{formatSeconds(timer.ms / 1000)}</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-200/90">
            <span className="rounded-full bg-white/10 px-2 py-1 text-xs uppercase tracking-wide">Sai</span>
            <span className="font-semibold text-white">{mistakes}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
  <div className="flex-1 rounded-2xl border border-slate-800/60 bg-slate-900/85 shadow-xl">
    <div
      className="relative h-full w-full overflow-hidden rounded-2xl"
      style={{ aspectRatio: `${boardSize.width}/${boardSize.height}` }}
    >
      <svg
        viewBox={`0 0 ${boardSize.width} ${boardSize.height}`}
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        <image href={BOARD_OUTLINE_SRC} width={boardSize.width} height={boardSize.height} opacity={0.45} />
        {config.basins.map((basin) => {
          const fallback = basin.centroid
            ? projectLatLng(basin.centroid.lat, basin.centroid.lng, boardSize.width, boardSize.height)
            : { x: boardSize.width / 2, y: boardSize.height / 2 };
          // const position = basinBoardPositions.get(basin.id) ?? fallback;
          const offset = BASIN_MARKER_OFFSETS[basin.id] ?? { x: 0, y: 0 };
          const position = {
            x: (basinBoardPositions.get(basin.id) ?? fallback).x + offset.x,
            y: (basinBoardPositions.get(basin.id) ?? fallback).y + offset.y,
          };
          const placement = placements[basin.id];
          const isCorrect = placement?.isCorrect ?? false;
          const highlight = shakeTarget === basin.id;

          return (
            <g key={basin.id} transform={`translate(${position.x}, ${position.y})`}>
              <circle
                r={BASIN_MARKER_RADIUS}
                className={`transition-all duration-300 ${
                  highlight
                    ? "animate-[wiggle_0.4s_ease-in-out] fill-red-400/40 stroke-red-200"
                    : isCorrect
                      ? "fill-emerald-300/35 stroke-emerald-200"
                      : "fill-emerald-200/20 stroke-emerald-200/45"
                }`}
                strokeWidth={isCorrect ? 3 : 2}
              />
              <circle
                r={BASIN_DROP_RADIUS}
                className="cursor-pointer fill-transparent"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const riverId = event.dataTransfer.getData("application/river-id");
                  handleDrop(basin.id, riverId);
                }}
                onClick={() => handleDrop(basin.id)}
              />
            </g>
          );
        })}

        <style>
          {`@keyframes wiggle { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }`}
        </style>
      </svg>
    </div>
  </div>

  <aside className="w-full shrink-0 rounded-2xl border border-slate-800/60 bg-slate-900/85 p-4 shadow-xl lg:max-w-sm">
    <div className="rounded-xl bg-slate-800/70 px-4 py-3 text-sm text-slate-200">
      <div className="font-semibold text-emerald-200">Kéo thẻ sông sang vùng lưu vực phù hợp</div>
      <div className="mt-1 text-xs text-slate-300">
        Giữ chuột hoặc chạm giữ thẻ bên phải, kéo ngang sang vùng phát sáng trên bản đồ.
      </div>
    </div>
    <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
      {cards.map((card) => {
        const state = cardStates[card.id];
        if (!state) return null;
        const isSelected = selectedCard === card.id;
        const isLocked = state.locked;

        return (
          <button
            key={card.id}
            className={`group flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm transition
              ${isLocked ? "border-emerald-300/70 bg-emerald-400/20 text-emerald-100" : ""}
              ${isSelected ? "border-emerald-300/80 bg-emerald-500/20 text-white shadow-lg" : ""}
              ${
                !isLocked && !isSelected
                  ? "border-slate-600 bg-slate-700/40 text-slate-100 hover:border-emerald-400/60 hover:bg-emerald-500/15"
                  : ""
              }`}
            draggable={!isLocked}
            onDragStart={(event) => {
              if (isLocked) {
                event.preventDefault();
                return;
              }
              event.dataTransfer.setData("application/river-id", card.id);
              event.dataTransfer.effectAllowed = "move";
            }}
            onClick={() => handleCardSelect(card.id)}
          >
            <div>
              <div className="font-semibold">{state.label}</div>
              <div className="text-[11px] uppercase tracking-wide text-emerald-200/80">
                {state.type === "distractor" ? "Thử thách" : state.macroRegion ?? "Lưu vực"}
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-100">
              {!isLocked && state.attempts > 0 && (
                <span className="rounded-full bg-slate-900/70 px-2 py-1">Thử: {state.attempts}</span>
              )}
              {isLocked && (
                <span className="rounded-full bg-emerald-500/80 px-2 py-1 text-emerald-950">
                  ✓
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  </aside>
</div>
    </div>
  );
}

function PhaseBView({
  config,
  preset,
  difficulty,
  basins,
  boardSize,
  onComplete,
  seed,
  sfx,
}: PhaseBViewProps) {
  const { playCorrect, playWrong } = sfx;
  const flows = useMemo(
    () => prepareFlows(config.flowPaths, basins, boardSize, difficulty, preset, seed),
    [config.flowPaths, basins, boardSize, difficulty, preset, seed],
  );
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [solved, setSolved] = useState(0);
  const [anyContour, setAnyContour] = useState(false);
  const [anyGhost, setAnyGhost] = useState(false);
  const [fanDamPha, setFanDamPha] = useState(false);
  const [fastestTrace, setFastestTrace] = useState<number | null>(null);
  const [phaseComplete, setPhaseComplete] = useState(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const [trace, setTrace] = useState<BoardPoint[]>([]);
  const [isTracing, setIsTracing] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [contourActive, setContourActive] = useState(false);
  const [ghostActive, setGhostActive] = useState(false);
  const totalTimer = useTimer(!phaseComplete);
  const questionTimer = useTimer(!phaseComplete);

  useEffect(() => {
    totalTimer.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    questionTimer.reset();
    setTrace([]);
    setAttempts(0);
    setContourActive(false);
    setGhostActive(false);
    setFeedback(null);
  }, [index, questionTimer]);

  const bufferMeters =
    preset.phaseB?.bufferMeters ?? config.bufferMeters?.[difficulty] ?? DEFAULT_BUFFER_METERS;
  const kmPerPixel = kmPerPixelY(boardSize.height);
  const bufferPx = (bufferMeters / 1000) / kmPerPixel;

  const current = flows[index];
  const total = flows.length;

  useEffect(() => {
    if (!phaseComplete && index >= flows.length) {
      const result: PhaseBResult = {
        score,
        ms: totalTimer.ms,
        asked: total,
        solved,
        mistakes,
        hintsUsed: { contour: anyContour, ghost: anyGhost },
        totalMistakes: mistakes,
        perfectStreak: solved === total && mistakes === 0,
        fastestTraceSeconds: fastestTrace ?? 0,
        fanDamPha,
      };
      setPhaseComplete(true);
      onComplete(result);
    }
  }, [
    phaseComplete,
    index,
    flows.length,
    score,
    totalTimer.ms,
    total,
    solved,
    mistakes,
    anyContour,
    anyGhost,
    fastestTrace,
    fanDamPha,
    onComplete,
  ]);

  const projectPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>): BoardPoint | null => {
      const board = boardRef.current;
      if (!board) return null;
      const bounds = board.getBoundingClientRect();
      const x = ((event.clientX - bounds.left) / bounds.width) * boardSize.width;
      const y = ((event.clientY - bounds.top) / bounds.height) * boardSize.height;
      return { x, y };
    },
    [boardSize.width, boardSize.height],
  );

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!current || isTracing) return;
      const point = projectPointer(event);
      if (!point) return;
      const dist = distanceBetween(point, current.source);
      if (dist > SOURCE_HIT_RADIUS) {
        setFeedback("Chạm đúng biểu tượng thượng nguồn (giọt nước) để bắt đầu nhé!");
        return;
      }
      setIsTracing(true);
      setTrace([current.source]);
      (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
      setFeedback(null);
    },
    [current, isTracing, projectPointer],
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isTracing) return;
      const point = projectPointer(event);
      if (!point) return;
      setTrace((prev) => {
        if (!prev.length) return [point];
        const last = prev[prev.length - 1];
        if (distanceBetween(last, point) < 4) return prev;
        return [...prev, point];
      });
    },
    [isTracing, projectPointer],
  );

  const finalizeAttempt = useCallback(
    (success: boolean, awardedScore: number, selectedMouth?: PreparedMouth) => {
      setAttempts(0);
      setTrace([]);
      setIsTracing(false);
      setIndex((prev) => prev + 1);
      setFeedback(success ? "Tuyệt! Dòng chảy chính đã hiện ra." : "Có gợi ý mới, thử quan sát rồi kéo lại nhé.");
      if (success) {
        setSolved((prev) => prev + 1);
        setScore((prev) => prev + awardedScore);
        playCorrect();
        const elapsed = questionTimer.ms / 1000;
        setFastestTrace((prev) => (prev === null ? elapsed : Math.min(prev, elapsed)));
        if (
          current?.basin.id === "huong" &&
          selectedMouth &&
          selectedMouth.label.toLowerCase().includes("tam giang")
        ) {
          setFanDamPha(true);
        }
      } else {
        playWrong();
      }
      questionTimer.reset();
    },
    [current?.basin.id, playCorrect, playWrong, questionTimer],
  );

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!isTracing || !current) return;
      const point = projectPointer(event);
      const path = trace.length ? [...trace, ...(point ? [point] : [])] : [current.source];
      const simplified = sampleTrace(path, TRACE_SAMPLE_POINTS);
      const lastPoint = simplified[simplified.length - 1];
      const mouth =
        lastPoint &&
        current.mouthOptions.find((candidate) => distanceBetween(candidate.point, lastPoint) <= candidate.radius);

      if (mouth) {
        const maxDeviation = computeMaxDeviation(simplified, current.referencePath);
        const withinBuffer = maxDeviation <= bufferPx;
        if (withinBuffer) {
          const elapsedSeconds = questionTimer.ms / 1000;
          const thresholds = config.scoring.thresholds;
          let baseScore = thresholds[thresholds.length - 1]?.score ?? 10;
          for (const threshold of thresholds) {
            if (elapsedSeconds <= threshold.timeSeconds) {
              baseScore = threshold.score;
              break;
            }
          }
          if (contourActive || ghostActive) {
            baseScore -= config.scoring.hintPenalty ?? 5;
          }
          const penalty = (config.scoring.mistakePenalty ?? 2) * attempts;
          const awarded = Math.max(config.scoring.floorScore ?? 5, baseScore - penalty);
          finalizeAttempt(true, awarded, mouth);
          return;
        }
      }

      // failure
      const nextAttempts = attempts + 1;
      setAttempts(nextAttempts);
      const totalMistakeCount = mistakes + 1;
      setMistakes(totalMistakeCount);

      const contourThreshold = config.assist?.contourLines?.enabledAfterMistakes ?? 2;
      const ghostThreshold = config.assist?.ghostTrace?.enabledAfterMistakes ?? 3;
      if (nextAttempts >= contourThreshold) {
        setContourActive(true);
        setAnyContour(true);
      }
      if (nextAttempts >= ghostThreshold) {
        setGhostActive(true);
        setAnyGhost(true);
      }
      const autoAssistCutoff = config.scoring.autoAssistAfterMistakes ?? 3;
      if (nextAttempts >= autoAssistCutoff) {
        const awarded = config.scoring.floorScore ?? 5;
        finalizeAttempt(true, awarded, mouth);
        setFeedback("Đã mở đường gợi ý. Quan sát kỹ và bám theo dòng chính nhé!");
        return;
      }

      setFeedback("Chưa đúng hướng rồi. Để ý hướng đổ ra biển và địa hình cao thấp nhé!");
      setTrace([]);
      setIsTracing(false);
      playWrong();
    },
    [
      attempts,
      finalizeAttempt,
      trace,
      current,
      bufferPx,
      contourActive,
      ghostActive,
      config.scoring.thresholds,
      config.scoring.hintPenalty,
      config.scoring.mistakePenalty,
      config.scoring.floorScore,
      config.scoring.autoAssistAfterMistakes,
      config.assist?.contourLines?.enabledAfterMistakes,
      config.assist?.ghostTrace?.enabledAfterMistakes,
      mistakes,
      projectPointer,
      questionTimer.ms,
      playWrong,
    ],
  );

  if (!current) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-white">
        <div className="text-lg font-semibold">Đang chuẩn bị câu hỏi tiếp theo…</div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-col justify-between gap-3 rounded-2xl bg-sky-950/90 p-4 text-white shadow-lg md:flex-row md:items-center">
        <div>
          <div className="text-xs uppercase tracking-wide text-sky-200/90">
            Pha B — Dựng dòng chảy từ thượng nguồn tới cửa biển
          </div>
          <div className="text-lg font-semibold">
            {index + 1}/{total} sông
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm md:text-base">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-sky-800/80 px-2 py-1 text-xs uppercase tracking-wide text-sky-200">
              Điểm
            </span>
            <span className="font-semibold">{score}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-white/10 px-2 py-1 text-xs uppercase tracking-wide text-sky-200/80">
              Thời gian
            </span>
            <span className="font-semibold">{formatSeconds(totalTimer.ms / 1000)}</span>
          </div>
          <div className="flex items-center gap-2 text-sky-200/90">
            <span className="rounded-full bg-white/10 px-2 py-1 text-xs uppercase tracking-wide">Sai</span>
            <span className="font-semibold text-white">{mistakes}</span>
          </div>
        </div>
      </div>

      <div className="relative flex-1 rounded-2xl bg-slate-900/90 p-4 shadow-xl">
        <div
          ref={boardRef}
          className="relative mx-auto h-full max-w-5xl overflow-hidden rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900"
          style={{ aspectRatio: `${boardSize.width}/${boardSize.height}` }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <svg
            viewBox={`0 0 ${boardSize.width} ${boardSize.height}`}
            className="absolute inset-0 h-full w-full"
            preserveAspectRatio="xMidYMid meet"
          >
            <rect
              x={0}
              y={0}
              width={boardSize.width}
              height={boardSize.height}
              fill="url(#relief)"
              opacity={0.25}
            />
            <defs>
              <radialGradient id="sourceGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.05" />
              </radialGradient>
              <radialGradient id="mouthGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
              </radialGradient>
              <linearGradient id="relief" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f172a" />
                <stop offset="100%" stopColor="#020617" />
              </linearGradient>
            </defs>

            {contourActive && (
              <rect
                x={0}
                y={0}
                width={boardSize.width}
                height={boardSize.height}
                fill="url(#contours)"
                opacity={config.assist?.contourLines?.alpha ?? 0.35}
              />
            )}

            <defs>
              <pattern id="contours" patternUnits="userSpaceOnUse" width="40" height="40">
                <path
                  d="M0 10 Q10 0 20 10 T40 10 M0 30 Q10 20 20 30 T40 30"
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeOpacity="0.7"
                />
              </pattern>
            </defs>

            {current.referencePath.length > 1 && (
              <polyline
                points={current.referencePath.map((pt) => `${pt.x},${pt.y}`).join(" ")}
                stroke="#3b82f6"
                strokeWidth={ghostActive ? 4 : 2}
                strokeDasharray={ghostActive ? "0" : "10 12"}
                strokeOpacity={ghostActive ? 0.65 : 0.35}
                fill="none"
              />
            )}

            {trace.length > 1 && (
              <polyline
                points={trace.map((pt) => `${pt.x},${pt.y}`).join(" ")}
                stroke="#fb7185"
                strokeWidth={6}
                strokeOpacity={0.9}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            )}

            <g transform={`translate(${current.source.x}, ${current.source.y})`}>
              <circle r={68} fill="url(#sourceGlow)" opacity={0.45} />
              <circle r={14} fill="#38bdf8" className="animate-ping" opacity={0.65} />
              <circle r={10} fill="#0ea5e9" stroke="#38bdf8" strokeWidth={2} />
            </g>

            {current.mouthOptions.map((mouth) => (
              <g key={mouth.label} transform={`translate(${mouth.point.x}, ${mouth.point.y})`}>
                <circle r={74} fill="url(#mouthGlow)" opacity={0.22} />
                <circle r={mouth.radius} fill="transparent" stroke="#fbbf24" strokeWidth={1.4} />
              </g>
            ))}
          </svg>

          <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-4 text-xs text-white/90 md:p-6 md:text-sm">
            <div className="rounded-xl bg-slate-900/75 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wide text-sky-200/80">Thượng nguồn</div>
              <div className="font-semibold text-sky-100">{current.sourceLabel}</div>
            </div>
            <div className="flex flex-col gap-1 rounded-xl bg-slate-900/75 px-3 py-2 text-right">
              <div className="text-[10px] uppercase tracking-wide text-amber-200/80">Cửa sông</div>
              {current.mouthOptions.map((mouth) => (
                <div key={mouth.label} className="font-semibold text-amber-100">
                  {mouth.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-xl bg-slate-800/80 p-3 text-slate-100 md:flex-row md:items-center md:justify-between">
          <div className="text-sm text-sky-100">{feedback ?? "Chạm vào giọt nước, kéo theo hướng chảy tới cửa biển."}</div>
          <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-sky-200/80">
            <span>Gợi ý:</span>
            <span className={`rounded-full border px-3 py-1 ${contourActive ? "border-sky-400 bg-sky-500/20 text-white" : "border-slate-500/70 bg-slate-700/40"}`}>
              Đồng mức {contourActive ? "đang bật" : "đang tắt"}
            </span>
            <span className={`rounded-full border px-3 py-1 ${ghostActive ? "border-emerald-300 bg-emerald-400/20 text-white" : "border-slate-500/70 bg-slate-700/40"}`}>
              Đường gợi ý {ghostActive ? "hiện" : "ẩn"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Level6({
  bundle,
  onBack,
  onComplete,
}: {
  bundle: Bundle;
  onBack: () => void;
  onComplete?: (summary: { levelId: "level6"; ms: number; completedAt: string }) => void;
}) {
  const { data, error, loading } = useGeoTriplesData();
  const sfx = useSfx();
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");
  const [step, setStep] = useState<PhaseStep>("intro");
  const [phaseAResult, setPhaseAResult] = useState<PhaseAResult | null>(null);
  const [phaseBResult, setPhaseBResult] = useState<PhaseBResult | null>(null);
  const [badges, setBadges] = useState<GeoTriplesBadge[]>([]);
  const [seed] = useState(() => Math.floor(Math.random() * 0xffffffff));

  const boardSize = useMemo(() => {
    const [, , width, height] = bundle.viewBox;
    return { width, height };
  }, [bundle.viewBox]);

  const handleStart = useCallback(() => {
    setPhaseAResult(null);
    setPhaseBResult(null);
    setBadges([]);
    setStep("phaseA");
  }, []);

  const handlePhaseAComplete = useCallback((result: PhaseAResult) => {
    setPhaseAResult(result);
    setStep("phaseB");
  }, []);

  const handlePhaseBComplete = useCallback(
    (result: PhaseBResult) => {
      setPhaseBResult(result);
      const totalMs = (phaseAResult?.ms ?? 0) + result.ms;
      if (onComplete) {
        onComplete({
          levelId: "level6",
          ms: totalMs,
          completedAt: new Date().toISOString(),
        });
      }
      if (data?.badges?.length && phaseAResult) {
        const unlocked = computePhaseABadges(data.badges, phaseAResult, result);
        setBadges(unlocked);
      }
      setStep("summary");
    },
    [data?.badges, onComplete, phaseAResult],
  );

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <div className="text-lg font-semibold">Đang tải dữ liệu GeoTriples…</div>
        <div className="text-sm text-slate-300">Kiểm tra bản đồ lưu vực, dòng sông tham chiếu…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-slate-950 text-white">
        <div className="text-lg font-semibold">Không tải được dữ liệu GeoTriples</div>
        <div className="text-sm text-red-300">{error}</div>
        <button
          className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-emerald-950"
          onClick={onBack}
        >
          Quay lại menu
        </button>
      </div>
    );
  }

  const preset = data.difficultyPresets[difficulty];
  const overview = data.overview;

  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="flex items-center justify-between border-b border-slate-800/70 bg-slate-950 px-4 py-3 md:px-6">
        <div>
          <div className="text-xs uppercase tracking-wide text-emerald-300/90">Pack 1 — GeoTriples</div>
          <div className="text-xl font-semibold">{data.title}</div>
          {overview?.introText && <div className="text-sm text-slate-300">{overview.introText}</div>}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs uppercase tracking-wide text-slate-400">Độ khó</label>
          <select
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1 text-sm font-medium text-emerald-200"
            value={difficulty}
            onChange={(event) => setDifficulty(event.target.value as Difficulty)}
            disabled={step !== "intro"}
          >
            <option value="easy">Easy</option>
            <option value="normal">Normal</option>
            <option value="hard">Hard</option>
          </select>
          <button
            className="rounded-lg border border-slate-700 px-3 py-1 text-sm text-slate-300 hover:bg-slate-800"
            onClick={onBack}
          >
            Thoát
          </button>
        </div>
      </div>

      {step === "intro" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <div className="max-w-2xl rounded-3xl bg-slate-900/80 p-6 shadow-2xl">
            <div className="text-lg font-semibold text-emerald-200">Sông – Núi – Biển GeoTriples</div>
            <p className="mt-3 text-sm text-slate-200">
              Hai pha thử thách: kéo thả tên sông vào đúng lưu vực, sau đó dựng dòng chảy từ thượng nguồn ra
              biển. Hoàn thành nhanh và chính xác để nhận thêm điểm thưởng và huy hiệu.
            </p>
            <div className="mt-4 grid gap-3 text-left text-xs text-slate-300 md:grid-cols-2">
              {overview?.phases?.map((phase) => (
                <div key={phase} className="rounded-xl border border-slate-800/70 bg-slate-900/70 px-4 py-3">
                  {phase}
                </div>
              ))}
            </div>
          </div>
          <button
            className="rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg hover:bg-emerald-400"
            onClick={handleStart}
          >
            Bắt đầu Pha A
          </button>
        </div>
      )}

      {step === "phaseA" && (
        <PhaseAView
          key={`phaseA-${difficulty}`}
          bundle={bundle}
          config={data.phases.phaseA}
          preset={preset}
          difficulty={difficulty}
          onComplete={handlePhaseAComplete}
          boardSize={boardSize}
          seed={seed ^ 0xabc123}
          assets={data.assets}
          sfx={sfx}
        />
      )}

      {step === "phaseB" && phaseAResult && (
        <PhaseBView
          key={`phaseB-${difficulty}`}
          config={data.phases.phaseB}
          preset={preset}
          difficulty={difficulty}
          basins={data.phases.phaseA.basins}
          boardSize={boardSize}
          onComplete={handlePhaseBComplete}
          seed={seed ^ 0x321cba}
          sfx={sfx}
        />
      )}

      {step === "summary" && phaseAResult && phaseBResult && (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
          <div className="w-full max-w-3xl rounded-3xl bg-slate-900/85 p-6 text-white shadow-2xl ring-1 ring-emerald-500/30">
            <div className="text-center">
              <div className="text-2xl font-semibold text-emerald-200">Hoàn thành GeoTriples!</div>
              <div className="mt-2 text-sm text-slate-200">
                Tổng thời gian: <b>{((phaseAResult.ms + phaseBResult.ms) / 1000).toFixed(1)}s</b>
              </div>
              <div className="mt-1 text-sm text-slate-200">
                Pha A: <b>{phaseAResult.score}</b> điểm — đúng {phaseAResult.correctCount} lưu vực
              </div>
              <div className="mt-1 text-sm text-slate-200">
                Pha B: <b>{phaseBResult.score}</b> điểm — dựng đúng {phaseBResult.solved}/{phaseBResult.asked} dòng
              </div>
            </div>

            {badges.length > 0 && (
              <div className="mt-6">
                <div className="text-sm font-semibold text-emerald-200">Huy hiệu nhận được</div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-3 text-sm text-emerald-100"
                    >
                      <div className="font-semibold">{badge.title}</div>
                      <div className="text-xs text-emerald-200/80">{badge.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {data.postGame?.factSlides?.length && (
              <div className="mt-6">
                <div className="text-sm font-semibold text-slate-200">Bạn biết không?</div>
                <div className="mt-3 grid gap-3 text-sm text-slate-200 md:grid-cols-2">
                  {data.postGame.factSlides.slice(0, 2).map((slide) => (
                    <div key={slide.id} className="rounded-xl border border-slate-700/70 bg-slate-800/60 px-4 py-3">
                      <div className="font-semibold text-emerald-200">{slide.title}</div>
                      <div className="mt-1 text-xs text-slate-300">{slide.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <button
                className="rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
                onClick={onBack}
              >
                Quay lại menu
              </button>
              <button
                className="rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-emerald-950 shadow-lg hover:bg-emerald-400"
                onClick={handleStart}
              >
                Chơi lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
