import { useEffect, useState } from "react";

export type ViewBoxTuple = [number, number, number, number];

type ViewBoxEntry = {
  promise: Promise<ViewBoxTuple | null>;
  value?: ViewBoxTuple | null;
};

const viewBoxCache = new Map<string, ViewBoxEntry>();

export function extractViewBoxFromString(svgText: string): ViewBoxTuple | null {
  const match = svgText.match(
    /viewBox\s*=\s*["']\s*([0-9.+-eE]+)\s+([0-9.+-eE]+)\s+([0-9.+-eE]+)\s+([0-9.+-eE]+)\s*["']/i
  );
  if (!match) return null;
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4])
  ];
}

function ensureViewBoxEntry(src: string) {
  let entry = viewBoxCache.get(src);
  if (!entry) {
    const promise = fetch(src)
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error("Failed to load SVG"))))
      .then((txt) => extractViewBoxFromString(txt))
      .catch(() => null)
      .then((vb) => {
        if (entry) {
          entry.value = vb;
        }
        return vb;
      });
    entry = { promise };
    viewBoxCache.set(src, entry);
  }
  return entry;
}

export function getCachedViewBox(src: string): ViewBoxTuple | null {
  const entry = viewBoxCache.get(src);
  return entry?.value ?? null;
}

export function useBoardViewBox(src: string, fallback: ViewBoxTuple) {
  const [vb, setVb] = useState<ViewBoxTuple>(() => getCachedViewBox(src) ?? fallback);

  useEffect(() => {
    let cancelled = false;
    const cached = getCachedViewBox(src);
    setVb(cached ?? fallback);

    const entry = ensureViewBoxEntry(src);
    entry.promise.then((value) => {
      if (cancelled) return;
      if (value) {
        setVb(value);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [src, fallback]);

  return vb;
}