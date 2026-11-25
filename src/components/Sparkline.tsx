export default function Sparkline({ points, mineIndex = 0 }: { points: number[]; mineIndex?: number }) {
  if (points.length < 2) return <div className="h-10 text-[10px] text-faint">Tracking starts — next read in ≤6h</div>;
  const w = 160, h = 40, min = Math.min(...points), max = Math.max(...points) || 1;
  const xy = points.map((p, i) => [(i / (points.length - 1)) * w, h - 4 - ((p - min) / (max - min || 1)) * (h - 8)]);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join("");
  const [mx, my] = xy[mineIndex];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-10 w-40" aria-label="Impressions over time">
      <path d={`${d}L${w},${h}L0,${h}Z`} fill="rgba(94,240,192,.08)" />
      <path d={d} fill="none" stroke="#5ef0c0" strokeWidth="1.5" />
      <circle cx={mx} cy={my} r="3" fill="#1a2bff" stroke="#fff" strokeWidth="1" />
    </svg>
  );
}
