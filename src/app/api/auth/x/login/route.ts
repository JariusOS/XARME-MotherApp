import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { mode } from "@/lib/config";
import { getSession } from "@/lib/session";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  if (mode.xAuth === "simulated") {
    // SIMULATED login: no X app configured.
    return NextResponse.redirect(`${origin}/api/auth/x/callback?simulated=1`);
  }
  const verifier = randomBytes(32).toString("base64url");
  const state = randomBytes(16).toString("base64url");
  const s = await getSession();
  s.pkce = { verifier, state };
  await s.save();
  const p = new URLSearchParams({
    response_type: "code",
    client_id: process.env.X_CLIENT_ID!,
    redirect_uri: process.env.X_REDIRECT_URI || `${origin}/api/auth/x/callback`,
    scope: "tweet.read users.read",
    state,
    code_challenge: createHash("sha256").update(verifier).digest("base64url"),
    code_challenge_method: "S256",
  });
  return NextResponse.redirect(`https://x.com/i/oauth2/authorize?${p}`);
}
