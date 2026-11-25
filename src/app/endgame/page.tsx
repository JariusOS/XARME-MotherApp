"use client";
import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import Segmented from "@/components/Segmented";
import { dec, short } from "@/components/format";
import { Gema, Sim, Xeet } from "@/components/ui";

const END = Date.parse("2027-06-30T00:00:00Z");
type Row = { rank: number; userId: string; username: string; wallet: string | null; xeet: number; gema: number; simulated: boolean };
type Board = { by: "xeet" | "gema"; rows: Row[]; me: Row | null; myId: string | null };
const TILE = ["#0f172a", "#0f766e", "#7c2d12", "#312e81", "#14532d", "#4a044e", "#1e3a8a", "#713f12"];

export default function Endgame() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const [by, setBy] = useState<"xeet" | "gema">("xeet");
  const { data, isLoading } = useSWR<Board>(`/api/leaderboard?by=${by}`, { refreshInterval: 30_000 });
  const myRef = useRef<HTMLElement>(null);

  const ms = now === null ? null : Math.max(0, END - now);
  const parts = ms === null ? ["--", "--", "--", "--"] : [
    Math.floor(ms / 86_400_000), Math.floor((ms / 3_600_000) % 24), Math.floor((ms / 60_000) % 60), Math.floor((ms / 1000) % 60),
  ].map((v) => String(v).padStart(2, "0"));
  const meInTop = !!data?.me && data.rows.some((r) => r.userId === data.myId);
  const top = data?.rows[0];

  return (
    <div className="rise">
      <section className="text-center">
        <div className="font-display text-sm font-bold uppercase tracking-[0.35em] text-gold">Endgame</div>
        <div className="mt-4 flex items-start justify-center gap-1.5 sm:gap-3">
          {parts.map((p, i) => (
            <div key={i} className="flex items-start gap-1.5 sm:gap-3">
              <div className="min-w-[17vw] rounded-3xl bg-surface px-1.5 py-4 sm:min-w-[120px]">
                <div className="num text-[10.5vw] font-bold leading-none tracking-tighter sm:text-7xl">{p}</div>
                <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-muted">{["Days", "Hours", "Min", "Sec"][i]}</div>
              </div>
              {i < 3 && <div className="num pt-5 text-2xl text-faint sm:text-5xl">:</div>}
            </div>
          ))}
        </div>
        <p className="mt-4 text-[15px] text-muted">Snapshot: June 30, 2027 · 00:00 UTC</p>
      </section>

      <div className="mt-8">
        <Segmented<"xeet" | "gema"> value={by} onChange={setBy} options={[
          { id: "xeet", label: "Top 300 XEET", icon: <Xeet className="h-5 w-5" /> },
          { id: "gema", label: "Top 300 GEMA", icon: <Gema className="h-5 w-5" /> },
        ]} />
      </div>

      <h1 className="mt-8 text-center font-display text-[clamp(26px,7.5vw,40px)] font-bold leading-tight tracking-tight">
        #1 holds <span className="num text-brand">{top ? dec(by === "xeet" ? top.xeet : top.gema) : "—"}</span>{" "}
        <span className="text-brand">{by.toUpperCase()}</span>
      </h1>
      {data?.me ? (
        <button onClick={() => myRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
          className="mt-5 h-16 w-full rounded-full bg-brand font-display text-xl font-semibold text-white hover:bg-brand-2">
          You&apos;re #{data.me.rank}{!meInTop && " (outside top 300)"} · jump to you
        </button>
      ) : (
        <a href="/api/auth/x/login" className="mt-5 grid h-16 w-full place-items-center rounded-full bg-brand font-display text-xl font-semibold text-white hover:bg-brand-2">
          Sign in to see your rank
        </a>
      )}
      {data?.rows.some((r) => r.simulated) && <div className="mt-3 text-center"><Sim>INCLUDES SIMULATED USERS</Sim></div>}

      <section className="mt-8 space-y-3">
        {isLoading && [0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-3xl bg-surface" />)}
        {data?.rows.map((r) => (
          <RankCard key={r.userId} r={r} by={by} mine={r.userId === data.myId} refEl={r.userId === data.myId ? myRef : undefined} />
        ))}
        {data?.me && !meInTop && (
          <>
            <div className="py-1 text-center text-faint">···</div>
            <RankCard r={data.me} by={by} mine refEl={myRef} />
          </>
        )}
        {data && data.rows.length === 0 && <p className="py-10 text-center text-sm text-muted">No miners yet.</p>}
      </section>
    </div>
  );
}

function RankCard({ r, by, mine, refEl }: { r: Row; by: "xeet" | "gema"; mine: boolean; refEl?: React.Ref<HTMLElement> }) {
  const main = by === "xeet" ? r.xeet : r.gema;
  const other = by === "xeet" ? r.gema : r.xeet;
  return (
    <article ref={refEl} className={`flex items-center gap-4 rounded-3xl p-4 ${mine ? "bg-raised ring-2 ring-brand" : "bg-surface"}`}>
      <div className="grid h-14 w-14 flex-none place-items-center rounded-2xl font-display text-xl font-bold text-white"
        style={{ background: TILE[r.rank % TILE.length] }}>
        {r.username.slice(0, 1).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 flex-1 truncate font-display text-[17px] font-semibold">
            <span className={`mr-1.5 ${r.rank <= 3 ? "text-gold" : "text-brand"}`}>#{r.rank}</span>
            <a href={`https://x.com/${r.username}`} target="_blank" rel="noreferrer" className="hover:underline">@{r.username}</a>
            {mine && <span className="ml-2 rounded-full bg-brand px-2 py-0.5 align-middle text-[11px] font-bold text-white">YOU</span>}
          </h3>
          <span className="num flex-none font-display text-[17px] font-bold text-brand">{dec(main)}</span>
        </div>
        <div className="mt-1 flex flex-wrap gap-x-2 text-sm text-muted">
          <span className="num">{short(r.wallet, 4)}</span>
          <span>·</span>
          <span>{dec(other)} {by === "xeet" ? "GEMA" : "XEET"}</span>
        </div>
      </div>
    </article>
  );
}
