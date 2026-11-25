"use client";
import useSWR from "swr";
import Sparkline from "@/components/Sparkline";
import { ago, compact, dec, int } from "@/components/format";
import { useMe } from "@/components/hooks";
import { Gema, Sim, Stat, Xeet } from "@/components/ui";

type Mine = {
  tweetId: string; author: string; authorName: string; text: string; minedAt: string; lastTrackedAt: string;
  impressionsAtMine: number; latestImpressions: number; xeetExtracted: number; gemaExtracted: number;
  potentialXeet: number; xeetLost: number; source: string; series: { i: number }[];
};
type Data = { totals: { xeet: number; gema: number; posts: number; xeetLost: number }; mines: Mine[] };

export default function Dashboard() {
  const { data: me } = useMe();
  const { data, isLoading } = useSWR<Data>(me?.user ? "/api/dashboard" : null, { refreshInterval: 60_000 });

  if (me && !me.user) {
    return (
      <div className="rise mx-auto max-w-sm py-20 text-center">
        <h1 className="text-2xl font-bold">Miner Dashboard</h1>
        <p className="mt-2 text-sm text-muted">Connect X to see the posts you&apos;ve mined.</p>
        <a href="/api/auth/x/login" className="mt-6 inline-flex h-12 items-center rounded-full bg-brand px-6 text-sm font-semibold">Connect X</a>
      </div>
    );
  }

  return (
    <div className="rise">
      <h1 className="font-display text-3xl font-bold tracking-tight">Miner Dashboard</h1>
      <p className="mt-1 text-sm text-muted">Impressions re-tracked every 6 hours. XEET is locked at the moment of mining.</p>

      <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Stat label="XEET locked" value={<span className="flex items-center gap-2"><Xeet className="h-5 w-5" />{dec(data?.totals.xeet ?? 0, 4)}</span>} sub="Accumulative · non-spendable" />
        <Stat label="GEMA" value={<span className="flex items-center gap-2"><Gema className="h-5 w-5" />{dec(data?.totals.gema ?? 0, 4)}</span>} sub="Spendable" />
        <Stat label="Posts mined" value={data?.totals.posts ?? 0} />
        <Stat label="XEET lost to early mining" value={dec(data?.totals.xeetLost ?? 0, 4)} tone={(data?.totals.xeetLost ?? 0) > 0 ? "loss" : undefined} sub="Potential minus extracted" />
      </div>

      <div className="mt-8">
        {isLoading && <div className="h-40 animate-pulse rounded-2xl bg-surface" />}
        {data && data.mines.length === 0 && (
          <div className="rounded-3xl border border-dashed border-line p-10 text-center text-sm text-muted">
            No mines yet. Head to <a href="/" className="text-ink underline">Discover</a>.
          </div>
        )}

        {/* desktop table */}
        {data && data.mines.length > 0 && (
          <div className="hidden overflow-hidden rounded-3xl bg-surface lg:block">
            <table className="w-full text-sm">
              <thead className="bg-surface text-left text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-3 font-medium">Post</th>
                  <th className="px-3 py-3 text-right font-medium">At mining</th>
                  <th className="px-3 py-3 text-right font-medium">Now</th>
                  <th className="px-3 py-3 font-medium">Trend</th>
                  <th className="px-3 py-3 text-right font-medium">XEET extracted</th>
                  <th className="px-3 py-3 text-right font-medium">Potential</th>
                  <th className="px-4 py-3 text-right font-medium">Lost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {data.mines.map((m) => (
                  <tr key={m.tweetId} className="hover:bg-surface/60">
                    <td className="max-w-[240px] px-4 py-3">
                      <a href={`https://x.com/${m.author}/status/${m.tweetId}`} target="_blank" rel="noreferrer" className="block truncate font-medium hover:underline">@{m.author}</a>
                      <div className="truncate text-xs text-muted">{m.text}</div>
                      <div className="mt-1 flex items-center gap-2 text-[10px] text-faint">mined {ago(m.minedAt)} · tracked {ago(m.lastTrackedAt)} {m.source === "simulated" && <Sim />}</div>
                    </td>
                    <td className="num px-3 py-3 text-right">{int(m.impressionsAtMine)}</td>
                    <td className="num px-3 py-3 text-right">
                      {int(m.latestImpressions)}
                      <div className="text-[11px] text-mint">+{pct(m)}</div>
                    </td>
                    <td className="px-3 py-3"><Sparkline points={m.series.map((s) => s.i)} /></td>
                    <td className="num px-3 py-3 text-right font-bold">{dec(m.xeetExtracted, 4)}</td>
                    <td className="num px-3 py-3 text-right text-muted">{dec(m.potentialXeet, 4)}</td>
                    <td className="num px-4 py-3 text-right text-loss">{m.xeetLost > 0 ? "−" : ""}{dec(m.xeetLost, 4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* mobile cards */}
        <div className="space-y-2 lg:hidden">
          {data?.mines.map((m) => (
            <article key={m.tweetId} className="rounded-3xl bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <a href={`https://x.com/${m.author}/status/${m.tweetId}`} target="_blank" rel="noreferrer" className="font-medium">@{m.author}</a>
                  <p className="truncate text-xs text-muted">{m.text}</p>
                </div>
                <Sparkline points={m.series.map((s) => s.i)} />
              </div>
              <dl className="mt-3 grid grid-cols-3 gap-y-3 text-xs">
                <Cell k="At mining" v={compact(m.impressionsAtMine)} />
                <Cell k="Now" v={`${compact(m.latestImpressions)}`} sub={`+${pct(m)}`} />
                <Cell k="Tracked" v={ago(m.lastTrackedAt)} />
                <Cell k="Extracted" v={dec(m.xeetExtracted, 4)} strong />
                <Cell k="Potential" v={dec(m.potentialXeet, 4)} />
                <Cell k="Lost" v={`${m.xeetLost > 0 ? "−" : ""}${dec(m.xeetLost, 4)}`} loss={m.xeetLost > 0} />
              </dl>
              {m.source === "simulated" && <div className="mt-3"><Sim /></div>}
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}

const pct = (m: Mine) =>
  `${(((m.latestImpressions - m.impressionsAtMine) / Math.max(1, m.impressionsAtMine)) * 100).toFixed(1)}%`;

function Cell({ k, v, sub, strong, loss }: { k: string; v: string; sub?: string; strong?: boolean; loss?: boolean }) {
  return (
    <div>
      <dt className="text-muted">{k}</dt>
      <dd className={`num mt-0.5 text-sm ${strong ? "font-bold" : ""} ${loss ? "text-loss" : ""}`}>{v}{sub && <span className="ml-1 text-[10px] text-mint">{sub}</span>}</dd>
    </div>
  );
}
