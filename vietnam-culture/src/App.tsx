import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactElement } from "react";
import { loadBundle } from "./core/bundle";
import type { Bundle } from "./types";
import Level1 from "./levels/Level1";
import Level2 from "./levels/Level2";
import Level3 from "./levels/Level3";
import Level4 from "./levels/Level4";
import Level5 from "./levels/Level5";
import LoginScreen from "./account/LoginScreen";
import { useAccount } from "./account/context";
import ClassDashboard from "./account/ClassDashboard";
import { getAvatarPreset } from "./account/avatars";
import type { LevelCompletionPayload, ProfileStore, ProgressByLevel } from "./account/types";
import type { Session } from "./account/context";
import type { GameScreen } from "./core/gameScreens";
import { PACKS } from "./core/levelMeta";
type Screen = "auth" | "menu" | "class-dashboard" | GameScreen;

const MENU_BACKGROUND = "/imgs/VN_puzzle.jpg";
const SOCIAL_LINKS = [
  {
    id: "facebook",
    label: "Facebook",
    href: "https://www.facebook.com/enterVN",
    path: "M12 2.04c-5.52 0-9.96 4.438-9.96 9.96 0 4.99 3.657 9.128 8.438 9.88v-7h-2.54v-2.88h2.54v-2.2c0-2.506 1.492-3.89 3.776-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.242 0-1.63.771-1.63 1.562v1.873h2.773l-.443 2.88h-2.33v7c4.78-.752 8.437-4.89 8.437-9.88 0-5.522-4.438-9.96-9.96-9.96Z",
  },
  {
    id: "instagram",
    label: "Instagram",
    href: "https://www.instagram.com/enterVN",
    path: "M16.98 3H7.02C4.254 3 2 5.255 2 8.02v9.96C2 20.745 4.255 23 7.02 23h9.96C19.745 23 22 20.745 22 17.98V8.02C22 5.255 19.745 3 16.98 3Zm3 14.98c0 1.657-1.343 3-3 3H7.02c-1.657 0-3-1.343-3-3V8.02c0-1.657 1.343-3 3-3h9.96c1.657 0 3 1.343 3 3v9.96ZM12 8.5A4.5 4.5 0 1 0 12 17.5 4.5 4.5 0 0 0 12 8.5Zm0 7.2a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4ZM18 7.75a1.25 1.25 0 1 1-2.5 0 1.25 1.25 0 0 1 2.5 0Z",
  },
  {
    id: "youtube",
    label: "YouTube",
    href: "https://www.youtube.com/@enterVN",
    path: "M21.6 7.2a2.58 2.58 0 0 0-1.812-1.83C18.258 5 12 5 12 5s-6.258 0-7.788.37A2.58 2.58 0 0 0 2.4 7.2 27.54 27.54 0 0 0 2 12a27.54 27.54 0 0 0 .4 4.8 2.58 2.58 0 0 0 1.812 1.83C5.742 19 12 19 12 19s6.258 0 7.788-.37A2.58 2.58 0 0 0 21.6 16.8 27.54 27.54 0 0 0 22 12a27.54 27.54 0 0 0-.4-4.8ZM10.5 15.25v-6.5L15.75 12 10.5 15.25Z",
  },
] as const;

type LevelComponentProps = {
  bundle: Bundle;
  onBack: () => void;
  onComplete?: (payload: LevelCompletionPayload) => void;
};
type ScreenRenderer = (props: LevelComponentProps) => ReactElement;

const createComingSoonScreen = (title: string, description: string): ScreenRenderer =>
  (props) => <ComingSoonScreen {...props} title={title} description={description} />;

const SCREEN_COMPONENTS: Record<GameScreen, ScreenRenderer> = {
  level1: (props) => <Level1 {...props} />,
  level2: (props) => <Level2 {...props} />,
  level3: (props) => <Level3 {...props} />,
  level4: (props) => <Level4 {...props} />,
  level5: (props) => <Level5 {...props} />,
  "pack2-level1": createComingSoonScreen(
    "Cấp 1: Văn hoá vùng miền",
    "Màn chơi đang được hoàn thiện để mang tới cho bạn trải nghiệm tốt nhất."
  ),
  "pack2-level2": createComingSoonScreen(
    "Cấp 2: Lễ hội & phong tục",
    "Hãy quay lại sau để khám phá thêm những câu chuyện văn hoá thú vị."
  ),
  "pack2-level3": createComingSoonScreen(
    "Cấp 3: Dấu ấn lịch sử",
    "Nội dung đang trong quá trình phát triển. Cảm ơn bạn đã chờ đợi!"
  ),
};


export default function App() {
  const { session, setSession, store, recordLevelCompletion } = useAccount();
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [screen, setScreen] = useState<Screen>("auth");

  useEffect(() => {
    loadBundle().then(setBundle).catch(console.error);
  }, []);

  useEffect(() => {
    if (!session) {
      setScreen("auth");
      return;
    }
    if (session.mode === "teacher") {
      setScreen("class-dashboard");
      return;
    }
    setScreen((prev) => {
      if (prev === "auth" || prev === "class-dashboard") {
        return "menu";
      }
      return prev;
    });
  }, [session]);

  const sessionInfo = useMemo(() => buildSessionInfo(session, store), [session, store]);
  const handleSignOut = useCallback(() => setSession(null), [setSession]);
  const handleLevelComplete = useCallback(
    (payload: LevelCompletionPayload) => {
      void recordLevelCompletion(payload);
    },
    [recordLevelCompletion],
  );
  const sessionProgress = useMemo(
    () => getSessionProgress(session, store),
    [session, store],
  );

  if (screen === "auth") {
    return <LoginScreen />;
  }

  if (screen === "class-dashboard") {
    const classRoom =
      session && session.mode === "teacher" ? store.classes[session.classId] : null;
    if (!classRoom) {
      return <LoginScreen />;
    }
    return <ClassDashboard classRoom={classRoom} onBack={() => setSession(null)} />;
  }

  if (!bundle) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 text-white">
        Dang tai du lieu.
      </div>
    );
  }
  const handleStartLevel = (next: GameScreen) => setScreen(next);
  const handleBackToMenu = () => setScreen("menu");
  const isMenu = screen === "menu";
  let content: ReactElement | null = null;
  if (screen === "menu") {
    content = <Menu onSelect={handleStartLevel} progress={sessionProgress} />;
  } else if (isGameScreen(screen)) {
    const ScreenComponent = SCREEN_COMPONENTS[screen];
    content = (
      <ScreenComponent
        bundle={bundle}
        onBack={handleBackToMenu}
        onComplete={handleLevelComplete}
      />
    );
  } else {
    content = null;
  }
  return (
    <div className="h-full w-full">
      <div
        className={`relative h-full w-full ${isMenu ? "text-white" : "bg-white text-slate-900"}`}
        style={
          isMenu
            ? {
                backgroundImage: `url('${MENU_BACKGROUND}')`,
                backgroundSize: "cover",
                backgroundPosition: "center center",
                backgroundRepeat: "no-repeat",
              }
            : undefined
        }
      >
        <div className="relative flex h-full flex-col">
          <header
            className={`flex items-center justify-end gap-4 px-4 py-3 ${
              isMenu
                ? "bg-black/40 text-white"
                : "border-b border-slate-200 bg-white text-slate-700"
            }`}
          >
            {sessionInfo && (
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${sessionInfo.avatarBg} ${sessionInfo.avatarFg}`}
                >
                  {sessionInfo.avatarText}
                </div>
                <div className="text-right">
                  <p
                    className={`text-xs uppercase tracking-[0.3em] ${
                      isMenu ? "text-white/60" : "text-slate-500"
                    }`}
                  >
                    {sessionInfo.roleLabel}
                  </p>
                  <p className="text-sm font-semibold">{sessionInfo.displayName}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    isMenu
                      ? "bg-white/10 text-white hover:bg-white/20"
                      : "bg-slate-900 text-white hover:bg-slate-800"
                  }`}
                >
                  Dang xuat
                </button>
              </div>
            )}
          </header>
          <main className={`flex-1 ${isMenu ? "overflow-hidden" : "overflow-y-auto"}`}>
            {content}
          </main>
          <footer
            className={`border-t px-4 py-4 text-sm ${
              isMenu
                ? "border-white/40 bg-black/10 text-white"
                : "border-slate-200 bg-white text-slate-600"
            }`}
          >
            <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
              <span className="font-medium tracking-wide">
                Một sản phẩm của enterVN
              </span>
              <div className="flex items-center gap-4">
                {SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`transition-colors ${
                      isMenu
                        ? "text-white hover:text-emerald-200"
                        : "text-slate-500 hover:text-emerald-600"
                    }`}
                  >
                    <span className="sr-only">{link.label}</span>
                    <svg
                      aria-hidden="true"
                      focusable="false"
                      width="22"
                      height="22"
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                    >
                      <path d={link.path} fill="currentColor" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
function getSessionProgress(session: Session | null, store: ProfileStore): ProgressByLevel {
  if (!session) {
    return {};
  }
  if (session.mode === "guest") {
    return store.guests[session.profileId]?.progress ?? {};
  }
  if (session.mode === "student") {
    const room = store.classes[session.classId];
    return room?.students[session.studentId]?.progress ?? {};
  }
  return {};
}

type SessionInfo = {
  displayName: string;
  roleLabel: string;
  avatarText: string;
  avatarBg: string;
  avatarFg: string;
};

function isGameScreen(screen: Screen): screen is GameScreen {
  return screen !== "auth" && screen !== "menu" && screen !== "class-dashboard";
}

function buildSessionInfo(session: Session | null, store: ProfileStore): SessionInfo | null {
  if (!session) {
    return null;
  }
  if (session.mode === "guest") {
    const profile = store.guests[session.profileId];
    const preset = getAvatarPreset(profile?.avatarId ?? "jade");
    return {
      displayName: profile?.nickname ?? "Guest",
      roleLabel: "CHE DO KHACH",
      avatarText: getInitials(profile?.nickname ?? "Guest"),
      avatarBg: preset.background,
      avatarFg: preset.foreground,
    };
  }
  if (session.mode === "student") {
    const room = store.classes[session.classId];
    const student = room?.students[session.studentId];
    const preset = getAvatarPreset(student?.avatarId ?? "sunrise");
    return {
      displayName: student?.nickname ?? "Hoc sinh",
      roleLabel: room ? `HOC SINH - ${room.id}` : "HOC SINH",
      avatarText: getInitials(student?.nickname ?? "Hoc sinh"),
      avatarBg: preset.background,
      avatarFg: preset.foreground,
    };
  }
  if (session.mode === "teacher") {
    const room = store.classes[session.classId];
    const preset = getAvatarPreset(room?.teacher.avatarId ?? "indigo");
    const teacherName = room?.teacher.nickname ?? "Giao vien";
    return {
      displayName: teacherName,
      roleLabel: room ? `GIAO VIEN - ${room.id}` : "GIAO VIEN",
      avatarText: getInitials(teacherName),
      avatarBg: preset.background,
      avatarFg: preset.foreground,
    };
  }
  return null;
}

function getInitials(input: string): string {
  const value = input.trim();
  if (!value) return "??";
  const parts = value.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}
function Menu({
  onSelect,
  progress,
}: {
  onSelect: (screen: GameScreen) => void;
  progress: ProgressByLevel;
}) {
  const [packIndex, setPackIndex] = useState(0);
  const levelListRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const activePack = useMemo(() => PACKS[packIndex], [packIndex]);
  const hasPrevPack = packIndex > 0;
  const hasNextPack = packIndex < PACKS.length - 1;

  const updateScrollButtons = useCallback(() => {
    const el = levelListRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    setCanScrollUp(scrollTop > 0);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
  }, []);

  useEffect(() => {
    updateScrollButtons();
  }, [activePack, updateScrollButtons]);

  useEffect(() => {
    const el = levelListRef.current;
    if (!el) return;
    const handleScroll = () => updateScrollButtons();
    el.addEventListener("scroll", handleScroll);
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [updateScrollButtons]);

  useEffect(() => {
    const el = levelListRef.current;
    if (!el) return;
    el.scrollTo({ top: 0 });
    requestAnimationFrame(() => updateScrollButtons());
  }, [packIndex, updateScrollButtons]);

  const scrollLevels = useCallback(
    (direction: "up" | "down") => {
      const el = levelListRef.current;
      if (!el) return;
      const amount = direction === "up" ? -el.clientHeight : el.clientHeight;
      el.scrollBy({ top: amount, behavior: "smooth" });
      requestAnimationFrame(() => updateScrollButtons());
    },
    [updateScrollButtons]
  );

  const goToPrevPack = () => {
    setPackIndex((idx) => Math.max(0, idx - 1));
  };

  const goToNextPack = () => {
    setPackIndex((idx) => Math.min(PACKS.length - 1, idx + 1));
  };

  return (
    <div className="flex h-full justify-left px-4 py-8 sm:px-8 lg:py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={goToPrevPack}
            disabled={!hasPrevPack}
            className="rounded-full bg-white/10 px-3 py-2 text-lg text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Gói trước"
          >
            {"<"}
          </button>
          <div className="flex w-full flex-col items-center text-center sm:items-start sm:text-left">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">
              Gói chơi {packIndex + 1}/{PACKS.length}
            </span>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white drop-shadow">
              {activePack.title}
            </h1>
            <p className="mt-2 text-sm text-white/80">{activePack.description}</p>
          </div>
          <button
            type="button"
            onClick={goToNextPack}
            disabled={!hasNextPack}
            className="rounded-full bg-white/10 px-3 py-2 text-lg text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
            aria-label="Gói tiếp theo"
          >
            {">"}
          </button>
        </div>

        <div className="relative">
          <div className="absolute right-0 top-0 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => scrollLevels("up")}
              disabled={!canScrollUp}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Cuộn lên"
            >
              {"^"}
            </button>
            <button
              type="button"
              onClick={() => scrollLevels("down")}
              disabled={!canScrollDown}
              className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-30"
              aria-label="Cuộn xuống"
            >
              {"v"}
            </button>
          </div>
          <div
            ref={levelListRef}
            className="max-h-[360px] overflow-y-auto pr-10 sm:pr-12"
          >
            <ul className="flex flex-col gap-3 pb-1 pt-1">
              {activePack.levels.map((level) => {
                const isComingSoon = level.status === "comingSoon";
                const levelProgress = progress[level.id];
                const isCompleted = Boolean(levelProgress?.completed) && !isComingSoon;
                return (
                  <li key={level.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(level.id)}
                      className="group flex w-full flex-col items-center gap-4 border-b-2 border-white/60 px-4 py-6 text-center transition duration-200 hover:border-white/80 sm:flex-row sm:items-center sm:justify-between sm:border-b-4 sm:text-left"
                    >
                      <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
                        <span
                          className={`text-lg font-semibold tracking-tight sm:text-xl ${level.accentClass}`}
                        >
                          {level.label}
                          {isCompleted && (
                            <span className="ml-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
                              Done
                            </span>
                          )}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-semibold uppercase tracking-[0.35em] sm:text-sm sm:opacity-0 sm:transition sm:duration-200 sm:group-hover:opacity-80 ${
                          isComingSoon
                            ? "text-amber-200"
                            : isCompleted
                              ? "text-emerald-200"
                              : "text-slate-200/80"
                        }`}
                      >
                        {isComingSoon ? "Sap ra mat" : isCompleted ? "Hoan thanh" : "Play"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
function ComingSoonScreen({
  onBack,
  title,
  description,
}: LevelComponentProps & { title: string; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 text-center sm:px-10">
      <div className="max-w-xl space-y-3">
        <h2 className="text-3xl font-semibold text-slate-800 sm:text-4xl">{title}</h2>
        <p className="text-base text-slate-600 sm:text-lg">{description}</p>
      </div>
      <button
        type="button"
        onClick={onBack}
        className="rounded-full bg-emerald-500 px-6 py-3 font-semibold text-white shadow-lg transition hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
      >
        Quay lại menu
      </button>
    </div>
  );
}



























