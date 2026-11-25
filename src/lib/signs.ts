import data from "@/data/signs.json";

export type Sign = { n: number; name: string; class: string; tier: Tier; theme: string; series: string };
export type Tier = "Legendary" | "Prototype" | "Rare" | "Uncommon" | "Common";

/** SIGNS collection (#1–300 + 3 prototypes). Traits derived from each SVG's colour + name. */
export const SIGNS = data as Sign[];
export const TOTAL = SIGNS.length;

export const TIERS: { id: Tier; label: string; color: string; ring: string; blurb: string }[] = [
  { id: "Legendary", label: "Legendary", color: "#4ade80", ring: "from-emerald-300 via-lime-200 to-emerald-500", blurb: "The only safe-condition sign" },
  { id: "Prototype", label: "Prototype", color: "#c084fc", ring: "from-fuchsia-400 via-sky-300 to-amber-300", blurb: "The 3 test pieces" },
  { id: "Rare", label: "Rare", color: "#60a5fa", ring: "from-sky-300 via-blue-400 to-indigo-500", blurb: "Blue mandatory signs" },
  { id: "Uncommon", label: "Uncommon", color: "#f5c451", ring: "from-amber-200 via-yellow-300 to-amber-500", blurb: "Yellow warning signs" },
  { id: "Common", label: "Common", color: "#e8735a", ring: "from-red-400 via-rose-300 to-red-500", blurb: "Red prohibition signs" },
];
export const tierMeta = (t: Tier) => TIERS.find((x) => x.id === t)!;

export const count = (key: keyof Sign, value: string | number) => SIGNS.filter((s) => s[key] === value).length;
export const pct = (k: number) => (k / TOTAL) * 100;
export const signNo = (n: number) => (n > 300 ? `P${n - 300}` : String(n).padStart(3, "0"));
export const signSrc = (n: number) => `/signs/${n}.svg`;
