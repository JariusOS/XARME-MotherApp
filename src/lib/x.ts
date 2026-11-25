import "server-only";
import { mode, RULES } from "./config";

export type PostMetrics = {
  id: string;
  text: string;
  authorUsername: string;
  authorName: string;
  authorAvatar: string | null;
  postedAt: string;
  impressions: number;
  likes: number;
  source: "x-api" | "simulated";
};

export class XError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/** Accepts x.com / twitter.com status URLs or a bare numeric id. */
export function parseTweetId(input: string): string | null {
  const s = input.trim();
  if (/^\d{5,25}$/.test(s)) return s;
  const m = s.match(/(?:x|twitter)\.com\/[^/]+\/status(?:es)?\/(\d{5,25})/i);
  return m ? m[1] : null;
}

/** Tweet ids are snowflakes: the creation time is encoded in the id. */
export function snowflakeTime(id: string): number {
  return Number(BigInt(id) >> 22n) + 1288834974657;
}

// ---------------------------------------------------------------- real (X API v2)
const API = "https://api.x.com/2";
const FIELDS =
  "tweet.fields=public_metrics,created_at,author_id&expansions=author_id&user.fields=username,name,profile_image_url";

type ApiTweet = {
  id: string;
  text: string;
  created_at: string;
  author_id: string;
  public_metrics: { impression_count: number; like_count: number };
};
type ApiUser = { id: string; username: string; name: string; profile_image_url?: string };

async function xGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${process.env.X_BEARER_TOKEN}` },
    cache: "no-store",
  });
  if (res.status === 429) throw new XError("X API rate limit reached. Try again shortly.", 429);
  if (!res.ok) throw new XError(`X API error ${res.status}`, 502);
  return res.json() as Promise<T>;
}

function toMetrics(t: ApiTweet, users: ApiUser[] = []): PostMetrics {
  const u = users.find((x) => x.id === t.author_id);
  return {
    id: t.id,
    text: t.text,
    authorUsername: u?.username ?? "unknown",
    authorName: u?.name ?? "Unknown",
    authorAvatar: u?.profile_image_url ?? null,
    postedAt: t.created_at,
    impressions: t.public_metrics.impression_count,
    likes: t.public_metrics.like_count,
    source: "x-api",
  };
}

const real = {
  async getPosts(ids: string[]): Promise<PostMetrics[]> {
    const out: PostMetrics[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const r = await xGet<{ data?: ApiTweet[]; includes?: { users?: ApiUser[] } }>(
        `/tweets?ids=${ids.slice(i, i + 100).join(",")}&${FIELDS}`,
      );
      out.push(...(r.data ?? []).map((t) => toMetrics(t, r.includes?.users)));
    }
    return out;
  },
  async discover(): Promise<PostMetrics[]> {
    const query = encodeURIComponent(process.env.X_DISCOVER_QUERY || "-is:retweet -is:reply lang:en");
    const r = await xGet<{ data?: ApiTweet[]; includes?: { users?: ApiUser[] } }>(
      `/tweets/search/recent?query=${query}&max_results=100&sort_order=relevancy&${FIELDS}`,
    );
    return (r.data ?? []).map((t) => toMetrics(t, r.includes?.users));
  },
};

// ---------------------------------------------------------------- simulated
const AUTHORS = [
  ["elonmusk", "Elon Musk"], ["naval", "Naval"], ["MrBeast", "MrBeast"], ["solana", "Solana"],
  ["balajis", "Balaji"], ["cobie", "Cobie"], ["NASA", "NASA"], ["Polymarket", "Polymarket"],
  ["aeyakovenko", "toly"], ["sama", "Sam Altman"], ["pmarca", "Marc Andreessen"], ["ESPN", "ESPN"],
];
const TEXTS = [
  "This is the most important chart of the decade.",
  "We just shipped something people said was impossible.",
  "Attention is the new oil. Most people have no idea yet.",
  "Breaking: the numbers are in and nobody saw this coming.",
  "If you're early you're early. If you're late you're exit liquidity.",
  "One year ago today we had 4 users. Today we have 40 million.",
  "Thread on why the internet is about to change forever 🧵",
  "The timeline is undefeated.",
  "Unpopular opinion: speed beats perfection every single time.",
  "Launch day. Thank you to everyone who believed.",
  "Watch this until the end.",
  "History will remember this week.",
];

function hash(s: string) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return h >>> 0;
}

/** Deterministic: a post's final reach is fixed by its id; reach grows over time since posting. */
function simulate(id: string): PostMetrics {
  const h = hash(id);
  const postedAt = snowflakeTime(id);
  const ageH = Math.max(0, (Date.now() - postedAt) / 3_600_000);
  const finalReach = 400_000 + (h % 4_000) * 9_000; // 0.4M – 36M
  const grown = Math.round(finalReach * (1 - Math.exp(-ageH / 30)));
  const likeRate = 0.004 + ((h >>> 8) % 100) / 5_000; // 0.4% – 2.4%
  const [username, name] = AUTHORS[h % AUTHORS.length];
  return {
    id,
    text: TEXTS[(h >>> 4) % TEXTS.length],
    authorUsername: username,
    authorName: name,
    authorAvatar: null,
    postedAt: new Date(postedAt).toISOString(),
    impressions: grown,
    likes: Math.round(grown * likeRate),
    source: "simulated",
  };
}

/** Feed ids are real-format snowflakes minted from timestamps across the last 72h. */
function simulatedFeedIds(): string[] {
  const hourBucket = Math.floor(Date.now() / 3_600_000);
  return Array.from({ length: 24 }, (_, i) => {
    const t = (hourBucket - 2 - i * 3) * 3_600_000 + (hash(String(i)) % 3_600_000);
    return ((BigInt(t - 1288834974657) << 22n) + BigInt(hash(`seq${i}`) % 4096)).toString();
  });
}

const simulated = {
  async getPosts(ids: string[]) {
    return ids.map(simulate);
  },
  async discover() {
    return simulatedFeedIds().map(simulate);
  },
};

const provider = mode.xData === "real" ? real : simulated;

export async function getPost(id: string): Promise<PostMetrics> {
  const [p] = await provider.getPosts([id]);
  if (!p) throw new XError("Post not found or not public.", 404);
  return p;
}
export const getPosts = (ids: string[]) => provider.getPosts(ids);
export async function discover(): Promise<PostMetrics[]> {
  const posts = await provider.discover();
  return posts
    .filter((p) => p.impressions >= RULES.minImpressions)
    .sort((a, b) => b.impressions - a.impressions);
}
