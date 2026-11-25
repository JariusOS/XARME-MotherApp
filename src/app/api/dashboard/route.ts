import { NextResponse } from "next/server";
import { xeetFor } from "@/lib/config";
import { db } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/http";

export const dynamic = "force-dynamic";

type Row = {
  tweet_id: string; author_username: string; author_name: string; text: string; posted_at: string;
  impressions_at_mine: string; likes_at_mine: string; xeet_extracted: string; gema_extracted: string;
  latest_impressions: string; latest_likes: string; last_snapshot_at: string; mined_at: string;
  data_source: string; series: { i: number; t: string }[];
};

export async function GET() {
  const u = await currentUser();
  if (!u) return unauthorized();
  const { q } = await db();
  const rows = await q<Row>(
    `select m.*, coalesce((select json_agg(json_build_object('i', s.impressions, 't', s.taken_at) order by s.taken_at)
       from snapshots s where s.tweet_id = m.tweet_id), '[]') as series
     from mines m where m.user_id = $1 order by m.mined_at desc`,
    [u.id],
  );
  const mines = rows.map((r) => {
    const extracted = Number(r.xeet_extracted);
    const potential = xeetFor(Number(r.latest_impressions));
    return {
      tweetId: r.tweet_id, author: r.author_username, authorName: r.author_name, text: r.text,
      postedAt: r.posted_at, minedAt: r.mined_at, lastTrackedAt: r.last_snapshot_at,
      impressionsAtMine: Number(r.impressions_at_mine), latestImpressions: Number(r.latest_impressions),
      xeetExtracted: extracted, gemaExtracted: Number(r.gema_extracted),
      potentialXeet: potential, xeetLost: Math.max(0, Math.round((potential - extracted) * 1e4) / 1e4),
      source: r.data_source,
      series: (typeof r.series === "string" ? JSON.parse(r.series) : r.series).map((p: { i: number; t: string }) => ({ i: Number(p.i), t: p.t })),
    };
  });
  const sum = (k: "xeetExtracted" | "xeetLost" | "gemaExtracted") =>
    Math.round(mines.reduce((a, m) => a + m[k], 0) * 1e4) / 1e4;
  return NextResponse.json({
    totals: { xeet: Number(u.xeet), gema: Number(u.gema), posts: mines.length, xeetLost: sum("xeetLost") },
    mines,
  });
}
