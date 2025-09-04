export const dist = (ax:number, ay:number, bx:number, by:number) =>
    Math.hypot(ax-bx, ay-by);
  
  export const within = (d:number, r:number) => d <= r;
  