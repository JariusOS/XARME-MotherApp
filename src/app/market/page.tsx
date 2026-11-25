"use client";
import { useMemo, useState } from "react";
import SignTile from "@/components/SignTile";
import { SIGNS, TIERS, count, type Tier } from "@/lib/signs";

const THEMES = ["Motion", "Hazard", "Tech", "Body", "Vices", "Nature", "Misc"];

export default function Market() {
  const [tier, setTier] = useState<Tier | "all">("all");
  const [theme, setTheme] = useState<string>("all");
  const [q, setQ] = useState("");
  const [ring, setRing] = useState<string>("all");
  const list = useMemo(() => SIGNS.filter((s) =>
    (tier === "all" || s.tier === tier) && (theme === "all" || s.theme === theme) && (ring === "all" || s.ring === ring) &&
    (!q || s.name.toLowerCase().includes(q.toLowerCase()) || String(s.n) === q.replace("#", ""))), [tier, theme, ring, q]);

  return (
    <div className="rise">
      <div className="text-center">
        <div className="font-pixel text-xs text-muted">Signs on Solana · powered by xarmebot</div>
        <h1 className="mt-2 font-display text-[clamp(30px,9vw,44px)] font-bold tracking-tight">Market</h1>
        <p className="text-[15px] text-muted">303 signs. Tap one for traits and holder.</p>
      </div>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or #"
        className="mt-6 h-12 w-full rounded-full border border-line bg-bg px-5 outline-none placeholder:text-faint focus:border-brand" />

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Chip on={tier === "all"} onClick={() => setTier("all")}>All 303</Chip>
        {TIERS.map((t) => (
          <Chip key={t.id} on={tier === t.id} onClick={() => setTier(t.id)}>
            <span className="h-2 w-2 rounded-full" style={{ background: t.color }} />{t.label} {count("tier", t.id)}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
        <Chip on={theme === "all"} onClick={() => setTheme("all")} small>Any theme</Chip>
        {THEMES.map((t) => <Chip key={t} on={theme === t} onClick={() => setTheme(t)} small>{t}</Chip>)}
      </div>
      <div className="mt-2 flex gap-2">
        {[["all", "Any frame"], ["Black ring", `Black ring ${count("ring", "Black ring")}`], ["No ring", `No ring ${count("ring", "No ring")}`]].map(([v, l]) => (
          <Chip key={v} on={ring === v} onClick={() => setRing(v)} small>
            {v !== "all" && <span className={`h-3 w-3 rounded-full ${v === "Black ring" ? "border-[3px] border-black bg-loss" : "bg-loss"}`} />}{l}
          </Chip>
        ))}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {list.map((s) => <SignTile key={s.n} s={s} />)}
      </div>
      {list.length === 0 && <p className="py-12 text-center text-sm text-muted">No signs match.</p>}
    </div>
  );
}

function Chip({ on, onClick, children, small }: { on: boolean; onClick: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <button onClick={onClick}
      className={`flex flex-none items-center gap-1.5 rounded-full px-3.5 ${small ? "py-1.5 text-xs" : "py-2 text-sm"} font-semibold transition ${on ? "bg-brand text-white" : "bg-surface text-ink/90 hover:bg-raised"}`}>
      {children}
    </button>
  );
}
