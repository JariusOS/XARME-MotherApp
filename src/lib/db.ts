import "server-only";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { mode, seedSimulated } from "./config";

export type Q = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;
type Db = { q: Q; tx: <R>(fn: (q: Q) => Promise<R>) => Promise<R> };

const SCHEMA = `
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  x_user_id text unique not null,
  x_username text not null,
  x_name text,
  x_avatar text,
  wallet text unique,
  xeet numeric(24,4) not null default 0 check (xeet >= 0),
  gema numeric(24,4) not null default 0 check (gema >= 0),
  simulated boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists mines (
  tweet_id text primary key,                 -- each post can be mined exactly once
  user_id uuid not null references users(id),
  author_username text, author_name text, author_avatar text, text text,
  posted_at timestamptz,
  impressions_at_mine bigint not null,
  likes_at_mine bigint not null,
  xeet_extracted numeric(24,4) not null,
  gema_extracted numeric(24,4) not null,
  latest_impressions bigint not null,
  latest_likes bigint not null,
  last_snapshot_at timestamptz not null default now(),
  mined_at timestamptz not null default now(),
  data_source text not null
);
create index if not exists mines_user_time on mines(user_id, mined_at);
create table if not exists snapshots (
  id bigserial primary key,
  tweet_id text not null references mines(tweet_id),
  impressions bigint not null,
  likes bigint not null,
  taken_at timestamptz not null default now()
);
create index if not exists snapshots_tweet on snapshots(tweet_id, taken_at);
create table if not exists ledger (
  id bigserial primary key,
  user_id uuid not null references users(id),
  currency text not null check (currency in ('XEET','GEMA')),
  amount numeric(24,4) not null,
  reason text not null,
  ref text,
  created_at timestamptz not null default now()
);
create index if not exists ledger_user on ledger(user_id, created_at);
alter table mines add column if not exists boost numeric(6,3) not null default 1;
create table if not exists powerups (
  user_id uuid primary key references users(id),
  slot_level int not null default 0 check (slot_level between 0 and 3),
  cooldown_level int not null default 0 check (cooldown_level between 0 and 3),
  boost_left int not null default 0 check (boost_left >= 0)
);
create table if not exists signs_reservations (
  id bigserial primary key,
  user_id uuid not null references users(id),
  wallet text not null,
  xeet_spent numeric(24,4) not null,
  message text not null,
  signature text not null unique,
  created_at timestamptz not null default now()
);
create index if not exists signs_res_user on signs_reservations(user_id);
create index if not exists users_xeet on users(xeet desc);
create index if not exists users_gema on users(gema desc);
`;

async function connect(): Promise<Db> {
  if (mode.database === "postgres") {
    const postgres = (await import("postgres")).default;
    const sql = postgres(process.env.DATABASE_URL!, { max: 5, prepare: false });
    type Unsafe = { unsafe: (t: string, p?: never[]) => PromiseLike<unknown> };
    const wrap = (s: Unsafe): Q => (text, params = []) => s.unsafe(text, params as never[]) as never;
    return { q: wrap(sql as unknown as Unsafe), tx: (fn) => sql.begin((t) => fn(wrap(t as unknown as Unsafe))) as never };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  // Vercel functions only allow writes to /tmp; data there is lost when the instance recycles.
  const dir = process.env.VERCEL ? "/tmp/xarme-pglite" : join(process.cwd(), ".data", "pglite");
  mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  type Queryable = { query: (t: string, p?: unknown[]) => Promise<{ rows: unknown[] }> };
  const wrap = (s: Queryable): Q => async (text, params = []) => (await s.query(text, params)).rows as never;
  return { q: wrap(pg), tx: async (fn) => (await pg.transaction((t) => fn(wrap(t)))) as never };
}

async function init(): Promise<Db> {
  const db = await connect();
  for (const stmt of SCHEMA.split(";").map((s) => s.trim()).filter(Boolean)) await db.q(stmt);
  if (seedSimulated) await (await import("./seed")).seed(db.q);
  return db;
}

const g = globalThis as unknown as { __xarmeDb?: Promise<Db> };
export const db = () => (g.__xarmeDb ??= init());
