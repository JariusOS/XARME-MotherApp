import Link from "next/link";
import { signNo, signSrc, tierMeta, type Sign } from "@/lib/signs";

export default function SignTile({ s }: { s: Sign }) {
  const t = tierMeta(s.tier);
  return (
    <Link href={`/market/${s.n}`} className="group block rounded-2xl bg-surface p-2 transition hover:bg-raised active:scale-[.98]">
      <div className="relative aspect-square rounded-xl bg-bg p-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={signSrc(s.n)} alt={s.name} loading="lazy" className="h-full w-full transition group-hover:scale-105" />
        {s.tier !== "Common" && (
          <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full" style={{ background: t.color }} title={t.label} />
        )}
      </div>
      <div className="mt-2 px-1 pb-0.5">
        <div className="font-pixel text-[11px] text-muted">#{signNo(s.n)}</div>
        <div className="truncate text-[13px] font-medium">{s.name}</div>
      </div>
    </Link>
  );
}
