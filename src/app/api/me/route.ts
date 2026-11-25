import { NextResponse } from "next/server";
import { RULES } from "@/lib/config";
import { currentUser } from "@/lib/http";
import { minesToday } from "@/lib/mining";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  if (!u) return NextResponse.json({ user: null });
  return NextResponse.json({
    user: {
      id: u.id, username: u.x_username, name: u.x_name, avatar: u.x_avatar, wallet: u.wallet,
      xeet: Number(u.xeet), gema: Number(u.gema), simulated: u.simulated,
      minesToday: await minesToday(u.id), dailyMines: RULES.dailyMines,
    },
  });
}
