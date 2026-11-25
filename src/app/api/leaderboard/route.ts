import { NextResponse } from "next/server";
import { RULES } from "@/lib/config";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/http";

export const dynamic = "force-dynamic";

type Row = { rank: number; id: string; x_username: string; wallet: string | null; xeet: string; gema: string; simulated: boolean };

export async function GET(req: Request) {
  const by = new URL(req.url).searchParams.get("by") === "gema" ? "gema" : "xeet";
  const { q } = await db();
  const ranked = `select id, x_username, wallet, xeet, gema, simulated,
      rank() over (order by ${by} desc, created_at asc)::int as rank from users where ${by} > 0`;
  const top = await q<Row>(`${ranked} order by ${by} desc, created_at asc limit $1`, [RULES.leaderboardSize]);
  const u = await currentUser();
  let me: Row | null = null;
  if (u) [me] = await q<Row>(`select * from (${ranked}) r where id = $1`, [u.id]);
  const shape = (r: Row) => ({
    rank: r.rank, userId: r.id, username: r.x_username, wallet: r.wallet,
    xeet: Number(r.xeet), gema: Number(r.gema), simulated: r.simulated,
  });
  return NextResponse.json({ by, rows: top.map(shape), me: me ? shape(me) : null, myId: u?.id ?? null });
}
