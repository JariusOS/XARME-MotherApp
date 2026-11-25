import { NextResponse } from "next/server";
import { mode } from "@/lib/config";
import { db } from "@/lib/db";
import { getSession } from "@/lib/session";

type XMe = { id: string; username: string; name: string; profile_image_url?: string };

export async function GET(req: Request) {
  const url = new URL(req.url);
  const s = await getSession();
  let me: XMe;

  if (mode.xAuth === "simulated") {
    // SIMULATED: ?as=<handle> lets you create several demo accounts for testing.
    const as = (url.searchParams.get("as") || "you_demo").replace(/[^A-Za-z0-9_]/g, "").slice(0, 15) || "you_demo";
    me = { id: `sim-user-${as}`, username: as, name: `${as} (demo)` };
  } else {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    if (!code || !s.pkce || state !== s.pkce.state) {
      return NextResponse.redirect(`${url.origin}/?error=x_auth_state`);
    }
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.X_REDIRECT_URI || `${url.origin}/api/auth/x/callback`,
      code_verifier: s.pkce.verifier,
      client_id: process.env.X_CLIENT_ID!,
    });
    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };
    if (process.env.X_CLIENT_SECRET) {
      headers.Authorization =
        "Basic " + Buffer.from(`${process.env.X_CLIENT_ID}:${process.env.X_CLIENT_SECRET}`).toString("base64");
    }
    const tok = await fetch("https://api.x.com/2/oauth2/token", { method: "POST", headers, body });
    if (!tok.ok) return NextResponse.redirect(`${url.origin}/?error=x_token`);
    const { access_token } = (await tok.json()) as { access_token: string };
    const r = await fetch("https://api.x.com/2/users/me?user.fields=profile_image_url", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!r.ok) return NextResponse.redirect(`${url.origin}/?error=x_profile`);
    me = ((await r.json()) as { data: XMe }).data;
  }

  const { q } = await db();
  const [u] = await q<{ id: string }>(
    `insert into users (x_user_id, x_username, x_name, x_avatar, simulated)
     values ($1,$2,$3,$4,$5)
     on conflict (x_user_id) do update set x_username = excluded.x_username,
       x_name = excluded.x_name, x_avatar = excluded.x_avatar
     returning id`,
    [me.id, me.username, me.name, me.profile_image_url ?? null, mode.xAuth === "simulated"],
  );
  s.userId = u.id;
  s.pkce = undefined;
  await s.save();
  return NextResponse.redirect(`${url.origin}/`);
}
