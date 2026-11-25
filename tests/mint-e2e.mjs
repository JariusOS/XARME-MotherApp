// SIGNS reservation e2e. Phases: create users via API -> (server stopped) adjust DB -> verify rules via API.
import nacl from "tweetnacl";
import bs58 from "bs58";
import { readFileSync, writeFileSync } from "node:fs";
const B = "http://localhost:3100";
const phase = process.argv[2];
const assert = (c, m) => { if (!c) { console.error("FAIL:", m); process.exit(1); } console.log("ok -", m); };

function client(cookie = "") {
  const req = async (path, opts = {}) => {
    const r = await fetch(B + path, { redirect: "manual", ...opts, headers: { cookie, "content-type": "application/json" } });
    for (const c of r.headers.getSetCookie?.() ?? []) cookie = c.split(";")[0];
    const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = t; }
    return { status: r.status, j };
  };
  return { req, post: (p, b) => req(p, { method: "POST", body: JSON.stringify(b ?? {}) }), cookie: () => cookie };
}
async function makeUser(name) {
  const c = client(); const kp = nacl.sign.keyPair();
  await c.req(`/api/auth/x/callback?simulated=1&as=${name}`);
  const { j } = await c.post("/api/wallet/nonce");
  await c.post("/api/wallet/link", { publicKey: bs58.encode(kp.publicKey), signature: bs58.encode(nacl.sign.detached(new TextEncoder().encode(j.message), kp.secretKey)) });
  return { name, cookie: c.cookie(), sk: bs58.encode(kp.secretKey) };
}
const sign = (msg, sk) => bs58.encode(nacl.sign.detached(new TextEncoder().encode(msg), bs58.decode(sk)));

if (phase === "create") {
  const users = {};
  for (const n of ["rich", "poor", "racer1", "racer2"]) users[n] = await makeUser(`m${n}`);
  writeFileSync("/tmp/claude-0/mint-users.json", JSON.stringify(users));
  console.log("created users");
} else if (phase === "db") {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(process.cwd() + "/.data/pglite");
  await pg.query("update users set xeet = 1500 where x_username in ('mrich','mracer1','mracer2')");
  await pg.query("update users set xeet = 999 where x_username = 'mpoor'");
  // pre-fill 248 of 250 spots with seeded (simulated) users
  await pg.query(`insert into mint_reservations (user_id, wallet, xeet_spent, message, signature)
    select id, wallet, 1000, 'seed', 'seed' from users where simulated order by created_at limit 247`);
  console.log("db prepared");
  await pg.close();
} else {
  const U = JSON.parse(readFileSync("/tmp/claude-0/mint-users.json"));
  const rich = client(U.rich.cookie), poor = client(U.poor.cookie);
  let r = await client().req("/api/mint");
  assert(r.j.collection.total === 303 && r.j.collection.gtd + r.j.collection.reserve + r.j.collection.creator === 303, "supply 33 + 250 + 20 = 303");
  assert(r.j.reserved === 247 && r.j.me === null, "247 reserved; signed-out has no status");

  r = await poor.req("/api/mint");
  assert(!r.j.me.canReserve && r.j.me.xeetNeeded === 1, "999 XEET: cannot reserve, needs 1 more");
  let n = (await poor.post("/api/mint/nonce")).j.message;
  r = await poor.post("/api/mint/reserve", { signature: sign(n, U.poor.sk) });
  assert(r.status === 402, "insufficient XEET rejected");

  n = (await rich.post("/api/mint/nonce")).j.message;
  r = await rich.post("/api/mint/reserve", { signature: sign(n, U.poor.sk) });
  assert(r.status === 400 && r.j.code === "bad_signature", "signature from a different wallet rejected");
  r = await rich.post("/api/mint/reserve", { signature: sign(n, U.rich.sk) });
  assert(r.status === 400, "nonce is single-use");
  n = (await rich.post("/api/mint/nonce")).j.message;
  assert(n.includes("Spends 1000 XEET"), "signed message states the cost");
  r = await rich.post("/api/mint/reserve", { signature: sign(n, U.rich.sk) });
  assert(r.status === 200 && r.j.spot === 248, "reserved spot #248");
  r = await rich.req("/api/me");
  assert(r.j.user.xeet === 500, "1000 XEET deducted (1500 -> 500)");
  r = await rich.req("/api/mint");
  assert(r.j.me.reservedSpot && r.j.me.eligible, "status shows eligible (reserved)");
  n = (await rich.post("/api/mint/nonce")).j.message;
  r = await rich.post("/api/mint/reserve", { signature: sign(n, U.rich.sk) });
  assert(r.status === 409 && r.j.code === "already_reserved", "second reservation by same user rejected");

  // 2 spots left (249, 250); 2 racers + nobody else -> both succeed; then cap reached.
  const a = client(U.racer1.cookie), b = client(U.racer2.cookie);
  const [na, nb] = await Promise.all([a.post("/api/mint/nonce"), b.post("/api/mint/nonce")]);
  const [ra, rb] = await Promise.all([
    a.post("/api/mint/reserve", { signature: sign(na.j.message, U.racer1.sk) }),
    b.post("/api/mint/reserve", { signature: sign(nb.j.message, U.racer2.sk) }),
  ]);
  assert(ra.status === 200 && rb.status === 200 && new Set([ra.j.spot, rb.j.spot]).size === 2, `concurrent reservations get distinct spots (${ra.j.spot}, ${rb.j.spot})`);
  r = await client().req("/api/mint");
  assert(r.j.reserved === 250, "cap reached at exactly 250");
  const late = await makeUser("mlate");
  const lc = client(late.cookie);
  r = await lc.req("/api/mint");
  assert(!r.j.me.canReserve, "late user cannot reserve when sold out");
  console.log("\nMINT ALL PASSED");
}
