"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { dec, short } from "@/components/format";
import { Gema, Sim, Xeet } from "@/components/ui";

const END = Date.parse("2027-01-07T00:00:00Z");
type Row = { rank: number; userId: string; username: string; wallet: string | null; xeet: number; gema: number; simulated: boolean };
type Board = { by: "xeet" | "gema"; rows: Row[]; me: Row | null; myId: string | null };

function useNow() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  return now;
}

export default function Endgame() {
  const now = useNow();
  const [by, setBy] = useState<"xeet" | "gema">("xeet");
  const { data, isLoading } = useSWR<Board>(`/api/leaderboard?by=${by}`, { refreshInterval: 30_000 });
  const myRowRef = useRef<HTMLTableRowElement>(null);

  const ms = now === null ? null : Math.max(0, END - now);
  const parts = ms === null ? ["--", "--", "--", "--"] : [
    Math.floor(ms / 86_400_000), Math.floor((ms / 3_600_000) % 24), Math.floor((ms / 60_000) % 60), Math.floor((ms / 1000) % 60),
  ].map((v) => String(v).padStart(2, "0"));
  const meInTop = !!data?.me && data.rows.some((r) => r.userId === data.myId);
  const anySim = data?.rows.some((r) => r.simulated);

  return (
    <div className="rise">
      <section className="relative -mx-4 overflow-hidden px-4 pb-10 pt-6 text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(245,196,81,.12),transparent_70%)]" />
        <div className="relative text-xs font-bold uppercase tracking-[0.4em] text-gold">Endgame</div>
        <div className="relative mt-5 flex items-start justify-center gap-2 sm:gap-5">
          {parts.map((p, i) => (
            <div key={i} className="flex items-start gap-2 sm:gap-5">
              <div>
                <div className="num text-[15vw] font-bold leading-none tracking-tighter sm:text-8xl md:text-9xl">{p}</div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.3em] text-muted">{["Days", "Hours", "Min", "Sec"][i]}</div>
              </div>
              {i < 3 && <div className="num text-[9vw] leading-none text-faint sm:text-6xl md:text-7xl">:</div>}
            </div>
          ))}
        </div>
        <div className="relative mt-6 text-sm text-muted">January 7, 2027 · 00:00 UTC</div>
      </section>

      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-xl border border-line bg-surface p-1" role="tablist">
          {(["xeet", "gema"] as const).map((k) => (
            <button key={k} role="tab" aria-selected={by === k} onClick={() => setBy(k)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${by === k ? "bg-raised text-ink" : "text-muted"}`}>
              {k === "xeet" ? <Xeet className="h-4 w-4" /> : <Gema className="h-4 w-4" />}
              Top 300 {k.toUpperCase()}
            </button>
          ))}
        </div>
        {anySim && <Sim>INCLUDES SIMULATED USERS</Sim>}
      </div>

      {data?.me && (
        <button onClick={() => myRowRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
          className="mt-3 flex w-full items-center justify-between rounded-xl border border-brand/50 bg-brand/10 px-4 py-3 text-left text-sm">
          <span>Your position</span>
          <span className="num font-bold">#{data.me.rank}{!meInTop && <span className="ml-2 text-xs font-normal text-muted">outside top 300</span>}</span>
        </button>
      )}

      <div className="mt-3 overflow-hidden rounded-2xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="w-14 px-3 py-3 font-medium">#</th>
              <th className="px-3 py-3 font-medium">Miner</th>
              <th className="hidden px-3 py-3 font-medium sm:table-cell">Wallet</th>
              <th className={`px-3 py-3 text-right font-medium ${by === "xeet" ? "text-ink" : "hidden sm:table-cell"}`}>XEET</th>
              <th className={`px-3 py-3 text-right font-medium ${by === "gema" ? "text-ink" : "hidden sm:table-cell"}`}>GEMA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading && <tr><td colSpan={5} className="h-40 animate-pulse bg-surface" /></tr>}
            {data?.rows.map((r) => <LbRow key={r.userId} r={r} mine={r.userId === data.myId} by={by} refEl={r.userId === data.myId ? myRowRef : undefined} />)}
            {data?.me && !meInTop && (
              <>
                <tr><td colSpan={5} className="py-1 text-center text-xs text-faint">···</td></tr>
                <LbRow r={data.me} mine by={by} refEl={myRowRef} />
              </>
            )}
          </tbody>
        </table>
        {data && data.rows.length === 0 && <p className="p-8 text-center text-sm text-muted">No miners yet.</p>}
      </div>
    </div>
  );
}

function LbRow({ r, mine, by, refEl }: { r: Row; mine: boolean; by: "xeet" | "gema"; refEl?: React.Ref<HTMLTableRowElement> }) {
  const medal = r.rank <= 3 ? ["text-gold", "text-zinc-300", "text-amber-600"][r.rank - 1] : "text-muted";
  return (
    <tr ref={refEl} className={mine ? "bg-brand/15 outline outline-1 -outline-offset-1 outline-brand" : "hover:bg-surface/60"}>
      <td className={`num px-3 py-2.5 font-bold ${medal}`}>{r.rank}</td>
      <td className="px-3 py-2.5">
        <a href={`https://x.com/${r.username}`} target="_blank" rel="noreferrer" className="hover:underline">@{r.username}</a>
        {mine && <span className="ml-2 rounded bg-brand px-1.5 py-px text-[10px] font-bold">YOU</span>}
        <div className="num text-[11px] text-faint sm:hidden">{short(r.wallet)}</div>
      </td>
      <td className="num hidden px-3 py-2.5 text-muted sm:table-cell">{short(r.wallet, 6)}</td>
      <td className={`num px-3 py-2.5 text-right ${by === "xeet" ? "font-bold" : "hidden text-muted sm:table-cell"}`}>{dec(r.xeet)}</td>
      <td className={`num px-3 py-2.5 text-right ${by === "gema" ? "font-bold" : "hidden text-muted sm:table-cell"}`}>{dec(r.gema)}</td>
    </tr>
  );
}
