/** Which integrations are production (real) vs simulated. Decided purely by env. */
export const mode = {
  xAuth: process.env.X_CLIENT_ID ? "real" : "simulated",
  xData: process.env.X_BEARER_TOKEN ? "real" : "simulated",
  database: process.env.DATABASE_URL ? "postgres" : "embedded",
} as const;

export const RULES = {
  minImpressions: 1_000_000,
  dailyMines: 3,
  impressionsPerXeet: 1_000_000,
  likesPerGema: 10_000,
  snapshotHours: 6,
  leaderboardSize: 300,
  endgame: "2027-01-07T00:00:00Z",
} as const;

export const seedSimulated =
  process.env.SEED_SIMULATED ? process.env.SEED_SIMULATED === "true" : mode.xData === "simulated";

/** Rounded down to 4 dp so nobody is ever over-credited. */
const floor4 = (n: number) => Math.floor(n * 10_000) / 10_000;
export const xeetFor = (impressions: number) => floor4(impressions / RULES.impressionsPerXeet);
export const gemaFor = (likes: number) => floor4(likes / RULES.likesPerGema);
