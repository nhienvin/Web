import type { GameScreen } from "../core/gameScreens";

export type AvatarId =
  | "jade"
  | "sunrise"
  | "indigo"
  | "amber"
  | "teal"
  | "crimson"
  | "slate"
  | "violet";

export interface LevelProgress {
  completed: boolean;
  attempts: number;
  bestTimeMs?: number;
  lastCompletedAt?: string;
}

export type ProgressByLevel = Partial<Record<GameScreen, LevelProgress>>;

export interface LevelCompletionPayload {
  levelId: GameScreen;
  ms?: number;
  completedAt: string;
}

export interface GuestProfile {
  id: string;
  nickname: string;
  avatarId: AvatarId;
  progress: ProgressByLevel;
  createdAt: string;
  updatedAt: string;
}

export interface StudentProfile {
  id: string;
  nickname: string;
  avatarId: AvatarId;
  classId: string;
  progress: ProgressByLevel;
  joinedAt: string;
  lastSyncAt: string;
}

export interface TeacherInfo {
  id: string;
  nickname: string;
  avatarId: AvatarId;
  createdAt: string;
}

export interface ClassRoom {
  id: string;
  teacher: TeacherInfo;
  title?: string;
  students: Record<string, StudentProfile>;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileStore {
  version: number;
  guests: Record<string, GuestProfile>;
  classes: Record<string, ClassRoom>;
}

export const STORE_VERSION = 1;

export function createEmptyStore(): ProfileStore {
  return {
    version: STORE_VERSION,
    guests: {},
    classes: {},
  };
}
