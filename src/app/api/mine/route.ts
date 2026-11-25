import { NextResponse } from "next/server";
import { currentUser, fail, unauthorized } from "@/lib/http";
import { MineError, minePost } from "@/lib/mining";
import { parseTweetId } from "@/lib/x";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  try {
    const { tweetId } = (await req.json()) as { tweetId?: string };
    const id = parseTweetId(tweetId ?? "");
    if (!id) throw new MineError("Invalid post id.", "bad_url");
    return NextResponse.json(await minePost(u.id, id));
  } catch (e) {
    return fail(e);
  }
}
