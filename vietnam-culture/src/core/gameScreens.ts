export type GameScreen =
  | "level1"
  | "level2"
  | "level3"
  | "level4"
  | "level5"
  | "pack2-level1"
  | "pack2-level2"
  | "pack2-level3";

export const GAME_SCREENS: GameScreen[] = [
  "level1",
  "level2",
  "level3",
  "level4",
  "level5",
  "pack2-level1",
  "pack2-level2",
  "pack2-level3",
];

export const ACTIVE_GAME_SCREENS: GameScreen[] = [
  "level1",
  "level2",
  "level3",
  "level4",
  "level5",
];
