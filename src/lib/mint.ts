import "server-only";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { MINT } from "./config";
import { db } from "./db";
import { MineError } from "./mining";

export const reserveMessage = (username: string, wallet: string, nonce: string) =>
  `Reserve 1 ${MINT.name} spot on Xarme Collective.\nSpends ${MINT.reserveCost} XEET from @${username}.\nWallet: ${wallet}\nNonce: ${nonce}`;

export async function mintStatus(userId: string | null) {
  const { q } = await db();
  const [{ reserved }] = await q<{ reserved: number }>("select count(*)::int as reserved from mint_reservations");
  if (!userId) return { reserved, me: null };
  const [me] = await q<{ xeet: string; wallet: string | null; rank: number | null; reserved_at: string | null }>(
    `select u.xeet, u.wallet,
       (select r.rank from (select id, rank() over (order by xeet desc, created_at asc)::int as rank from users where xeet > 0) r where r.id = u.id) as rank,
       m.created_at as reserved_at
     from users u left join mint_reservations m on m.user_id = u.id where u.id = $1`,
    [userId],
  );
  const xeet = Number(me.xeet);
  const projectedGtd = me.rank !== null && me.rank <= MINT.gtd;
  const reservedSpot = !!me.reserved_at;
  const canReserve = !reservedSpot && reserved < MINT.reserve && xeet >= MINT.reserveCost && !!me.wallet;
  return {
    reserved,
    me: {
      xeet, wallet: me.wallet, rank: me.rank, projectedGtd, reservedSpot, reservedAt: me.reserved_at,
      canReserve,
      eligible: projectedGtd || reservedSpot,
      xeetNeeded: Math.max(0, MINT.reserveCost - xeet),
    },
  };
}

/**
 * FCFS reservation. Signature proves the linked wallet consents; the table lock serialises
 * the 250-spot cap so concurrent requests can't oversell.
 */
export async function reserve(userId: string, username: string, nonce: string, signature: string) {
  const { tx } = await db();
  return tx(async (q) => {
    const [u] = await q<{ wallet: string | null; xeet: string }>("select wallet, xeet from users where id = $1 for update", [userId]);
    if (!u?.wallet) throw new MineError("Link a Solana wallet first.", "wallet_required", 403);
    const message = reserveMessage(username, u.wallet, nonce);
    let ok = false;
    try {
      ok = nacl.sign.detached.verify(new TextEncoder().encode(message), bs58.decode(signature), bs58.decode(u.wallet));
    } catch { ok = false; }
    if (!ok) throw new MineError("Signature doesn't match your linked wallet.", "bad_signature");

    await q("lock table mint_reservations in share row exclusive mode");
    const [mine] = await q("select 1 from mint_reservations where user_id = $1", [userId]);
    if (mine) throw new MineError("You already hold a reservation.", "already_reserved", 409);
    const [{ n }] = await q<{ n: number }>("select count(*)::int as n from mint_reservations");
    if (n >= MINT.reserve) throw new MineError("All 250 reserve spots are taken.", "sold_out", 409);
    if (Number(u.xeet) < MINT.reserveCost) throw new MineError(`You need ${MINT.reserveCost} XEET to reserve.`, "insufficient", 402);

    const ins = await q(
      `insert into mint_reservations (user_id, wallet, xeet_spent, message, signature)
       values ($1,$2,$3,$4,$5) on conflict do nothing returning user_id`,
      [userId, u.wallet, MINT.reserveCost, message, signature],
    );
    if (!ins.length) throw new MineError("You already hold a reservation.", "already_reserved", 409);
    await q("update users set xeet = xeet - $2 where id = $1", [userId, MINT.reserveCost]);
    await q("insert into ledger (user_id, currency, amount, reason, ref) values ($1,'XEET',$2,'signs_reserve',$3)", [
      userId, -MINT.reserveCost, u.wallet,
    ]);
    return { spot: n + 1 };
  });
}
