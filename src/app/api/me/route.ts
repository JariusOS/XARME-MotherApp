import { NextResponse } from "next/server";
import { currentUser } from "@/lib/http";
import { mineQuota } from "@/lib/mining";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: u.id, username: u.x_username, name: u.x_name, avatar: u.x_avatar, wallet: u.wallet,
      xeet: Number(u.xeet), gema: Number(u.gema), simulated: u.simulated,
      ...(await (async () => { const qa = await mineQuota(u.id); return { minesToday: qa.used, dailyMines: qa.slots, windowHours: qa.windowHours, nextFreeAt: qa.nextFreeAt, boostLeft: qa.boostLeft, multiplier: qa.multiplier, slotLevel: qa.slotLevel, cooldownLevel: qa.cooldownLevel }; })()),
    },
  });
}
