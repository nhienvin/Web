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
    title: "Địa lý - Bản đồ",
    description: "Hành trình khám phá địa lý Việt Nam",
    levels: [
      {
        id: "level1",
        label: "Cấp 1: Ghép tên tỉnh vào bản đồ",
        accentClass: "text-emerald-500",
      },
      {
        id: "level2",
        label: "Cấp 2: Ghép ảnh tỉnh vào bản đồ",
        accentClass: "text-amber-500",
      },
      {
        id: "level3",
        label: "Cấp 3: Đoán tên tỉnh dựa vào hình ảnh",
        accentClass: "text-rose-500",
      },
      {
        id: "level4",
        label: "Cấp 4: Xuyên Việt lộ trình",
        accentClass: "text-sky-500",
      },
      {
        id: "level5",
        label: "Cấp 5: Âm thanh địa phương",
        accentClass: "text-indigo-500",
      },
    ],
  },
  {
    id: "pack2",
    title: "Văn hóa - Lịch sử",
    description: "Các mini game đang được phát triển, Hẹn gặp bạn sớm!",
    levels: [
      {
        id: "pack2-level1",
        label: "Cấp 1: Văn hóa vùng miền",
        accentClass: "text-fuchsia-500",
        status: "comingSoon",
      },
      {
        id: "pack2-level2",
        label: "Cấp 2: Lễ hội và phong tục",
        accentClass: "text-orange-400",
        status: "comingSoon",
      },
      {
        id: "pack2-level3",
        label: "Cấp 3: Dấu ấn lịch sử",
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
