export type Entry = { name: string; ms: number };
export function loadLB(key: string): Entry[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
export function saveLB(key: string, list: Entry[]) {
  localStorage.setItem(key, JSON.stringify(list.slice(0,5)));
}
export function pushLB(key: string, e: Entry) {
  const arr = [...loadLB(key), e].sort((a,b)=>a.ms-b.ms).slice(0,5);
  saveLB(key, arr);
  return arr;
}
