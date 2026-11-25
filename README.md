# Xarme Collective

Mine social attention from viral X posts. Mobile-first Next.js app with Solana wallet linking.

## Rules (enforced server-side)

| Rule | Where |
|---|---|
| Post must have ≥ 1,000,000 impressions at the moment of mining | `src/lib/mining.ts` |
| 3 mines per user per UTC day | user row locked `FOR UPDATE` inside the mining transaction |
| Each post mined exactly once, first come first served | `mines.tweet_id` is the primary key |
| 1 XEET per 1M impressions, 1 GEMA per 10k likes (rounded **down** to 4 dp) | `src/lib/config.ts` |
| Balances never negative | `CHECK (xeet >= 0)`, `CHECK (gema >= 0)` + append-only `ledger` |
| Impressions re-tracked every 6h | `/api/cron/snapshot` (Vercel cron in `vercel.json`) |
| ENDGAME: 2027-01-07 00:00 UTC; top 300 XEET and top 300 GEMA | `src/app/endgame` |

Dashboard: **potential XEET** = latest impressions ÷ 1M. **XEET lost by mining early** = potential − extracted.

## Production vs simulated

Each integration switches on when its env var is set (see `.env.example`). The UI shows a banner and `SIMULATED` badges for anything not live, and **Wallet → System status** lists every integration.

| Feature | Production (env set) | Simulated (env missing) |
|---|---|---|
| X login | OAuth 2.0 PKCE (`X_CLIENT_ID`) | demo account (`/api/auth/x/callback?simulated=1&as=handle`) |
| Post metrics + Discover feed | X API v2 (`X_BEARER_TOKEN`) | deterministic metrics that grow with post age |
| Wallet linking | **always real**: ed25519 signature over a session nonce, verified server-side | — |
| SOL balance | **always real**: Solana RPC | — |
| Database | Postgres (`DATABASE_URL`) | embedded Postgres (PGlite) in `./.data` |
| Leaderboard | real users | + 320 seeded users flagged `simulated` |
| On-chain XEET/GEMA | not built | off-chain ledger |
| GEMA spending (upgrades) | not built | — |

## Run

```bash
npm install
npm run dev            # http://localhost:3000, everything simulated
npm run build && SESSION_SECRET=... npm start
node tests/e2e.mjs     # against a running server (BASE=http://localhost:3100)
```

## Going live: what you need

1. **X developer app** (OAuth 2.0, callback `https://<domain>/api/auth/x/callback`), plus an **X API tier that allows
   tweet lookup and recent search**. Every mine = 1 lookup, every 6h tracking pass = 1 call per 100 mined posts,
   and every Discover load = 1 search (cache this before launch).
2. Postgres (`DATABASE_URL`), `SESSION_SECRET` (32+ chars), `CRON_SECRET`.
3. A paid Solana RPC for `NEXT_PUBLIC_SOLANA_RPC`; the public endpoint rate-limits browsers.

## Known gaps

- Discover's real feed is a recent search filtered to ≥ 1M impressions. Coverage depends on the query and X API tier.
- Snapshot series only grows once the cron runs; the first point is the mining moment.
- No admin, abuse controls beyond the rules above, or settlement of XEET/GEMA on-chain.
