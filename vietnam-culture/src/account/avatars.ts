import type { AvatarId } from "./types";

type AvatarPreset = {
  id: AvatarId;
  label: string;
  background: string;
  foreground: string;
};

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "jade", label: "Jade", background: "bg-emerald-500", foreground: "text-white" },
  { id: "sunrise", label: "Sunrise", background: "bg-amber-500", foreground: "text-slate-900" },
  { id: "indigo", label: "Indigo", background: "bg-indigo-500", foreground: "text-white" },
  { id: "amber", label: "Lotus", background: "bg-rose-500", foreground: "text-white" },
  { id: "teal", label: "Teal", background: "bg-teal-500", foreground: "text-white" },
  { id: "crimson", label: "Crimson", background: "bg-red-500", foreground: "text-white" },
  { id: "slate", label: "Slate", background: "bg-slate-500", foreground: "text-white" },
  { id: "violet", label: "Violet", background: "bg-fuchsia-500", foreground: "text-white" },
];

export function getAvatarPreset(id: AvatarId): AvatarPreset {
  return AVATAR_PRESETS.find((preset) => preset.id === id) ?? AVATAR_PRESETS[0];
}
