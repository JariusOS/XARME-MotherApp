/** PLACEHOLDER art for SIGNS until the real collection artwork is supplied. Deterministic per seed. */
export default function SignArt({ seed, className = "" }: { seed: number; className?: string }) {
  let s = seed * 9301 + 49297;
  const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  const bgs = ["#2a1c18", "#141a3a", "#1d2b22", "#311a2b"];
  const ink = ["#e8735a", "#010AFC", "#f5c451", "#f5ede9"];
  const bg = bgs[seed % bgs.length];
  const a = ink[seed % ink.length], b = ink[(seed + 1 + Math.floor(r() * 3)) % ink.length];
  const shape = seed % 3;
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label={`SIGNS #${seed} (placeholder art)`}>
      <rect width="100" height="100" fill={bg} />
      {Array.from({ length: 6 }, (_, i) => (
        <line key={i} x1="0" y1={15 + i * 15} x2="100" y2={15 + i * 15} stroke="#ffffff" strokeOpacity=".04" />
      ))}
      {shape === 0 && <rect x="26" y="26" width="48" height="48" rx="14" fill={a} />}
      {shape === 1 && <path d="M50 20 82 78H18z" fill={a} />}
      {shape === 2 && <circle cx="50" cy="50" r="26" fill={a} />}
      <path d={`M${30 + r() * 10} ${70 - r() * 10} Q50 ${30 + r() * 20} ${70 - r() * 10} ${30 + r() * 10}`} stroke={b} strokeWidth="5" fill="none" strokeLinecap="round" />
      <text x="8" y="94" fontSize="7" fill="#ffffff" fillOpacity=".55" fontFamily="monospace">#{String(seed).padStart(3, "0")}</text>
    </svg>
  );
}
