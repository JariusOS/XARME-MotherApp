"use client";
import useSWR from "swr";

export type Me = {
  id: string; username: string; name: string | null; avatar: string | null; wallet: string | null;
  xeet: number; gema: number; simulated: boolean; minesToday: number; dailyMines: number;
  windowHours: number; nextFreeAt: string | null; boostLeft: number; multiplier: number; slotLevel: number; cooldownLevel: number;
};
export type Status = {
  mode: { xAuth: "real" | "simulated"; xData: "real" | "simulated"; database: "postgres" | "embedded" | "ephemeral" };
};

export const useMe = () => useSWR<{ user: Me | null }>("/api/me");
export const useStatus = () => useSWR<Status>("/api/status");

export async function post<T>(url: string, body?: unknown): Promise<T> {
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw Object.assign(new Error(j.error ?? "Request failed"), { code: j.code });
  return j;
}
