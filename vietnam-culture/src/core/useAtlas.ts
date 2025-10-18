import { useEffect, useState } from "react";

export type AtlasPaths = Record<string, string>; // provinceId -> path d

function normalizePid(raw: string): string {
  // strip common prefixes and leading zeros: "p-01" -> "1", "01" -> "1"
  const noPrefix = raw.replace(/^p-/, "");
  const stripped = noPrefix.replace(/^0+/, "");
  return stripped.length ? stripped : "0";
}
function parseAtlasSvg(txt: string): AtlasPaths {
  const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
  const map: AtlasPaths = {};

  // Case 1: <symbol id="p-XX"><path d="..."/></symbol>
  doc.querySelectorAll("symbol[id]").forEach(sym => {
    const id = sym.getAttribute("id") || "";
    const pid = normalizePid(id);
    const path = sym.querySelector("path");
    const d = path?.getAttribute("d") || "";
    if (d && !map[pid]) map[pid] = d;
  });

  // Case 2: <path id="p-XX" d="..."/> OR <path id="XX" d="..."/>
  doc.querySelectorAll("path[id]").forEach(p => {
    const id = p.getAttribute("id") || "";
    const pid = normalizePid(id);
    const d = p.getAttribute("d") || "";
    if (d && !map[pid]) map[pid] = d;
  });

  // Case 3: <g id="p-XX"><path d="..."/></g>
  doc.querySelectorAll("g[id]").forEach(g => {
    const id = g.getAttribute("id") || "";
    const pid = normalizePid(id);
    const path = g.querySelector("path");
    const d = path?.getAttribute("d") || "";
    if (d && !map[pid]) map[pid] = d;
  });

  return map;
}

type AtlasEntry = {
  promise: Promise<AtlasPaths>;
  value?: AtlasPaths;
};

const atlasCache = new Map<string, AtlasEntry>();

function ensureAtlasEntry(url: string) {
  let entry = atlasCache.get(url);
  if (!entry) {
    const promise = fetch(url)
      .then(res => (res.ok ? res.text() : Promise.reject(new Error("Failed to load atlas"))))
      .then(parseAtlasSvg)
      .catch(() => ({} as AtlasPaths))
      .then(result => {
        if (entry) {
          entry.value = result;
        }
        return result;
      });
    entry = { promise };
    atlasCache.set(url, entry);
  }
  return entry;
}
export function useAtlasPaths(atlasUrl = "/assets/atlas.svg") {
  const [paths, setPaths] = useState<AtlasPaths>(() => atlasCache.get(atlasUrl)?.value ?? {});
  useEffect(() => {
    let cancelled = false;
    const cached = atlasCache.get(atlasUrl)?.value;
    if (cached) setPaths(cached);

    const entry = ensureAtlasEntry(atlasUrl);
    entry.promise.then(result => {
      if (!cancelled) setPaths(result);
    });

    return () => {
      cancelled = true;
    };
  }, [atlasUrl]);
  return paths;
}
