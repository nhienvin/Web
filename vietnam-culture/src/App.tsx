import { useEffect, useState } from "react";
import { loadBundle } from "./core/bundle";
import type { Bundle } from "./types";
import Level1 from "./levels/Level1";
import Level2 from "./levels/Level2";
import Level3 from "./levels/Level3";
// import Level4 from "./levels/Level4";

// type GameScreen = "level1" | "level2" | "level3" | "level4";
type GameScreen = "level1" | "level2" | "level3";
type Screen = "menu" | GameScreen;

type LevelMeta = {
  id: GameScreen;
  label: string;
  accentClass: string;
  icons: number;
};

const LEVELS: LevelMeta[] = [
  { id: "level1", label: "Cấp 1", accentClass: "text-emerald-500", icons: 1 },
  { id: "level2", label: "Cấp 2", accentClass: "text-amber-500", icons: 2 },
  { id: "level3", label: "Cấp 3", accentClass: "text-rose-500", icons: 3 },
  // { id: "level4", label: "Cấp 4", accentClass: "text-sky-500", icons: 4 },
];

const LEVEL_ICON_SRC = "/imgs/puzzle.png";
const MENU_BACKGROUND = "/imgs/VN_puzzle.jpg";

export default function App() {
  const [bundle, setBundle] = useState<Bundle | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");

  useEffect(() => {
    loadBundle().then(setBundle).catch(console.error);
  }, []);

  if (!bundle) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-900 text-white">
        Äang táº£i dá»¯ liá»‡u...
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
          <main className="flex-1 overflow-y-auto">
            {isMenu && <Menu onSelect={handleStartLevel} />}
            {screen === "level1" && <Level1 bundle={bundle} onBack={handleBackToMenu} />}
            {screen === "level2" && <Level2 bundle={bundle} onBack={handleBackToMenu} />}
            {screen === "level3" && <Level3 bundle={bundle} onBack={handleBackToMenu} />}
            {/* {screen === "level4" && <Level4 bundle={bundle} onBack={handleBackToMenu} />} */}
          </main>
        </div>
      </div>
    </div>
  );
}

function Menu({ onSelect }: { onSelect: (screen: GameScreen) => void }) {
  return (
    <div className="flex h-full justify-left px-4 py-8 sm:px-8 lg:py-12">
      <div className="w-full max-w-sm space-y-4">
        {/* <h1 className="text-center text-2xl font-semibold tracking-tight text-white drop-shadow sm:text-left">
          Vietnam Puzzle Levels
        </h1> */}
        <ul className="flex flex-col gap-3">
          {LEVELS.map((level) => (
            <li key={level.id}>
              <button
                type="button"
                onClick={() => onSelect(level.id)}
                className="group flex w-full flex-col items-center gap-4 border-b-2 border-white/60 px-4 py-6 text-center transition duration-200 hover:border-white/80 sm:flex-row sm:items-center sm:justify-between sm:border-b-4 sm:text-left"
              >
                <div className="flex w-full flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
                  <div className="flex items-center justify-center gap-2 sm:justify-start">
                    {Array.from({ length: level.icons }).map((_, index) => (
                      <img
                        key={index}
                        src={LEVEL_ICON_SRC}
                        alt=""
                        className="h-8 w-8 shrink-0 drop-shadow-sm sm:h-10 sm:w-10"
                        loading="lazy"
                      />
                    ))}
                  </div>
                  <span
                    className={`text-lg font-semibold tracking-tight sm:text-2xl ${level.accentClass}`}
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
