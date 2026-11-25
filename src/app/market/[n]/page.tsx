import Link from "next/link";
import { notFound } from "next/navigation";
import { SIGNS, TOTAL, count, pct, signNo, signSrc, tierMeta } from "@/lib/signs";

export function generateStaticParams() {
  return SIGNS.map((s) => ({ n: String(s.n) }));
}

export function generateMetadata({ params }: { params: { n: string } }) {
  const s = SIGNS.find((x) => x.n === Number(params.n));
  return { title: s ? `Sign #${signNo(s.n)}: ${s.name} · Xarme` : "Sign · Xarme" };
}

export default function SignDetail({ params }: { params: { n: string } }) {
  const s = SIGNS.find((x) => x.n === Number(params.n));
  if (!s) notFound();
  const t = tierMeta(s.tier);
  const idx = SIGNS.indexOf(s);
  const prev = SIGNS[(idx - 1 + TOTAL) % TOTAL], next = SIGNS[(idx + 1) % TOTAL];
  const traits: [string, string, number][] = [
    ["Tier", s.tier, count("tier", s.tier)],
    ["Class", s.class, count("class", s.class)],
    ["Theme", s.theme, count("theme", s.theme)],
    ["Series", s.series, count("series", s.series)],
  ];

  return (
    <div className="rise">
      <div className="flex items-center justify-between text-sm text-muted">
        <Link href="/market" className="hover:text-ink">← Market</Link>
        <span className="font-pixel text-xs">Signs on Solana</span>
      </div>

      <div className={`mt-4 rounded-[28px] bg-gradient-to-br p-[3px] ${t.ring}`}>
        <div className="rounded-[25px] bg-bg p-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={signSrc(s.n)} alt={s.name} className="mx-auto aspect-square w-full max-w-xs" />
        </div>
      </div>

      <div className="mt-5 flex items-start justify-between gap-3">
        <div>
          <div className="font-pixel text-sm text-muted">Sign #{signNo(s.n)}</div>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight">{s.name}</h1>
        </div>
        <span className="mt-1 flex-none rounded-full px-3 py-1 text-xs font-bold text-bg" style={{ background: t.color }}>{t.label}</span>
      </div>

      <section className="mt-5 grid grid-cols-2 gap-2">
        {traits.map(([k, v, c]) => (
          <div key={k} className="rounded-2xl bg-surface p-3.5">
            <div className="text-[11px] uppercase tracking-wider text-muted">{k}</div>
            <div className="mt-1 font-semibold">{v}</div>
            <div className="num mt-0.5 text-xs text-muted">{c} of {TOTAL} · {pct(c).toFixed(1)}%</div>
          </div>
        ))}
      </section>

      <section className="mt-2 divide-y divide-line overflow-hidden rounded-2xl bg-surface text-[15px]">
        <Row k="Holder" v={<span className="text-muted">Unminted</span>} />
        <Row k="Status" v="In the pool · random pick at mint" />
        <Row k="Mint price" v={<span className="font-semibold text-mint">FREE · paid in eyeballs</span>} />
        <Row k="Chain" v="Solana" />
      </section>

      <p className="mt-4 text-center text-sm text-muted">Signs are gateways. Holding one is your key to what Xarme opens next.</p>

      <div className="mt-6 grid grid-cols-2 gap-2">
        <Link href={`/market/${prev.n}`} className="rounded-full bg-surface py-3 text-center text-sm font-semibold hover:bg-raised">← #{signNo(prev.n)}</Link>
        <Link href={`/market/${next.n}`} className="rounded-full bg-surface py-3 text-center text-sm font-semibold hover:bg-raised">#{signNo(next.n)} →</Link>
      </div>
      <Link href="/mint" className="mt-3 grid h-14 place-items-center rounded-full bg-brand font-display text-lg font-semibold text-white hover:bg-brand-2">Mint a random sign</Link>
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between gap-3 px-4 py-3"><span className="text-muted">{k}</span><span className="text-right">{v}</span></div>;
}
