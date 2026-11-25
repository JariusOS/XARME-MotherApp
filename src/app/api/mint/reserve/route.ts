import { NextResponse } from "next/server";
import { currentUser, fail, unauthorized } from "@/lib/http";
import { reserve } from "@/lib/mint";
import { getSession } from "@/lib/session";

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const s = await getSession();
  const nonce = s.walletNonce;
  if (!nonce) return NextResponse.json({ error: "Request a fresh signature first." }, { status: 400 });
  s.walletNonce = undefined; // single use
  await s.save();
  try {
    const { signature } = (await req.json()) as { signature?: string };
    return NextResponse.json(await reserve(u.id, u.x_username, nonce, signature ?? ""));
  } catch (e) {
    return fail(e);
  }
}
