import { useMemo } from "react";
import { ACTIVE_GAME_SCREENS } from "../core/gameScreens";
import { LEVELS_BY_ID, PACKS } from "../core/levelMeta";
import { getAvatarPreset } from "./avatars";
import type { ClassRoom, LevelProgress } from "./types";
import { formatDuration, formatRelativeTime } from "./utils";

type ClassDashboardProps = {
  classRoom: ClassRoom;
  onBack: () => void;
};

type StudentStat = {
  id: string;
  nickname: string;
  avatarClass: string;
  avatarText: string;
  completedLevels: number;
  totalLevels: number;
  lastSyncLabel: string;
  progressByLevel: Array<{
    levelId: string;
    label: string;
    shortLabel: string;
    accentClass: string;
    progress?: LevelProgress;
  }>;
};

export default function ClassDashboard({ classRoom, onBack }: ClassDashboardProps) {
  const studentStats = useMemo<StudentStat[]>(() => {
    const totalLevels = ACTIVE_GAME_SCREENS.length;
    return Object.values(classRoom.students)
      .sort((a, b) => dateValue(b.lastSyncAt) - dateValue(a.lastSyncAt))
      .map((student) => {
        const preset = getAvatarPreset(student.avatarId);
        const progressByLevel = ACTIVE_GAME_SCREENS.map((levelId) => {
          const meta = LEVELS_BY_ID[levelId];
          const fullLabel = meta?.label ?? levelId;
          return {
            levelId,
            label: fullLabel,
            shortLabel: getShortLabel(fullLabel),
            accentClass: meta?.accentClass ?? "text-slate-400",
            progress: student.progress[levelId],
          };
        });
        const completedLevels = progressByLevel.filter((entry) => entry.progress?.completed).length;
        return {
          id: student.id,
          nickname: student.nickname,
          avatarClass: `${preset.background} ${preset.foreground}`,
          avatarText: getInitials(student.nickname),
          completedLevels,
          totalLevels,
          lastSyncLabel: formatRelativeTime(student.lastSyncAt),
          progressByLevel,
        };
      });
  }, [classRoom.students]);

  const teacherPreset = getAvatarPreset(classRoom.teacher.avatarId);
  const totalStudents = studentStats.length;
  const totalCompletions = studentStats.reduce((sum, student) => sum + student.completedLevels, 0);

  const copyClassCode = async () => {
    try {
      await navigator.clipboard.writeText(classRoom.id);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/80">
              Ma lop
            </p>
            <h1 className="mt-1 text-3xl font-semibold leading-tight">
              {classRoom.title ?? `Lop ${classRoom.id}`}
            </h1>
            <p className="text-sm text-white/70">Ma: {classRoom.id}</p>
            <p className="text-sm text-white/60">
              Giao vien: {classRoom.teacher.nickname}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copyClassCode}
              className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
            >
              Sao chep ma lop
            </button>
            <button
              type="button"
              onClick={onBack}
              className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-600"
            >
              Quay lai
            </button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Tong so hoc sinh" value={totalStudents.toString()} />
          <StatCard
            label="Tong so cap hoan thanh"
            value={`${totalCompletions}/${totalStudents * ACTIVE_GAME_SCREENS.length}`}
          />
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${teacherPreset.background} ${teacherPreset.foreground}`}>
              {getInitials(classRoom.teacher.nickname)}
            </div>
            <p className="mt-2 text-sm font-semibold text-white">Giao vien chu nhiem</p>
            <p className="text-sm text-white/60">{classRoom.teacher.nickname}</p>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Tien do hoc sinh</h2>
            <p className="text-sm text-white/60">{PACKS.length} goi choi, {ACTIVE_GAME_SCREENS.length} cap hoan chinh</p>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm text-white/80">
              <thead className="bg-white/10 text-xs uppercase tracking-[0.3em] text-white/60">
                <tr>
                  <th className="px-4 py-3">Hoc sinh</th>
                  <th className="px-4 py-3">Hoan thanh</th>
                  <th className="px-4 py-3">Cap gan nhat</th>
                  <th className="px-4 py-3">Cap do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {studentStats.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-white/50">
                      Chua co hoc sinh nao tham gia lop nay.
                    </td>
                  </tr>
                )}
                {studentStats.map((student) => (
                  <tr key={student.id} className="hover:bg-white/10">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${student.avatarClass}`}>
                          {student.avatarText}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{student.nickname}</p>
                          <p className="text-xs text-white/60">Cap nhat {student.lastSyncLabel}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white">
                      {student.completedLevels}/{student.totalLevels}
                    </td>
                    <td className="px-4 py-3">
                      {latestCompletedLevel(student.progressByLevel)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {student.progressByLevel.map((entry) => (
                          <span
                            key={entry.levelId}
                            className={`rounded-full border px-2 py-1 text-xs font-semibold ${
                              entry.progress?.completed
                                ? `${entry.accentClass} border-current bg-current/10`
                                : "border-white/20 text-white/40"
                            }`}
                          >
                            {entry.progress?.completed
                              ? `${entry.shortLabel} - ${formatDuration(entry.progress?.bestTimeMs)}`
                              : entry.shortLabel
                            }
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

type StatCardProps = {
  label: string;
  value: string;
};

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function latestCompletedLevel(entries: StudentStat["progressByLevel"]) {
  const completed = entries
    .filter((entry) => entry.progress?.completed)
    .sort((a, b) => dateValue(b.progress?.lastCompletedAt) - dateValue(a.progress?.lastCompletedAt));
  if (completed.length === 0) {
    return <span className="text-xs text-white/50">Chua hoan thanh</span>;
  }
  const best = completed[0];
  return (
    <span className={`text-xs font-semibold ${best.accentClass}`}>
      {best.shortLabel} - {formatDuration(best.progress?.bestTimeMs)}
    </span>
  );
}

function dateValue(input?: string): number {
  if (!input) return 0;
  const value = Date.parse(input);
  return Number.isNaN(value) ? 0 : value;
}

function getShortLabel(label: string): string {
  const colonIndex = label.indexOf(":");
  if (colonIndex !== -1) {
    return label.slice(0, colonIndex).trim();
  }
  if (label.length > 24) {
    return label.slice(0, 21).trimEnd() + "...";
  }
  return label;
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
