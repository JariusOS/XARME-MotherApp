import { NextResponse } from "next/server";
import { RULES, mode } from "@/lib/config";

export function GET() {
  return NextResponse.json({ mode, rules: RULES });
}
