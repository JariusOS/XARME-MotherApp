import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { currentUser, unauthorized } from "@/lib/http";
import { getSession } from "@/lib/session";

export async function POST() {
  const u = await currentUser();
  if (!u) return unauthorized();
  const s = await getSession();
  s.walletNonce = randomBytes(16).toString("hex");
  await s.save();
  return NextResponse.json({
    message: `Xarme Collective: link this wallet to @${u.x_username}\nNonce: ${s.walletNonce}`,
  });
}
