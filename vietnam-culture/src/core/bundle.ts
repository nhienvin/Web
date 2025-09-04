import type { Bundle, Province } from '../types';

export async function loadBundle(): Promise<Bundle> {
  const res = await fetch('/data/provinces.bundle.json');
  if (!res.ok) throw new Error('Cannot load provinces.bundle.json');
  return res.json();
}

export function getProvince(bundle: Bundle, id: string): Province | undefined {
  const i = bundle.indexById[id];
  return typeof i === 'number' ? bundle.provinces[i] : undefined;
}
