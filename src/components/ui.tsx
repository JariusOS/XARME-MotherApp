"use client";
import { useId } from "react";
import type { ReactNode, SVGProps } from "react";

/** Official XARME mark (Drive: XARME BRAND/Logo/SVG/svg-1.svg). */
export function Logo(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="800 780 480 510" fill="none" aria-label="Xarme" role="img" {...p}>
      <path fillRule="evenodd" clipRule="evenodd" fill="currentColor" d="M1026.07 1017.81L1027.91 1015.46L1092.48 1018.88L1091.26 1020.27C1088.51 1023.4 1088.34 1028.05 1090.87 1031.37L1267.94 1264.76C1272.33 1270.55 1268.21 1278.86 1260.95 1278.86H1132.55C1129.82 1278.86 1127.25 1277.58 1125.58 1275.42L1016.92 1133.78C1013.55 1129.39 1007 1129.17 1003.35 1133.33L878.228 1275.87C876.56 1277.77 874.154 1278.86 871.626 1278.86H820.213C812.659 1278.86 808.627 1269.95 813.609 1264.28L970.719 1085.25C971.26 1084.64 971.702 1083.96 972.042 1083.25L992.905 1060.13L1004.2 1045.72L1146.21 1230.82C1147.88 1232.98 1150.45 1234.25 1153.18 1234.25H1172.58C1179.84 1234.25 1183.96 1225.94 1179.57 1220.16L1026.07 1017.81Z" />
      <path d="M1225.61 806.492L1031.92 1055.99L838.232 806.492L1225.61 806.492Z" stroke="currentColor" strokeWidth="46.9156" />
      <rect x="1011.46" y="815.796" width="40.9487" height="212.933" fill="currentColor" />
    </svg>
  );
}

export function Gema(p: SVGProps<SVGSVGElement>) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 40 48" aria-hidden {...p}>
      <defs>
        <linearGradient id={`gm${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8fb2ff" /><stop offset=".5" stopColor="#1f4fd8" /><stop offset="1" stopColor="#0a1a6b" />
        </linearGradient>
      </defs>
      <path d="M12 2 26 0l10 10-2 30-14 8L6 40 2 14z" fill={`url(#gm${id})`} />
      <path d="M26 0l10 10-2 30-14 8 4-30z" fill="#0c2a9a" opacity=".55" />
      <path d="M12 2 26 0l-2 18z" fill="#dbe6ff" opacity=".55" />
    </svg>
  );
}

export function Xeet(p: SVGProps<SVGSVGElement>) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 40 40" aria-hidden {...p}>
      <defs>
        <radialGradient id={`xc${id}`} cx=".35" cy=".3" r=".8">
          <stop offset="0" stopColor="#fff" /><stop offset=".6" stopColor="#d6dae3" /><stop offset="1" stopColor="#8d94a3" />
        </radialGradient>
      </defs>
      <circle cx="20" cy="20" r="19" fill={`url(#xc${id})`} />
      <path d="M13 12h14M24 14l-9 14M16 14l9 14" stroke="#7d8597" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

/** Marks anything not backed by a production integration. */
export function Sim({ children = "SIMULATED" }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-gold/40 bg-gold/10 px-1.5 py-px text-[10px] font-semibold tracking-wider text-gold">
      {children}
    </span>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "loss" | "mint" }) {
  return (
    <div className="rounded-3xl bg-surface p-4">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={`num mt-1.5 text-lg font-bold ${tone === "loss" ? "text-loss" : tone === "mint" ? "text-mint" : ""}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Button({
  children, onClick, disabled, variant = "primary", className = "", type = "button",
}: {
  children: ReactNode; onClick?: () => void; disabled?: boolean; variant?: "primary" | "ghost";
  className?: string; type?: "button" | "submit";
}) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full px-5 h-11 text-sm font-semibold transition active:scale-[.98] disabled:opacity-40 disabled:active:scale-100";
  const v = variant === "primary"
    ? "bg-brand text-white hover:bg-brand-2"
    : "bg-surface text-ink hover:bg-raised";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${v} ${className}`}>
      {children}
    </button>
  );
}
