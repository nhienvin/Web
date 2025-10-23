import { useEffect, useState } from "react";
import { loadBundle } from "./core/bundle";
import type { Bundle } from "./types";
import Level1 from "./levels/Level1";
import Level2 from "./levels/Level2";
import Level3 from "./levels/Level3";
import Level4 from "./levels/Level4";

type GameScreen = "level1" | "level2" | "level3" | "level4";

type Screen = "menu" | GameScreen;

type LevelMeta = {
  id: GameScreen;
  label: string;
  accentClass: string;
};

const LEVELS: LevelMeta[] = [
  { id: "level1", label: "Cấp 1: Ghép tên tỉnh vào bản đồ", accentClass: "text-emerald-500"},
  { id: "level2", label: "Cấp 2: Ghép hình ảnh tỉnh vào bản đồ", accentClass: "text-amber-500"},
  { id: "level3", label: "Cấp 3: Đoán tên tỉnh dựa vào hình ảnh", accentClass: "text-rose-500"},
  { id: "level4", label: "Cấp 4: Xuyên Việt lộ trình", accentClass: "text-sky-500"},
];
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

export default function App() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");

  useEffect(() => {
    loadBundle().then(setBundle).catch(console.error);
  }, []);

  if (!bundle) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 text-white">
        Đang tải dữ liệu.
      </div>
    );
  }

  const handleStartLevel = (next: GameScreen) => setScreen(next);
  const handleBackToMenu = () => setScreen("menu");
  const isMenu = screen === "menu";

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
          <main className={`flex-1 ${isMenu ? "overflow-hidden" : "overflow-y-auto"}`}>
            {isMenu && <Menu onSelect={handleStartLevel} />}
            {screen === "level1" && <Level1 bundle={bundle} onBack={handleBackToMenu} />}
            {screen === "level2" && <Level2 bundle={bundle} onBack={handleBackToMenu} />}
            {screen === "level3" && <Level3 bundle={bundle} onBack={handleBackToMenu} />}
            {screen === "level4" && <Level4 bundle={bundle} onBack={handleBackToMenu} />}
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
function Menu({ onSelect }: { onSelect: (screen: GameScreen) => void }) {
  return (
    <div className="flex h-full justify-left px-4 py-8 sm:px-8 lg:py-12">
      <div className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-2xl font-semibold tracking-tight text-white drop-shadow sm:text-left">
        Địa lý – Bản đồ
        </h1>
        <ul className="flex flex-col gap-3">
          {LEVELS.map((level) => (
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
                  </span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-200/80 sm:text-sm sm:opacity-0 sm:transition sm:duration-200 sm:group-hover:opacity-80">
                  Play
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
