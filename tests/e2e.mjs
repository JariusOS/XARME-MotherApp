// End-to-end API check against a running server (simulated X mode).
import nacl from "tweetnacl";
import bs58 from "bs58";
const B = process.env.BASE || "http://localhost:3100";
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok -", m); };

function client() {
  let cookie = "";
  const req = async (path, opts = {}) => {
    const r = await fetch(B + path, { redirect: "manual", ...opts, headers: { cookie, "content-type": "application/json", ...(opts.headers || {}) } });
    const sc = r.headers.getSetCookie?.() ?? [];
    for (const c of sc) cookie = c.split(";")[0];
    const t = await r.text();
    let j; try { j = JSON.parse(t); } catch { j = t; }
    return { status: r.status, j };
  };
  return { req, post: (p, b) => req(p, { method: "POST", body: JSON.stringify(b ?? {}) }) };
}

let seq = 0;
async function login(c) {
  await c.req(`/api/auth/x/callback?simulated=1&as=t${process.pid}_${seq++}`);
  const kp = nacl.sign.keyPair();
  const { j } = await c.post("/api/wallet/nonce");
  const sig = nacl.sign.detached(new TextEncoder().encode(j.message), kp.secretKey);
  return c.post("/api/wallet/link", { publicKey: bs58.encode(kp.publicKey), signature: bs58.encode(sig) });
}

const a = client();
let r = await a.post("/api/mine", { tweetId: "1" });
assert(r.status === 401, "mining requires X login");
await a.req(`/api/auth/x/callback?simulated=1&as=a${process.pid}`);
const me0 = (await a.req("/api/me")).j.user;
assert(me0 && !me0.wallet, "logged in, no wallet yet");

const feed = (await a.req("/api/discover")).j.posts;
assert(feed.length >= 4 && feed.every((p) => p.impressions >= 1e6), `discover returns ${feed.length} eligible posts (>=1M)`);
r = await a.post("/api/mine", { tweetId: feed[0].id });
assert(r.status === 403 && r.j.code === "wallet_required", "mining requires linked wallet");

// bad signature rejected
const { j: n } = await a.post("/api/wallet/nonce");
const other = nacl.sign.keyPair();
r = await a.post("/api/wallet/link", { publicKey: bs58.encode(nacl.sign.keyPair().publicKey), signature: bs58.encode(nacl.sign.detached(new TextEncoder().encode(n.message), other.secretKey)) });
assert(r.status === 400, "forged wallet signature rejected");
r = await login(a);
assert(r.status === 200, "wallet linked with valid signature");

r = await a.post("/api/lookup", { url: `https://x.com/someone/status/${feed[0].id}` });
assert(r.j.post.eligible && r.j.post.xeet === Math.floor(r.j.post.impressions / 1e6 * 1e4) / 1e4, "lookup parses URL, XEET = impressions/1M");

r = await a.post("/api/mine", { tweetId: feed[0].id });
assert(r.status === 200 && r.j.minesToday === 1, `mined #1: +${r.j.xeet} XEET, +${r.j.gema} GEMA`);
assert(r.j.gema === Math.floor(r.j.post.likes / 1e4 * 1e4) / 1e4, "GEMA = likes/10k");
r = await a.post("/api/mine", { tweetId: feed[0].id });
assert(r.status === 409, "same post cannot be mined twice");

// a second user races user A for the same post
const b = client(); await login(b);
const [ra, rb] = await Promise.all([a.post("/api/mine", { tweetId: feed[1].id }), b.post("/api/mine", { tweetId: feed[1].id })]);
assert([ra.status, rb.status].sort().join() === "200,409", "concurrent race: exactly one winner");

// fill A to 3, then 4th blocked
const aCount = (await a.req("/api/me")).j.user.minesToday;
for (let i = aCount; i < 3; i++) await a.post("/api/mine", { tweetId: feed[2 + i].id });
r = await a.post("/api/mine", { tweetId: feed[6].id });
assert(r.status === 429 && r.j.code === "daily_limit", "4th mine of the day blocked");

// ineligible post (fresh snowflake => tiny reach)
const freshId = ((BigInt(Date.now() - 1288834974657) << 22n)).toString();
const c = client(); await login(c);
r = await c.post("/api/mine", { tweetId: freshId });
assert(r.status === 400 && r.j.code === "ineligible", "post under 1M impressions rejected");

const dash = (await a.req("/api/dashboard")).j;
assert(dash.mines.length === 3 && dash.totals.posts === 3, "dashboard lists 3 mines");
assert(dash.mines.every((m) => m.potentialXeet >= m.xeetExtracted && m.xeetLost >= 0), "potential/lost computed");

const lb = (await a.req("/api/leaderboard?by=xeet")).j;
assert(lb.rows.length === 300 && lb.me && lb.me.rank >= 1, `leaderboard top 300, you are #${lb.me.rank}`);
const lbg = (await a.req("/api/leaderboard?by=gema")).j;
assert(lbg.rows[0].gema >= lbg.rows[1].gema, "GEMA board sorted");

r = await a.req("/api/cron/snapshot");
assert(r.status === 401, "cron requires secret");
r = await a.req("/api/cron/snapshot", { headers: { authorization: "Bearer c" } });
assert(r.status === 200, `cron ok (updated ${r.j.updated}, none due within 6h)`);
console.log("\nALL PASSED");
