import "server-only";
import { RULES, gemaFor, xeetFor } from "./config";
import { db } from "./db";
import { MineError } from "./mining-error";
import { loadout } from "./powerups";
import { XError, getPost, getPosts, type PostMetrics } from "./x";

export { MineError };

/** Mines in the user's rolling window (24h by default; shortened by the Cooldown powerup). */
const IN_WINDOW = "mined_at > now() - make_interval(hours => $2)";

export async function mineQuota(userId: string) {
  const { q } = await db();
  const lo = await loadout(q, userId);
  const [r] = await q<{ n: number; oldest: string | null }>(
    `select count(*)::int as n, min(mined_at) as oldest from mines where user_id = $1 and ${IN_WINDOW}`,
    [userId, lo.windowHours],
  );
  // next slot frees up when the oldest mine in the window ages out
  const nextFreeAt = r.n >= lo.slots && r.oldest ? new Date(new Date(r.oldest).getTime() + lo.windowHours * 3600_000).toISOString() : null;
  return { used: r.n, ...lo, nextFreeAt };
}

/**
 * Mine a post. Metrics come from the X provider (verified when X_BEARER_TOKEN is set);
 * rewards are computed server-side from those numbers only.
 * Concurrency: the user row is locked (daily limit), and tweet_id is the primary key of
 * `mines` (first-come-first-served, exactly once).
 */
export async function minePost(userId: string, tweetId: string) {
  let post: PostMetrics;
  try {
    post = await getPost(tweetId);
  } catch (e) {
    if (e instanceof XError) throw new MineError(e.message, "x_unavailable", e.status);
    throw e;
  }
  if (post.impressions < RULES.minImpressions) {
    throw new MineError(
      `Not eligible: ${post.impressions.toLocaleString("en-US")} impressions (needs 1,000,000).`,
      "ineligible",
    );
  }
  const baseXeet = xeetFor(post.impressions);
  const gema = gemaFor(post.likes);

  const { tx } = await db();
  return tx(async (q) => {
    const [user] = await q<{ wallet: string | null }>(
      "select wallet from users where id = $1 for update",
      [userId],
    );
    if (!user) throw new MineError("Account not found.", "auth", 401);
    if (!user.wallet) throw new MineError("Connect your Solana wallet to mine.", "wallet_required", 403);

    const lo = await loadout(q, userId);
    const [{ n }] = await q<{ n: number }>(
      `select count(*)::int as n from mines where user_id = $1 and ${IN_WINDOW}`,
      [userId, lo.windowHours],
    );
    if (n >= lo.slots) {
      throw new MineError(`All ${lo.slots} slots used. A slot frees up within ${lo.windowHours}h.`, "daily_limit", 429);
    }
    const boost = lo.multiplier;
    const xeet = Math.floor(baseXeet * boost * 1e4) / 1e4;
    if (boost > 1) await q("update powerups set boost_left = boost_left - 1 where user_id = $1", [userId]);

    const inserted = await q(
      `insert into mines (tweet_id, user_id, author_username, author_name, author_avatar, text,
         posted_at, impressions_at_mine, likes_at_mine, xeet_extracted, gema_extracted,
         latest_impressions, latest_likes, data_source, boost)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$8,$9,$12,$13)
       on conflict (tweet_id) do nothing returning tweet_id`,
      [post.id, userId, post.authorUsername, post.authorName, post.authorAvatar, post.text,
        post.postedAt, post.impressions, post.likes, xeet, gema, post.source, boost],
    );
    if (inserted.length === 0) {
      throw new MineError("Already mined. Each post can only be mined once.", "already_mined", 409);
    }

    await q("update users set xeet = xeet + $2, gema = gema + $3 where id = $1", [userId, xeet, gema]);
    await q(
      `insert into ledger (user_id, currency, amount, reason, ref) values
       ($1,'XEET',$2,'mine',$4), ($1,'GEMA',$3,'mine',$4)`,
      [userId, xeet, gema, post.id],
    );
    await q("insert into snapshots (tweet_id, impressions, likes) values ($1,$2,$3)", [
      post.id, post.impressions, post.likes,
    ]);
    return { post, xeet, gema, boost, minesToday: n + 1, slots: lo.slots };
  });
}

/** Re-read metrics for mined posts not tracked in the last 6h. Called by cron. */
export async function snapshotDue(limit = 500) {
  const { q } = await db();
  const due = await q<{ tweet_id: string }>(
    `select tweet_id from mines where last_snapshot_at < now() - interval '${RULES.snapshotHours - 0.25} hours'
     order by last_snapshot_at asc limit $1`,
    [limit],
  );
  if (due.length === 0) return { updated: 0 };
  const posts = await getPosts(due.map((d) => d.tweet_id));
  for (const p of posts) {
    await q(
      "update mines set latest_impressions = $2, latest_likes = $3, last_snapshot_at = now() where tweet_id = $1",
      [p.id, p.impressions, p.likes],
    );
    await q("insert into snapshots (tweet_id, impressions, likes) values ($1,$2,$3)", [
      p.id, p.impressions, p.likes,
    ]);
  }
  return { updated: posts.length };
}
