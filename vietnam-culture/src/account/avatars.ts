import type { AvatarId } from "./types";

export type AvatarPreset = {
  id: AvatarId;
  label: string;
  background: string;
  foreground: string;
};

export type AvatarPresetOption = AvatarPreset & { kind: "preset" };
export type AvatarImageOption = {
  kind: "image";
  id: AvatarId;
  label: string;
  url: string;
};

export type AvatarOption = AvatarPresetOption | AvatarImageOption;

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

const PRESET_OPTIONS: AvatarPresetOption[] = AVATAR_PRESETS.map((preset) => ({
  kind: "preset" as const,
  ...preset,
}));

export const DEFAULT_AVATAR_ID = AVATAR_PRESETS[0].id;
const DEFAULT_AVATAR_OPTION: AvatarPresetOption = PRESET_OPTIONS[0];

const PEOPLE_IMAGE_OPTIONS = loadPeopleAvatarImages();
const CLASS_IMAGE_OPTIONS = loadClassAvatarImages();;

export function getPresetAvatarOptions(): AvatarOption[] {
  return PRESET_OPTIONS.slice();
}

export function getPeopleAvatarOptions(): AvatarOption[] {
  return PEOPLE_IMAGE_OPTIONS.length > 0 ? PEOPLE_IMAGE_OPTIONS.slice() : getPresetAvatarOptions();
}

export function getClassAvatarOptions(): AvatarOption[] {
  return CLASS_IMAGE_OPTIONS.length > 0 ? CLASS_IMAGE_OPTIONS.slice() : getPresetAvatarOptions();
}

export function resolveAvatar(id: AvatarId): AvatarOption {
  return (
    PEOPLE_IMAGE_OPTIONS.find((option) => option.id === id) ??
    CLASS_IMAGE_OPTIONS.find((option) => option.id === id) ??
    PRESET_OPTIONS.find((option) => option.id === id) ??
    DEFAULT_AVATAR_OPTION
  );
}

export function getAvatarPreset(id: AvatarId): AvatarPreset {
  return AVATAR_PRESETS.find((preset) => preset.id === id) ?? AVATAR_PRESETS[0];
}

function loadPeopleAvatarImages(): AvatarImageOption[] {
  const modules = import.meta.glob(
    "../../public/assets/avatars/people/*.{png,jpg,jpeg,webp,avif,gif,svg}",
    {
      eager: true,
      import: "default",
    },
  ) as Record<string, string>;

  return normalizeAvatarModules(modules, "people");
}

function loadClassAvatarImages(): AvatarImageOption[] {
  const modules = import.meta.glob(
    "../../public/assets/avatars/class/*.{png,jpg,jpeg,webp,avif,gif,svg}",
    {
      eager: true,
      import: "default",
    },
  ) as Record<string, string>;

  return normalizeAvatarModules(modules, "class");
}

function normalizeAvatarModules(
  modules: Record<string, string>,
  folder: "people" | "class",
): AvatarImageOption[] {
  const items = new Map<AvatarId, AvatarImageOption>();

  for (const [path, url] of Object.entries(modules)) {
    const fileName = path.split("/").pop();
    if (!fileName) continue;

    const id = `assets/avatars/${folder}/${fileName}`;
    const normalizedUrl = url.startsWith("/") ? url : `/${id}`;

    items.set(id, {
      kind: "image",
      id,
      label: formatAvatarLabel(fileName),
      url: normalizedUrl,
    });
  }

  return Array.from(items.values()).sort((a, b) => a.label.localeCompare(b.label));
}

function formatAvatarLabel(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]$/, "");
  return baseName
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}