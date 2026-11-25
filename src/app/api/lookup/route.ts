import { NextResponse } from "next/server";
import { RULES, gemaFor, xeetFor } from "@/lib/config";
import { db } from "@/lib/db";
import { fail } from "@/lib/http";
import { MineError } from "@/lib/mining";
import { XError, getPost, parseTweetId } from "@/lib/x";

export async function POST(req: Request) {
  try {
    const { url } = (await req.json()) as { url?: string };
    const id = parseTweetId(url ?? "");
    if (!id) throw new MineError("Paste a valid x.com post link.", "bad_url");
    const post = await getPost(id).catch((e) => {
      if (e instanceof XError) throw new MineError(e.message, "x_unavailable", e.status);
      throw e;
    });
    const { q } = await db();
    const [m] = await q<{ x_username: string }>(
      "select u.x_username from mines m join users u on u.id = m.user_id where m.tweet_id = $1",
      [id],
    );
    return NextResponse.json({
      post: {
        ...post, xeet: xeetFor(post.impressions), gema: gemaFor(post.likes),
        minedBy: m?.x_username ?? null, eligible: post.impressions >= RULES.minImpressions,
      },
    });
  } catch (e) {
    return fail(e);
  }
}
