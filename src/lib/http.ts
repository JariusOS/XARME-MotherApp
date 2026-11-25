import "server-only";
import { NextResponse } from "next/server";
import { db } from "./db";
import { MineError } from "./mining";
import { getSession } from "./session";

export type DbUser = {
  id: string;
  x_user_id: string;
  x_username: string;
  x_name: string | null;
  x_avatar: string | null;
  wallet: string | null;
  xeet: string;
  gema: string;
  simulated: boolean;
};

export async function currentUser(): Promise<DbUser | null> {
  const s = await getSession();
  if (!s.userId) return null;
  const { q } = await db();
  const [u] = await q<DbUser>("select * from users where id = $1", [s.userId]);
  return u ?? null;
}

export function fail(e: unknown) {
  if (e instanceof MineError) {
    return NextResponse.json({ error: e.message, code: e.code }, { status: e.status });
  }
  console.error(e);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export const unauthorized = () =>
  NextResponse.json({ error: "Connect X first.", code: "auth" }, { status: 401 });
