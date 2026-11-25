// Mine Powerups e2e: create -> (server stopped) grant GEMA -> verify.
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
if (phase === "create") {
  const out = {};
  for (const n of ["pu_rich", "pu_poor"]) {
    const c = client(); const kp = nacl.sign.keyPair();
    await c.req(`/api/auth/x/callback?simulated=1&as=${n}`);
    const { j } = await c.post("/api/wallet/nonce");
    await c.post("/api/wallet/link", { publicKey: bs58.encode(kp.publicKey), signature: bs58.encode(nacl.sign.detached(new TextEncoder().encode(j.message), kp.secretKey)) });
    out[n] = c.cookie();
  }
  writeFileSync("/tmp/claude-0/pu-users.json", JSON.stringify(out)); console.log("created");
} else if (phase === "db") {
  const { PGlite } = await import("@electric-sql/pglite");
  const pg = new PGlite(process.cwd() + "/.data/pglite");
  await pg.query("update users set gema = 2000 where x_username = 'pu_rich'");
  await pg.query("update users set gema = 10 where x_username = 'pu_poor'");
  await pg.close(); console.log("db prepared");
} else {
  const U = JSON.parse(readFileSync("/tmp/claude-0/pu-users.json"));
  const a = client(U.pu_rich), p = client(U.pu_poor);
  let r = await a.req("/api/powerups");
  assert(r.j.loadout.slots === 3 && r.j.loadout.windowHours === 24 && r.j.gema === 2000, "default loadout: 3 slots, 24h window");
  r = await p.post("/api/powerups", { kind: "slots" });
  assert(r.status === 402, "insufficient GEMA rejected");
  r = await a.post("/api/powerups", { kind: "nope" });
  assert(r.status === 400, "unknown powerup rejected");

  r = await a.post("/api/powerups", { kind: "slots" });
  assert(r.status === 200 && r.j.spent === 50 && r.j.loadout.slots === 4, "slot L1: 50 GEMA -> 4 slots");
  for (const cost of [150, 400]) { r = await a.post("/api/powerups", { kind: "slots" }); assert(r.j.spent === cost, `slot level for ${cost}`); }
  r = await a.post("/api/powerups", { kind: "slots" });
  assert(r.status === 409 && r.j.code === "maxed", "slots max at 6");
  r = await a.post("/api/powerups", { kind: "cooldown" });
  assert(r.status === 200 && r.j.loadout.windowHours === 20, "cooldown L1: 24h -> 20h");
  r = await a.post("/api/powerups", { kind: "boost" });
  assert(r.status === 200 && r.j.loadout.boostLeft === 3 && r.j.loadout.multiplier === 1.25, "boost: 1.25x for 3 mines");
  r = await a.post("/api/powerups", { kind: "boost" });
  assert(r.status === 409, "second boost while active rejected");
  r = await a.req("/api/me");
  assert(Math.abs(r.j.user.gema - (2000 - 50 - 150 - 400 - 40 - 60)) < 1e-6, `GEMA debited correctly (${r.j.user.gema})`);
  assert(r.j.user.dailyMines === 6 && r.j.user.windowHours === 20, "/api/me reflects 6 slots, 20h");

  // boosted mine: xeet = floor(base * 1.25)
  const feed = (await a.req("/api/discover")).j.posts.filter((x) => !x.minedBy);
  const m = await a.post("/api/mine", { tweetId: feed[0].id });
  const base = Math.floor(m.j.post.impressions / 1e6 * 1e4) / 1e4;
  assert(m.status === 200 && m.j.boost === 1.25 && m.j.xeet === Math.floor(base * 1.25 * 1e4) / 1e4, `boosted mine: ${base} -> ${m.j.xeet} XEET`);
  r = await a.req("/api/powerups");
  assert(r.j.loadout.boostLeft === 2, "boost charge consumed (2 left)");
  // 6 slots: mine 5 more, 7th blocked
  for (let i = 1; i < 6; i++) { const x = await a.post("/api/mine", { tweetId: feed[i].id }); assert(x.status === 200, `mine ${i + 1}/6`); }
  r = await a.post("/api/mine", { tweetId: feed[6].id });
  assert(r.status === 429, "7th mine blocked with 6 slots");
  r = await a.req("/api/me");
  assert(r.j.user.nextFreeAt && r.j.user.boostLeft === 0, "nextFreeAt set; boost used up after 3 mines");
  console.log("\nPOWERUPS ALL PASSED");
}
