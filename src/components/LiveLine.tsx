"use client";
import Link from "next/link";
import useSWR from "swr";

type Stats = { miners_today: number; mines_today: number; miners_total: number; mines_total: number };

export default function LiveLine() {
  const { data } = useSWR<Stats>("/api/stats", { refreshInterval: 20_000 });
  return (
    <p className="text-center text-[15px] text-muted">
      <span className="inline-flex items-center gap-2 font-semibold text-mint">
        <span className="live-dot h-2.5 w-2.5 rounded-full bg-mint" />
        {data?.miners_today ?? "–"} mining today
      </span>
      {" · "}{data?.mines_today ?? "–"} posts mined today{" · "}
      <Link href="/endgame" className="text-ink">ENDGAME →</Link>
    </p>
  );
}
