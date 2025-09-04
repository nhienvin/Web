// Tính bbox từ path d
export function bboxFromPathD(d: string) {
    const nums = [...d.matchAll(/-?\d*\.?\d+(?:e[+-]?\d+)?/gi)].map(m => parseFloat(m[0]));
    if (nums.length < 2) return { minx: 0, miny: 0, maxx: 100, maxy: 100, w: 100, h: 100, area: 100*100 };
    const xs:number[] = [], ys:number[] = [];
    for (let i=0;i<nums.length;i+=2){ xs.push(nums[i]); ys.push(nums[i+1] ?? 0); }
    const minx = Math.min(...xs), maxx = Math.max(...xs);
    const miny = Math.min(...ys), maxy = Math.max(...ys);
    const w = Math.max(1, maxx-minx), h = Math.max(1, maxy-miny);
    return { minx, miny, maxx, maxy, w, h, area: w*h };
  }
  
  // Chia path theo lệnh 'M' (mỗi cụm đất/đảo thường là 1 subpath)
  function splitSubpaths(d: string): string[] {
    const parts = d.split(/(?=M|m)/g).map(s=>s.trim()).filter(Boolean);
    return parts.length ? parts : [d];
  }
  
  type Sub = { d: string, b: ReturnType<typeof bboxFromPathD>, cx: number, cy: number };
  
  function analyzeSubs(d: string): Sub[] {
    return splitSubpaths(d).map(sp => {
      const b = bboxFromPathD(sp);
      return { d: sp, b, cx: b.minx + b.w/2, cy: b.miny + b.h/2 };
    });
  }
  
  /**
   * viewBox gần anchor: 
   * - Ưu tiên cụm có **diện tích lớn nhất** trong vòng 'nearR' quanh anchor.
   * - Nếu anchor không đáng tin (xa tất cả), chọn **cụm lớn nhất toàn cục** (đất liền).
   * - Gom thêm các cụm ở gần cụm chọn trong bán kính 'groupR' (đảo ven bờ).
   */
  const _vbCache = new Map<string, {x:number,y:number,w:number,h:number}>();

export function viewBoxNearAnchorSmart(
  d: string, anchorX: number, anchorY: number, pad = 6, nearR = 600, groupR = 220)
  {
  const key = `${d.length}:${d.slice(0,64)}|${Math.round(anchorX)}|${Math.round(anchorY)}|${pad}|${nearR}|${groupR}`;
  const hit = _vbCache.get(key);
  if (hit) return hit;

  const subs = analyzeSubs(d).filter(s => isFinite(s.b.w) && isFinite(s.b.h));
  if (!subs.length) {
    const b = bboxFromPathD(d);
    const vb = { x: b.minx - pad, y: b.miny - pad, w: b.w + 2*pad, h: b.h + 2*pad };
    _vbCache.set(key, vb); return vb;
  }

  const near = subs
    .map(s => ({ s, dd: Math.hypot(s.cx - anchorX, s.cy - anchorY) }))
    .filter(x => x.dd <= nearR)
    .sort((a,b)=> b.s.b.area - a.s.b.area);

  const seed = (near.length ? near[0].s : subs.slice().sort((a,b)=> b.b.area - a.b.area)[0]);

  const keep = subs.filter(s => Math.hypot(s.cx - seed.cx, s.cy - seed.cy) <= groupR);

  let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
  for (const s of keep) {
    minx = Math.min(minx, s.b.minx); miny = Math.min(miny, s.b.miny);
    maxx = Math.max(maxx, s.b.maxx); maxy = Math.max(maxy, s.b.maxy);
  }
  const w = Math.max(1, maxx - minx), h = Math.max(1, maxy - miny);
  const vb = { x: minx - pad, y: miny - pad, w: w + 2*pad, h: h + 2*pad };
  _vbCache.set(key, vb);
  return vb;
}
  