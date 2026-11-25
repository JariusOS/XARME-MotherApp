import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, fail, unauthorized } from "@/lib/http";
import { POWERUPS, buyPowerup, loadout, type PowerupKind } from "@/lib/powerups";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  const { q } = await db();
  return NextResponse.json({ catalog: POWERUPS, loadout: u ? await loadout(q, u.id) : null, gema: u ? Number(u.gema) : null });
}

export async function POST(req: Request) {
  const u = await currentUser();
  if (!u) return unauthorized();
  try {
    const { kind } = (await req.json()) as { kind?: string };
    if (kind !== "slots" && kind !== "cooldown" && kind !== "boost") {
      return NextResponse.json({ error: "Unknown powerup." }, { status: 400 });
    }
    return NextResponse.json(await buyPowerup(u.id, kind as PowerupKind));
  } catch (e) {
    return fail(e);
  }
}
