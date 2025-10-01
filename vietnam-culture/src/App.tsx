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
  colorClass: string;
  icons: number;
};

const LEVELS: LevelMeta[] = [
  { id: "level1", label: "Cấp 1", colorClass: "text-emerald-500", icons: 1 },
  { id: "level2", label: "Cấp 2", colorClass: "text-amber-500", icons: 2 },
  { id: "level3", label: "Cấp 3", colorClass: "text-rose-500", icons: 3 },
  { id: "level4", label: "Cấp 4", colorClass: "text-sky-500", icons: 4 },
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
        Đang tải dữ liệu...
      </div>
    );
  }

  const handleStartLevel = (next: GameScreen) => setScreen(next);
  const handleBackToMenu = () => setScreen("menu");
  const isMenu = screen === "menu";

  return (
    <div
      className="h-full w-full"
      style={
        isMenu
          ? {
              backgroundImage: `url('${MENU_BACKGROUND}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
            }
          : undefined
      }
    >
      <div className={`flex h-full flex-col ${isMenu ? "bg-transparent" : "bg-white"}`}>
        {/* {isMenu && (
          <header className="border-b bg-white/90 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-4">
              <h1 className="text-xl font-semibold tracking-tight text-slate-900">
                Vietnam Puzzle Levels
              </h1>
            </div>
          </header>
        )} */}

        <main className="flex-1 overflow-y-auto">
          {isMenu && <Menu onSelect={handleStartLevel} />}
          {screen === "level1" && <Level1 bundle={bundle} onBack={handleBackToMenu} />}
          {screen === "level2" && <Level2 bundle={bundle} onBack={handleBackToMenu} />}
          {screen === "level3" && <Level3 bundle={bundle} onBack={handleBackToMenu} />}
          {screen === "level4" && <Level4 bundle={bundle} onBack={handleBackToMenu} />}
        </main>
      </div>
    </div>
  );
}

function Menu({ onSelect }: { onSelect: (screen: GameScreen) => void }) {
  return (
    <div className="flex h-full items-center justify-start px-8 py-12">
      <div className="w-full max-w-xl rounded-3xl bg-transparent p-2">
        <ul className="flex flex-col">
          {LEVELS.map((level) => (
            <li key={level.id}>
              <button
                type="button"
                onClick={() => onSelect(level.id)}
                className={`group flex w-full items-center justify-between gap-6 border-b-4 border-current bg-transparent px-6 py-8 text-left transition-colors duration-200 hover:bg-white/10 backdrop-blur-sm ${level.colorClass}`}
              >
                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-2">
                    {Array.from({ length: level.icons }).map((_, index) => (
                      <img key={index} src={LEVEL_ICON_SRC} alt="" className="h-10 w-10 drop-shadow-sm" />
                    ))}
                  </div>
                  <span className="text-2xl font-semibold tracking-tight">
                    {level.label}
                  </span>
                </div>
                <span className="text-sm font-medium uppercase tracking-[0.35em] opacity-0 transition-opacity duration-200 group-hover:opacity-80">
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
