import type { GameScreen } from "./gameScreens";

export type LevelMeta = {
  id: GameScreen;
  label: string;
  accentClass: string;
  status?: "comingSoon";
};

export type LevelPack = {
  id: string;
  title: string;
  description: string;
  levels: LevelMeta[];
};

export const PACKS: LevelPack[] = [
  {
    id: "pack1",
    title: "Dia ly - Ban do",
    description: "Kham pha ban do Viet Nam qua nhieu thu thach.",
    levels: [
      {
        id: "level1",
        label: "Cap 1: Ghep ten tinh vao ban do",
        accentClass: "text-emerald-500",
      },
      {
        id: "level2",
        label: "Cap 2: Ghep hinh anh tinh vao ban do",
        accentClass: "text-amber-500",
      },
      {
        id: "level3",
        label: "Cap 3: Doan ten tinh dua vao hinh anh",
        accentClass: "text-rose-500",
      },
      {
        id: "level4",
        label: "Cap 4: Xuyen Viet lo trinh",
        accentClass: "text-sky-500",
      },
      {
        id: "level5",
        label: "Cap 5: Am thanh dia phuong",
        accentClass: "text-indigo-500",
      },
    ],
  },
  {
    id: "pack2",
    title: "Van hoa - Lich su",
    description: "Cac mini game dang duoc phat trien, hen gap ban som!",
    levels: [
      {
        id: "pack2-level1",
        label: "Cap 1: Van hoa vung mien",
        accentClass: "text-fuchsia-500",
        status: "comingSoon",
      },
      {
        id: "pack2-level2",
        label: "Cap 2: Le hoi va phong tuc",
        accentClass: "text-orange-400",
        status: "comingSoon",
      },
      {
        id: "pack2-level3",
        label: "Cap 3: Dau an lich su",
        accentClass: "text-cyan-400",
        status: "comingSoon",
      },
    ],
  },
];

export const LEVELS_BY_ID: Record<GameScreen, LevelMeta> = PACKS.flatMap((pack) => pack.levels)
  .reduce<Record<GameScreen, LevelMeta>>((acc, level) => {
    acc[level.id] = level;
    return acc;
  }, {} as Record<GameScreen, LevelMeta>);
