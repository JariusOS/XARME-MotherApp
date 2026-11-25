import bs58 from "bs58";
import type { Q } from "./db";

const HANDLES = [
  "viral_sniper", "attention_whale", "solhunter", "gm_miner", "xeet_maxi", "impressionist",
  "degen_scout", "ct_oracle", "early_eagle", "post_alchemist", "timeline_raider", "onchain_owl",
];

/** SIMULATED: 320 leaderboard users so ENDGAME isn't empty before launch. Flagged simulated=true. */
export async function seed(q: Q) {
  const [{ n }] = await q<{ n: number }>("select count(*)::int as n from users where simulated");
  if (n > 0) return;
  let s = 7;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 320; i++) {
    const handle = `${HANDLES[i % HANDLES.length]}${i >= HANDLES.length ? i : ""}`;
    const wallet = bs58.encode(Uint8Array.from({ length: 32 }, () => Math.floor(rnd() * 256)));
    const xeet = Math.round(Math.pow(rnd(), 3) * 900 * 100) / 100;
    const gema = Math.round(Math.pow(rnd(), 3) * 4200 * 100) / 100;
    await q(
      `insert into users (x_user_id, x_username, x_name, wallet, xeet, gema, simulated)
       values ($1,$2,$3,$4,$5,$6,true) on conflict do nothing`,
      [`sim-${i}`, handle, handle, wallet, xeet, gema],
    );
  }
}
