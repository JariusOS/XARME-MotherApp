import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Live activity line: real counts from the database. */
export async function GET() {
  const { q } = await db();
  const day = "date_trunc('day', now() at time zone 'utc') at time zone 'utc'";
  const [r] = await q<{ miners_today: number; mines_today: number; miners_total: number; mines_total: number }>(
    `select
       (select count(distinct user_id)::int from mines where mined_at >= ${day}) as miners_today,
       (select count(*)::int from mines where mined_at >= ${day}) as mines_today,
       (select count(*)::int from users where not simulated) as miners_total,
       (select count(*)::int from mines) as mines_total`,
  );
  return NextResponse.json(r);
}
