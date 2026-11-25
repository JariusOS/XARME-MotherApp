"use client";
import { useId } from "react";
import type { ReactNode, SVGProps } from "react";

export function Logo(p: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-label="Xarme" {...p}>
      <path d="M4 4h56v5H4z" fill="currentColor" />
      <path d="M44 9h9L20 60h-9z" fill="currentColor" />
      <path d="M12 9h9l33 51h-9z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
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
    <div className="rounded-xl border border-line bg-surface p-3.5">
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
  const base = "inline-flex items-center justify-center gap-2 rounded-xl px-4 h-11 text-sm font-semibold transition active:scale-[.98] disabled:opacity-40 disabled:active:scale-100";
  const v = variant === "primary"
    ? "bg-brand text-white hover:bg-brand-2 shadow-[0_8px_24px_rgba(26,43,255,.35)]"
    : "border border-line bg-raised text-ink hover:border-faint";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${v} ${className}`}>
      {children}
    </button>
  );
}
