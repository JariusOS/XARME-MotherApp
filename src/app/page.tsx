"use client";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import LinkWallet from "@/components/LinkWallet";
import Receipt, { type MineResult } from "@/components/Receipt";
import { ago, compact, dec, hms, untilUtcMidnight } from "@/components/format";
import { post, useMe } from "@/components/hooks";
import { Button, Gema, Logo, Sim, Xeet } from "@/components/ui";

type Post = {
  id: string; text: string; authorUsername: string; authorName: string; postedAt: string;
  impressions: number; likes: number; xeet: number; gema: number; minedBy: string | null;
  source: string; eligible?: boolean;
};

export default function Discover() {
  const { data: meData } = useMe();
  const me = meData?.user;
  const { data, error, isLoading } = useSWR<{ posts: Post[] }>("/api/discover");
  const [url, setUrl] = useState("");
  const [looked, setLooked] = useState<Post | null>(null);
  const [lookErr, setLookErr] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [mineErr, setMineErr] = useState<{ id: string; msg: string } | null>(null);
  const [receipt, setReceipt] = useState<MineResult | null>(null);
  const [left, setLeft] = useState(untilUtcMidnight());
  useEffect(() => { const t = setInterval(() => setLeft(untilUtcMidnight()), 1000); return () => clearInterval(t); }, []);

  const remaining = me ? me.dailyMines - me.minesToday : 3;
  const canMine = !!me && !!me.wallet && remaining > 0;

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLookErr(null); setLooked(null);
    try { setLooked((await post<{ post: Post }>("/api/lookup", { url })).post); }
    catch (e) { setLookErr((e as Error).message); }
  }

  async function mine(id: string) {
    setBusyId(id); setMineErr(null);
    try {
      const r = await post<MineResult>("/api/mine", { tweetId: id });
      setReceipt(r);
      if (looked?.id === id) setLooked({ ...looked, minedBy: me!.username });
      mutate("/api/me"); mutate("/api/discover"); mutate("/api/dashboard");
    } catch (e) {
      setMineErr({ id, msg: (e as Error).message });
      mutate("/api/discover");
    } finally { setBusyId(null); }
  }

  const action = (p: Post) => {
    if (p.minedBy) return <span className="text-xs text-muted">Mined by <span className="text-ink">@{p.minedBy}</span></span>;
    if (p.eligible === false) return <span className="text-xs text-loss">Under 1M impressions</span>;
    if (!me) return <a href="/api/auth/x/login" className="text-xs font-semibold text-brand-2">Connect X to mine</a>;
    return (
      <Button onClick={() => mine(p.id)} disabled={!canMine || busyId !== null} className="h-9 px-5">
        {busyId === p.id ? "Mining…" : "Mine"}
      </Button>
    );
  };

  return (
    <div className="rise">
      <section className="glow -mx-4 px-4 pb-6 pt-2">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Mine attention.</h1>
        <p className="mt-2 max-w-md text-sm text-muted">
          Find an X post with 1M+ impressions. Be first. Extract <span className="text-ink">1 XEET</span> per million
          impressions and <span className="text-ink">1 GEMA</span> per 10,000 likes, as of the moment you mine.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
          <form onSubmit={lookup} className="flex gap-2">
            <input
              value={url} onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste an x.com post link"
              className="h-11 min-w-0 flex-1 rounded-xl border border-line bg-surface px-4 text-sm outline-none placeholder:text-faint focus:border-brand"
            />
            <Button type="submit" variant="ghost" disabled={!url.trim()}>Check</Button>
          </form>
          <div className="flex items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-2 sm:justify-start">
            <div className="flex gap-1.5" aria-label={`${remaining} of 3 mines left today`}>
              {[0, 1, 2].map((i) => (
                <span key={i} className={`h-2.5 w-6 rounded-full ${i < remaining ? "bg-brand" : "bg-line"}`} />
              ))}
            </div>
            <div className="text-xs text-muted"><span className="num text-ink">{remaining}</span> left · resets <span className="num">{hms(left)}</span></div>
          </div>
        </div>

        {me && !me.wallet && (
          <div className="mt-3 flex flex-col items-start gap-3 rounded-xl border border-brand/40 bg-brand/10 p-4 sm:flex-row sm:items-center">
            <p className="flex-1 text-sm">Link a Solana wallet to start mining. It&apos;s your identity on the ENDGAME board.</p>
            <LinkWallet compact />
          </div>
        )}

        {lookErr && <p className="mt-3 text-sm text-loss">{lookErr}</p>}
        {looked && (
          <div className="mt-4"><PostRow p={looked} action={action(looked)} highlight err={mineErr?.id === looked.id ? mineErr.msg : null} /></div>
        )}
      </section>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">Eligible now</h2>
          {data?.posts[0]?.source === "simulated" && <Sim>SIMULATED FEED</Sim>}
        </div>
        {isLoading && <div className="space-y-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />)}</div>}
        {error && <p className="text-sm text-loss">{error.message}</p>}
        {data && data.posts.length === 0 && <p className="text-sm text-muted">No eligible posts right now. Paste one above.</p>}
        <div className="space-y-2">
          {data?.posts.map((p) => (
            <PostRow key={p.id} p={p} action={action(p)} err={mineErr?.id === p.id ? mineErr.msg : null} />
          ))}
        </div>
      </section>

      {receipt && <Receipt r={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function PostRow({ p, action, highlight, err }: { p: Post; action: React.ReactNode; highlight?: boolean; err?: string | null }) {
  return (
    <article className={`rounded-2xl border bg-surface p-4 transition ${highlight ? "border-brand/60" : "border-line hover:border-faint"} ${p.minedBy ? "opacity-60" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 flex-none place-items-center rounded-full bg-raised"><Logo className="h-4 w-4 text-muted" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 text-sm">
            <span className="truncate font-semibold">{p.authorName}</span>
            <span className="truncate text-muted">@{p.authorUsername}</span>
            <span className="ml-auto flex-none text-xs text-faint">{ago(p.postedAt)}</span>
          </div>
          <a href={`https://x.com/${p.authorUsername}/status/${p.id}`} target="_blank" rel="noreferrer"
            className="mt-1 line-clamp-2 block text-sm text-ink/90 hover:underline">{p.text}</a>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Metric label="Views" value={compact(p.impressions)} />
            <Metric label="Likes" value={compact(p.likes)} />
            <span className="flex items-center gap-1.5"><Xeet className="h-4 w-4" /><span className="num text-sm font-bold text-mint">+{dec(p.xeet)}</span></span>
            <span className="flex items-center gap-1.5"><Gema className="h-4 w-4" /><span className="num text-sm font-bold">+{dec(p.gema)}</span></span>
            <div className="ml-auto">{action}</div>
          </div>
          {err && <p className="mt-2 text-xs text-loss">{err}</p>}
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <span className="text-xs text-muted">{label} <span className="num text-sm text-ink">{value}</span></span>;
}
