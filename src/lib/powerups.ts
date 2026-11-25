import "server-only";
import { RULES } from "./config";
import { db, type Q } from "./db";
import { MineError } from "./mining-error";

/**
 * Mine Powerups: GEMA sinks. Prices/values are PLACEHOLDERS to tune.
 * - slots:    permanent +1 mining slot per level (3 -> 6)
 * - cooldown: permanent, shortens the rolling mining window (24h -> 12h)
 * - boost:    consumable, 1.25x XEET on the next 3 mines
 */
export const POWERUPS = {
  slots: { name: "Extra slot", unit: "slots", base: RULES.dailyMines, step: 1, max: 3, cost: [50, 150, 400] },
  cooldown: { name: "Cooldown cut", unit: "h window", windows: [24, 20, 16, 12], max: 3, cost: [40, 120, 300] },
  boost: { name: "XEET boost", multiplier: 1.25, mines: 3, cost: 60 },
} as const;
export type PowerupKind = keyof typeof POWERUPS;

export type Loadout = { slots: number; windowHours: number; slotLevel: number; cooldownLevel: number; boostLeft: number; multiplier: number };

export async function loadout(q: Q, userId: string): Promise<Loadout> {
  const [r] = await q<{ slot_level: number; cooldown_level: number; boost_left: number }>(
    "select slot_level, cooldown_level, boost_left from powerups where user_id = $1", [userId]);
  const slotLevel = r?.slot_level ?? 0, cooldownLevel = r?.cooldown_level ?? 0, boostLeft = r?.boost_left ?? 0;
  return {
    slots: POWERUPS.slots.base + slotLevel,
    windowHours: POWERUPS.cooldown.windows[cooldownLevel],
    slotLevel, cooldownLevel, boostLeft,
    multiplier: boostLeft > 0 ? POWERUPS.boost.multiplier : 1,
  };
}

export async function buyPowerup(userId: string, kind: PowerupKind) {
  const { tx } = await db();
  return tx(async (q) => {
    const [u] = await q<{ gema: string }>("select gema from users where id = $1 for update", [userId]);
    if (!u) throw new MineError("Account not found.", "auth", 401);
    await q("insert into powerups (user_id) values ($1) on conflict do nothing", [userId]);
    const lo = await loadout(q, userId);
    let cost: number;
    if (kind === "slots") {
      if (lo.slotLevel >= POWERUPS.slots.max) throw new MineError("Max slots reached.", "maxed", 409);
      cost = POWERUPS.slots.cost[lo.slotLevel];
    } else if (kind === "cooldown") {
      if (lo.cooldownLevel >= POWERUPS.cooldown.max) throw new MineError("Shortest cooldown reached.", "maxed", 409);
      cost = POWERUPS.cooldown.cost[lo.cooldownLevel];
    } else {
      if (lo.boostLeft > 0) throw new MineError("A boost is already active.", "active", 409);
      cost = POWERUPS.boost.cost;
    }
    if (Number(u.gema) < cost) throw new MineError(`Needs ${cost} GEMA.`, "insufficient", 402);
    await q("update users set gema = gema - $2 where id = $1", [userId, cost]);
    await q("insert into ledger (user_id, currency, amount, reason, ref) values ($1,'GEMA',$2,'powerup',$3)", [userId, -cost, kind]);
    if (kind === "slots") await q("update powerups set slot_level = slot_level + 1 where user_id = $1", [userId]);
    else if (kind === "cooldown") await q("update powerups set cooldown_level = cooldown_level + 1 where user_id = $1", [userId]);
    else await q("update powerups set boost_left = $2 where user_id = $1", [userId, POWERUPS.boost.mines]);
    return { spent: cost, loadout: await loadout(q, userId) };
  });
}
