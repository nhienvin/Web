import { useEffect, useState } from "react";

export type AtlasPaths = Record<string, string>; // id -> d

export function useAtlasPaths(atlasUrl = "/assets/atlas.svg") {
  const [paths, setPaths] = useState<AtlasPaths>({});
  useEffect(() => {
    fetch(atlasUrl).then(r => r.text()).then(txt => {
      const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
      const map: AtlasPaths = {};
      // <symbol id="p-XX"><path d="..."></path></symbol>
      doc.querySelectorAll("symbol[id^='p-']").forEach(sym => {
        const id = sym.getAttribute("id") || "";
        const pid = id.startsWith("p-") ? id.slice(2) : id;
        const path = sym.querySelector("path");
        if (path) {
          const d = path.getAttribute("d") || "";
          if (d) map[pid] = d;
        }
      });
      setPaths(map);
    }).catch(()=> setPaths({}));
  }, [atlasUrl]);
  return paths;
}
