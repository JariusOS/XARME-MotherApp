import { NextResponse } from "next/server";
import { MINT } from "@/lib/config";
import { currentUser } from "@/lib/http";
import { mintStatus } from "@/lib/mint";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await currentUser();
  return NextResponse.json({ collection: MINT, ...(await mintStatus(u?.id ?? null)), onchain: false });
}
