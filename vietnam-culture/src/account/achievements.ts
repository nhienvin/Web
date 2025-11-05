import { PACKS } from "../core/levelMeta";
import type { ProgressByLevel } from "./types";
import { formatDuration } from "./utils";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  badgeLabel: string;
  progressLabel: string;
  achieved: boolean;
};

export type AchievementSummary = {
  completedCount: number;
  totalPlayable: number;
  totalAttempts: number;
};

type AchievementModel = {
  achievements: Achievement[];
  summary: AchievementSummary;
};

const PLAYABLE_LEVEL_IDS = PACKS.flatMap((pack) =>
  pack.levels.filter((level) => level.status !== "comingSoon").map((level) => level.id),
);

export function computeAchievements(progress: ProgressByLevel): AchievementModel {
  const completedLevels = PLAYABLE_LEVEL_IDS.filter((levelId) => progress[levelId]?.completed);
  const totalAttempts = Object.values(progress).reduce(
    (sum, item) => sum + (item?.attempts ?? 0),
    0,
  );
  const fastestCandidates = Object.values(progress)
    .map((item) => item?.bestTimeMs)
    .filter((value): value is number => typeof value === "number" && value > 0);
  const bestTimeMs = fastestCandidates.length > 0 ? Math.min(...fastestCandidates) : undefined;

  const pack1 = PACKS.find((pack) => pack.id === "pack1");
  const pack1LevelIds =
    pack1?.levels.filter((level) => level.status !== "comingSoon").map((level) => level.id) ?? [];
  const pack1Completed = pack1LevelIds.filter((levelId) => progress[levelId]?.completed);

  const totalPlayable = PLAYABLE_LEVEL_IDS.length;
  const completionProgressLabel = totalPlayable
    ? `${completedLevels.length}/${totalPlayable} cấp độ`
    : "Đang cập nhật";
  const pack1ProgressLabel = pack1LevelIds.length
    ? `${pack1Completed.length}/${pack1LevelIds.length} cấp độ`
    : "Đang cập nhật";

  const achievements: Achievement[] = [
    {
      id: "first-completion",
      title: "Bước chân đầu tiên",
      description: "Hoàn thành một cấp độ bất kỳ và bắt đầu chuyến hành trình.",
      badgeLabel: "EXP",
      progressLabel: completionProgressLabel,
      achieved: completedLevels.length > 0,
    },
    {
      id: "pack1-master",
      title: "Tinh thông bản đồ Việt Nam",
      description: "Mở khóa toàn bộ cấp độ trong gói Địa lý - Bản đồ.",
      badgeLabel: "MAP",
      progressLabel: pack1ProgressLabel,
      achieved: pack1LevelIds.length > 0 && pack1Completed.length === pack1LevelIds.length,
    },
    {
      id: "speedster",
      title: "Nhanh như chớp",
      description: "Hoàn thành một cấp độ trong thời gian dưới 45 giây.",
      badgeLabel: "SPD",
      progressLabel:
        typeof bestTimeMs === "number"
          ? `Kỷ lục hiện tại: ${formatDuration(bestTimeMs)}`
          : "Chưa có kỷ lục",
      achieved: typeof bestTimeMs === "number" && bestTimeMs <= 45_000,
    },
  ];

  return {
    achievements,
    summary: {
      completedCount: completedLevels.length,
      totalPlayable,
      totalAttempts,
    },
  };
}