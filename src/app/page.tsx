"use client";
import { useEffect, useMemo, useState } from "react";
import useSWR, { mutate } from "swr";
import LiveLine from "@/components/LiveLine";
import { PowerupsButton } from "@/components/Powerups";
import Receipt, { type MineResult } from "@/components/Receipt";
import Segmented from "@/components/Segmented";
import { ago, compact, dec, hms } from "@/components/format";
import { post, useMe } from "@/components/hooks";
import { Gema, Sim, Xeet } from "@/components/ui";

type Post = {
  id: string; text: string; authorUsername: string; authorName: string; postedAt: string;
  impressions: number; likes: number; xeet: number; gema: number; minedBy: string | null;
  source: string; eligible?: boolean;
};
type Sort = "top" | "fresh" | "open";

const TILE = ["#0f172a", "#0f766e", "#7c2d12", "#312e81", "#14532d", "#4a044e", "#1e3a8a", "#713f12"];

export default function Discover() {
  const { data: meData } = useMe();
  const me = meData?.user;
  const { data, error, isLoading } = useSWR<{ posts: Post[] }>("/api/discover", { refreshInterval: 30_000 });
  const [sort, setSort] = useState<Sort>("top");
  const [rank, setRank] = useState(1);
  const [url, setUrl] = useState("");
  const [checked, setChecked] = useState<Post | null>(null);
  const [msg, setMsg] = useState<{ tone: "err" | "ok"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<MineResult | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const list = useMemo(() => {
    const ps = [...(data?.posts ?? [])];
    if (sort === "fresh") ps.sort((a, b) => +new Date(b.postedAt) - +new Date(a.postedAt));
    else ps.sort((a, b) => b.xeet - a.xeet);
    return sort === "open" ? ps.filter((p) => !p.minedBy) : ps;
  }, [data, sort]);
  const open = list.filter((p) => !p.minedBy);
  const n = Math.min(Math.max(1, rank), Math.max(1, open.length));
  const target = checked ?? open[n - 1] ?? null;

  const slots = me?.dailyMines ?? 3;
  const remaining = me ? Math.max(0, me.dailyMines - me.minesToday) : 3;
  const freeIn = me?.nextFreeAt ? Math.max(0, Date.parse(me.nextFreeAt) - now) : null;
  const blocked = !me ? "Sign in with X to mine" : !me.wallet ? "Link a wallet to mine" : remaining <= 0 ? "All slots used" : null;

  async function check() {
    setMsg(null);
    try {
      const { post: p } = await post<{ post: Post }>("/api/lookup", { url });
      setChecked(p);
      if (p.minedBy) setMsg({ tone: "err", text: `Already mined by @${p.minedBy}.` });
      else if (!p.eligible) setMsg({ tone: "err", text: `Only ${compact(p.impressions)} impressions. Needs 1M+.` });
    } catch (e) { setChecked(null); setMsg({ tone: "err", text: (e as Error).message }); }
  }

  async function mine(p: Post) {
    if (!me) { location.href = "/api/auth/x/login"; return; }
    setBusy(true); setMsg(null);
    try {
      const r = await post<MineResult>("/api/mine", { tweetId: p.id });
      setReceipt(r); setChecked(null); setUrl("");
      mutate("/api/me"); mutate("/api/discover"); mutate("/api/stats"); mutate("/api/dashboard");
    } catch (e) {
      setMsg({ tone: "err", text: (e as Error).message });
      mutate("/api/discover");
    } finally { setBusy(false); }
  }

  const ctaLabel = busy ? "Mining…" : url.trim() && !checked ? "Check post" : blocked ?? (target ? "Mine it" : "Nothing to mine");
  const ctaDisabled = busy || (!url.trim() && (!target || (!!blocked && !!me)))
    || (!!checked && (!!checked.minedBy || checked.eligible === false));

  return (
    <div className="rise">
      <LiveLine />

      <div className="mt-6">
        <Segmented<Sort> value={sort} onChange={(v) => { setSort(v); setRank(1); }}
          options={[
            { id: "top", label: "Top", icon: <TrophyIcon /> },
            { id: "fresh", label: "Fresh" },
            { id: "open", label: "Unclaimed", tone: "live" },
          ]} />
      </div>

      {/* headline, outbid's "Claim #1 for $X" */}
      <section className="mt-8 text-center">
        <h1 className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-display text-[clamp(28px,8.5vw,44px)] font-bold leading-tight tracking-tight">
          {checked ? <span>Mine this for</span> : (
            <span className="flex items-center gap-2">
              Mine
              <Stepper dir={-1} disabled={n <= 1} onClick={() => setRank(n - 1)} />
              <span className="num">#{n}</span>
              <Stepper dir={1} disabled={n >= open.length} onClick={() => setRank(n + 1)} />
              for
            </span>
          )}
          <span className="num text-brand">{target ? `+${dec(target.xeet)}` : "—"}</span>
          <span className="text-brand">XEET</span>
        </h1>
        {target && (
          <p className="mt-2 text-sm text-muted">
            from @{target.authorUsername} · plus <span className="text-ink">{dec(target.gema)} GEMA</span>
          </p>
        )}

        <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); if (url.trim() && !checked) check(); else if (target) mine(target); }}>
          <label className="flex h-16 items-center gap-3 rounded-full border border-line bg-bg px-5 focus-within:border-brand">
            <svg viewBox="0 0 24 24" className="h-6 w-6 flex-none text-muted" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" />
            </svg>
            <input value={url} onChange={(e) => { setUrl(e.target.value); setChecked(null); setMsg(null); }}
              placeholder="Paste any X post URL"
              className="min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-faint" />
            {url && <button type="button" onClick={() => { setUrl(""); setChecked(null); setMsg(null); }} className="text-sm text-muted">Clear</button>}
          </label>
          <button type="submit" disabled={ctaDisabled}
            className="h-16 w-full rounded-full bg-brand font-display text-xl font-semibold text-white transition hover:bg-brand-2 active:scale-[.99] disabled:bg-brand-dim disabled:text-white/50">
            {ctaLabel}
          </button>
        </form>

        {msg && <p className={`mt-3 text-sm ${msg.tone === "err" ? "text-loss" : "text-mint"}`}>{msg.text}</p>}

        <div className="mt-4 flex items-center justify-center gap-3 text-sm text-muted">
          <span className="flex gap-1">{Array.from({ length: slots }, (_, i) => <span key={i} className={`h-2 w-5 rounded-full ${i < remaining ? "bg-brand" : "bg-line"}`} />)}</span>
          <span>
            <span className="num text-ink">{remaining}</span>/{slots} slots
            {freeIn !== null ? <> · next in <span className="num">{hms(freeIn)}</span></> : <> · {me?.windowHours ?? 24}h window</>}
            {me && me.boostLeft > 0 && <span className="ml-1 font-semibold text-gold">· {me.multiplier}x ×{me.boostLeft}</span>}
          </span>
          <PowerupsButton active={!!me && me.boostLeft > 0} />
        </div>
      </section>

      {checked && (
        <div className="mt-8">
          <Card p={checked} rank={null} selected onMine={() => mine(checked)} canMine={!blocked && !busy} />
        </div>
      )}

      {/* ranked list */}
      <section className="mt-10 space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="font-display text-lg font-semibold">$Tweets Recently mined</h2>
          {data?.posts[0]?.source === "simulated" && <Sim>SIMULATED FEED</Sim>}
        </div>
        {isLoading && [0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-3xl bg-surface" />)}
        {error && <p className="text-sm text-loss">{error.message}</p>}
        {list.map((p, i) => (
          <Card key={p.id} p={p} rank={i + 1} selected={!checked && target?.id === p.id}
            onSelect={() => { if (!p.minedBy) { setChecked(null); setRank(open.findIndex((o) => o.id === p.id) + 1); window.scrollTo({ top: 0, behavior: "smooth" }); } }}
            onMine={() => mine(p)} canMine={!blocked && !busy} />
        ))}
        {data && list.length === 0 && <p className="py-10 text-center text-sm text-muted">Nothing here yet. Paste a post above.</p>}
      </section>

      {receipt && <Receipt r={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function Card({ p, rank, selected, onSelect, onMine, canMine }: {
  p: Post; rank: number | null; selected?: boolean; onSelect?: () => void; onMine: () => void; canMine: boolean;
}) {
  const tile = TILE[parseInt(p.id.slice(-3), 10) % TILE.length];
  return (
    <article onClick={onSelect}
      className={`flex cursor-pointer gap-4 rounded-3xl p-4 transition ${selected ? "bg-raised ring-2 ring-brand" : "bg-surface hover:bg-raised"} ${p.minedBy ? "opacity-60" : ""}`}>
      <div className="grid h-16 w-16 flex-none place-items-center rounded-2xl font-display text-2xl font-bold text-white" style={{ background: tile }}>
        {p.authorName.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 flex-1 truncate font-display text-[17px] font-semibold">
            {rank !== null && <span className="mr-1.5 text-brand">#{rank}</span>}
            {p.authorName} <span className="font-normal text-muted">@{p.authorUsername}</span>
          </h3>
          <span className="num flex-none font-display text-[17px] font-bold text-brand">+{dec(p.xeet)}</span>
        </div>
        <p className="mt-0.5 truncate text-[15px] text-muted">{p.text}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1 text-ink"><Xeet className="h-4 w-4" />{compact(p.impressions)} views</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Gema className="h-4 w-4" />+{dec(p.gema)}</span>
          <span>·</span>
          <span>{ago(p.postedAt)}</span>
          <span>·</span>
          <a href={`https://x.com/${p.authorUsername}/status/${p.id}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-ink hover:underline">see post</a>
          <span className="ml-auto">
            {p.minedBy ? (
              <span>Mined by <span className="text-ink">@{p.minedBy}</span></span>
            ) : p.eligible === false ? (
              <span className="text-loss">Under 1M</span>
            ) : (
              <button onClick={(e) => { e.stopPropagation(); onMine(); }} disabled={!canMine}
                className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white hover:bg-brand-2 disabled:bg-brand-dim disabled:text-white/50">
                Mine
              </button>
            )}
          </span>
        </div>
      </div>
    </article>
  );
}

function Stepper({ dir, disabled, onClick }: { dir: 1 | -1; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={dir > 0 ? "Next target" : "Previous target"}
      className="grid h-10 w-10 place-items-center rounded-full bg-brand-dim/70 text-xl font-bold text-brand-2 transition hover:bg-brand-dim disabled:opacity-30">
      {dir > 0 ? "+" : "−"}
    </button>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3" />
    </svg>
  );
}
