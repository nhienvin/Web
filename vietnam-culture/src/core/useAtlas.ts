import { useEffect, useState } from "react";

export type AtlasPaths = Record<string, string>; // provinceId -> path d

function normalizePid(raw: string): string {
  // strip common prefixes and leading zeros: "p-01" -> "1", "01" -> "1"
  const noPrefix = raw.replace(/^p-/, "");
  const stripped = noPrefix.replace(/^0+/, "");
  return stripped.length ? stripped : "0";
}

export function useAtlasPaths(atlasUrl = "/assets/atlas.svg") {
  const [paths, setPaths] = useState<AtlasPaths>({});
  useEffect(() => {
    fetch(atlasUrl)
      .then(r => r.text())
      .then(txt => {
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

        setPaths(map);
      })
      .catch(() => setPaths({}));
  }, [atlasUrl]);
  return paths;
}
