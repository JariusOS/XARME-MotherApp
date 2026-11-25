import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/http";
import { reserveMessage } from "@/lib/mint";
import { getSession } from "@/lib/session";

export async function POST() {
  const u = await currentUser();
  if (!u) return unauthorized();
  if (!u.wallet) return NextResponse.json({ error: "Link a Solana wallet first." }, { status: 403 });
  const s = await getSession();
  s.walletNonce = randomBytes(16).toString("hex");
  await s.save();
  return NextResponse.json({ message: reserveMessage(u.x_username, u.wallet, s.walletNonce) });
}
