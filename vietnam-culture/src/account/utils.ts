export function generateId(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${random}`;
}

export function generateClassCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    const idx = Math.floor(Math.random() * alphabet.length);
    code += alphabet[idx];
  }
  return code;
}

export function formatRelativeTime(timestamp?: string): string {
  if (!timestamp) return "-";
  const value = Date.parse(timestamp);
  if (Number.isNaN(value)) return "-";
  const diff = Date.now() - value;
  if (diff < 60_000) return "vua xong";
  if (diff < 3_600_000) {
    const mins = Math.floor(diff / 60_000);
    return `${mins} phut truoc`;
  }
  if (diff < 86_400_000) {
    const hours = Math.floor(diff / 3_600_000);
    return `${hours} gio truoc`;
  }
  const days = Math.floor(diff / 86_400_000);
  return `${days} ngay truoc`;
}

export function formatDuration(ms?: number): string {
  if (typeof ms !== "number" || Number.isNaN(ms)) {
    return "-";
  }
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = seconds.toString().padStart(2, "0");
  return `${minutes}:${paddedSeconds}`;
}
