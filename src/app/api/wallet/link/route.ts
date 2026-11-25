import bs58 from "bs58";
import { NextResponse } from "next/server";
import nacl from "tweetnacl";
import { db } from "@/lib/db";
import { currentUser, unauthorized } from "@/lib/http";
import { getSession } from "@/lib/session";

/** Production: verifies an ed25519 signature from the wallet over a session-bound nonce. */
export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  const s = await getSession();
  const { publicKey, signature } = (await req.json()) as { publicKey?: string; signature?: string };
  if (!s.walletNonce || !publicKey || !signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }
  const message = `Xarme Collective: link this wallet to @${u.x_username}\nNonce: ${s.walletNonce}`;
  let ok = false;
  try {
    ok = nacl.sign.detached.verify(new TextEncoder().encode(message), bs58.decode(signature), bs58.decode(publicKey));
  } catch {
    ok = false;
  }
  if (!ok) return NextResponse.json({ error: "Signature check failed." }, { status: 400 });
  s.walletNonce = undefined;
  await s.save();
  const { q } = await db();
  const [taken] = await q("select 1 from users where wallet = $1 and id <> $2", [publicKey, u.id]);
  if (taken) return NextResponse.json({ error: "Wallet already linked to another account." }, { status: 409 });
  await q("update users set wallet = $2 where id = $1", [u.id, publicKey]);
  return NextResponse.json({ wallet: publicKey });
}
