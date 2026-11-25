import { NextResponse } from "next/server";
import { gemaFor, xeetFor } from "@/lib/config";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { discover } from "@/lib/x";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const posts = await discover();
    const { q } = await db();
    const mined = posts.length
      ? await q<{ tweet_id: string; x_username: string }>(
          `select m.tweet_id, u.x_username from mines m join users u on u.id = m.user_id
           where m.tweet_id = any($1)`,
          [posts.map((p) => p.id)],
        )
      : [];
    const by = new Map(mined.map((m) => [m.tweet_id, m.x_username]));
    return NextResponse.json({
      posts: posts.map((p) => ({
        ...p, xeet: xeetFor(p.impressions), gema: gemaFor(p.likes), minedBy: by.get(p.id) ?? null,
      })),
    });
  } catch (e) {
    return fail(e);
  }
}
