"use client";
import bs58 from "bs58";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { dec, short } from "@/components/format";
import { post, useMe } from "@/components/hooks";
import { Sim } from "@/components/ui";
import { SIGNS, TIERS, count, pct, signSrc } from "@/lib/signs";

type Mint = {
  collection: { name: string; total: number; gtd: number; reserve: number; creator: number; reserveCost: number; opensAt: string };
  reserved: number;
  onchain: boolean;
  me: null | {
    xeet: number; wallet: string | null; rank: number | null; projectedGtd: boolean; reservedSpot: boolean;
    myReserved: number; maxReserves: number; atLimit: boolean; totalSpots: number;
    canReserve: boolean; eligible: boolean; xeetNeeded: number;
  };
};

export default function MintPage() {
  const { data, isLoading } = useSWR<Mint>("/api/mint", { refreshInterval: 15_000 });
  const { data: meData } = useMe();
  const user = meData?.user;
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { setNow(Date.now()); const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const c = data?.collection;
  const me = data?.me;
  const left = c ? c.reserve - data!.reserved : 0;
  const ms = c && now ? Math.max(0, Date.parse(c.opensAt) - now) : null;
  const cd = ms === null ? "--d --:--:--" :
    `${Math.floor(ms / 864e5)}d ${[Math.floor(ms / 36e5) % 24, Math.floor(ms / 6e4) % 60, Math.floor(ms / 1e3) % 60].map((v) => String(v).padStart(2, "0")).join(":")}`;

  const walletMismatch = connected && me?.wallet && publicKey?.toBase58() !== me.wallet;

  async function doReserve() {
    setErr(null);
    if (!connected) { setVisible(true); return; }
    if (walletMismatch) { setErr(`Switch to your linked wallet ${short(me!.wallet, 4)} to sign.`); return; }
    setBusy(true);
    try {
      const { message } = await post<{ message: string }>("/api/mint/nonce");
      const sig = await signMessage!(new TextEncoder().encode(message));
      await post("/api/mint/reserve", { signature: bs58.encode(sig) });
      mutate("/api/mint"); mutate("/api/me");
    } catch (e) { setErr((e as Error).message); }
    finally { setBusy(false); }
  }

  let cta: { label: string; action?: () => void; disabled?: boolean } = { label: "Loading…", disabled: true };
  if (data) {
    if (!user) cta = { label: "Sign in with X to check eligibility", action: () => { location.href = "/api/auth/x/login"; } };
    else if (!me?.wallet) cta = { label: "Link a Solana wallet", action: () => { location.href = "/wallet"; } };
    else if (me.atLimit) cta = { label: me.projectedGtd ? "Reserved ✓ · 2 spots if you hold top 33" : "Spot reserved ✓", disabled: true };
    else if (left <= 0) cta = { label: "Reserve spots sold out", disabled: true };
    else if (me.xeetNeeded > 0) cta = { label: `Need ${dec(me.xeetNeeded)} more XEET`, action: () => { location.href = "/"; } };
    else cta = { label: busy ? "Waiting for signature…" : `Sign & reserve for ${c!.reserveCost} XEET`, action: doReserve, disabled: busy };
  }

  return (
    <div className="rise pb-72">
      {/* title */}
      <section className="text-center">
        <div className="font-pixel text-[13px] text-muted">(powered by xarmebot)</div>
        <h1 className="mt-1 font-display text-[clamp(34px,11vw,60px)] font-bold leading-[0.95] tracking-tight">
          Signs <span className="font-pixel text-[0.62em] font-normal text-brand">on</span> Solana
        </h1>
        <p className="mt-3 text-[15px] text-muted">
          <span className="inline-flex items-center gap-2 font-semibold text-mint"><span className="live-dot h-2.5 w-2.5 rounded-full bg-mint" />Free mint</span>
          {" · "}{data ? `${data.reserved}/${c!.reserve}` : "…"} reserved · opens in <span className="num text-ink">{cd}</span>
        </p>
      </section>

      {/* mystery card */}
      <section className="mt-6">
        <Mystery />
        <p className="mt-3 text-center font-pixel text-xs text-muted">picks are random · 303 signs in the pool</p>
      </section>

      {/* free mint, costs eyeballs */}
      <section className="mt-6 rounded-3xl border-2 border-dashed border-mint/40 bg-mint/[.06] p-5 text-center">
        <div className="font-pixel text-sm text-mint">FREE MINT</div>
        <div className="mt-1 font-display text-2xl font-bold leading-snug">It costs eyeballs, not SOL.</div>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
          You pay in <span className="text-ink">verified impressions</span>. 1 XEET = 1M impressions checked on X, so a reserve of
          {" "}<span className="text-ink">1,000 XEET</span> = <span className="text-ink">1 billion eyeballs</span>. The top 33 pay nothing at all.
        </p>
      </section>

      {/* eligibility */}
      {me && (
        <div className={`mt-4 rounded-3xl p-4 text-center ${me.eligible ? "bg-mint/10 ring-1 ring-mint/40" : "bg-surface"}`}>
          {me.eligible ? (
            <>
              <div className="font-display text-xl font-bold text-mint">You are eligible</div>
              <div className="mt-1 text-sm text-muted">
                {me.myReserved > 0 && "Reserved spot held. "}
                {me.projectedGtd && `Projected guaranteed: you're #${me.rank} in XEET. Stay top ${c!.gtd} at the snapshot. `}
                {me.projectedGtd && me.myReserved === 0 && "You can also reserve 1 for a max of 2."}
              </div>
            </>
          ) : (
            <>
              <div className="font-display text-xl font-bold">Not eligible yet</div>
              <div className="mt-1 text-sm text-muted">
                {me.rank ? `You're #${me.rank} in XEET. ` : ""}Stack XEET into the top {c!.gtd}, or reserve 1 of {c!.reserve} spots.
              </div>
            </>
          )}
        </div>
      )}

      {/* what's inside */}
      <section className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold">What&apos;s inside</h2>
          <Link href="/market" className="text-sm text-muted hover:text-ink">Browse all →</Link>
        </div>
        <div className="-mx-4 mt-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          {TIERS.map((t) => {
            const k = count("tier", t.id);
            const sample = SIGNS.find((x) => x.tier === t.id)!;
            return (
              <article key={t.id} className="w-[78%] flex-none snap-start rounded-3xl bg-surface p-4 sm:w-[46%]">
                <div className="flex gap-4">
                  <div className={`flex-none rounded-2xl bg-gradient-to-br p-[3px] ${t.ring}`}>
                    <div className="grid h-24 w-24 place-items-center rounded-[13px] bg-bg p-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={signSrc(sample.n)} alt="" className="h-full w-full" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <span className="inline-block rounded-md px-2 py-0.5 text-xs font-bold text-bg" style={{ background: t.color }}>{t.label}</span>
                    <div className="num mt-2 text-xl font-bold">{pct(k) < 1 ? pct(k).toFixed(2) : pct(k).toFixed(1)}%</div>
                    <div className="text-xs text-muted">drop rate · {k} of 303</div>
                    <div className="mt-1 truncate text-xs text-muted">{t.blurb}</div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* supply */}
      <section className="mt-6 rounded-3xl bg-surface p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="font-display text-lg font-semibold">Supply</h3>
          <span className="num text-2xl font-bold">303</span>
        </div>
        <div className="mt-4 flex h-4 overflow-hidden rounded-full">
          <div className="bg-gold" style={{ width: `${(33 / 303) * 100}%` }} />
          <div className="relative bg-brand-dim" style={{ width: `${(250 / 303) * 100}%` }}>
            <div className="absolute inset-y-0 left-0 bg-brand" style={{ width: `${((data?.reserved ?? 0) / 250) * 100}%` }} />
          </div>
          <div className="bg-faint" style={{ width: `${(20 / 303) * 100}%` }} />
        </div>
        <ul className="mt-5 space-y-4 text-[15px]">
          <Alloc color="bg-gold" n={33} title="Top 33 XEET: guaranteed" body={<>Free for the top 33 at the snapshot (Jun 30, 2027 00:00 UTC). <Link href="/endgame" className="text-ink underline">See the board</Link></>} />
          <Alloc color="bg-brand" n={250} title="Reserve: first come, first served" body={<>1,000 XEET, signed with your Solana wallet. 1 per wallet. <span className="text-ink">{left}</span> left.</>} />
          <Alloc color="bg-faint" n={20} title="Creator reserve" body="Held by the Xarme team." />
        </ul>
      </section>

      <section className="mt-4 rounded-3xl bg-surface p-5 text-sm text-muted">
        <h3 className="font-display text-lg font-semibold text-ink">Signs are gateways</h3>
        <p className="mt-2">Each SIGN is a key to what Xarme opens next. Mine attention, keep your eyeballs, walk through.</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          <li>Sign in with X and link a Solana wallet. Your SIGN mints there.</li>
          <li>Two routes: <span className="text-ink">reserve</span> (spends 1,000 XEET, no refunds) or <span className="text-ink">stack XEET</span> into the top 33 (costs nothing). Reserving lowers your balance and can cost you a top-33 place.</li>
          <li>One reserve per wallet. Top-33 holders can also reserve: 2 is the max, and only if they still hold top 33 at the snapshot.</li>
          <li>Every pick is random from the pool. Mint opens at ENDGAME; you pay only Solana network fees.</li>
        </ol>
        {!data?.onchain && <p className="mt-4"><Sim>MINT PROGRAM NOT DEPLOYED</Sim> <span className="ml-1">Reservations are recorded off-chain with your wallet signature.</span></p>}
      </section>

      {/* you pay: pinned sheet (Magic Eden pack style) */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto max-w-2xl px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-4">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl font-bold">You pay</span>
            <span className="font-display text-xl font-bold text-mint">FREE</span>
          </div>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-muted">Mint price</dt><dd className="num">0 SOL</dd></div>
            <div className="flex justify-between"><dt className="text-muted">Eyeballs (reserve)</dt><dd className="num">1,000 XEET <span className="text-muted">· 1B impressions</span></dd></div>
            <div className="flex justify-between"><dt className="text-muted">Solana network fee</dt><dd className="text-muted">at mint</dd></div>
          </dl>
          <div className="mt-3 flex gap-2">
            <div className="grid h-14 flex-none place-items-center rounded-2xl bg-surface px-4 text-sm"><span><span className="num font-bold">1</span> <span className="text-muted">/ wallet</span></span></div>
            <button onClick={cta.action} disabled={cta.disabled || isLoading || (!agree && !!cta.action && cta.label.startsWith("Sign"))}
              className="h-14 flex-1 rounded-2xl bg-brand px-3 font-display text-[17px] font-semibold text-white transition hover:bg-brand-2 active:scale-[.99] disabled:bg-brand-dim disabled:text-white/60">
              {cta.label}
            </button>
          </div>
          <label className="mt-3 flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="h-4 w-4 accent-[#e8735a]" />
            I understand picks are random and reserves are final.
          </label>
          {err && <p className="mt-2 text-sm text-loss">{err}</p>}
          {me && <p className="mt-1 text-xs text-faint">Balance <span className="num text-muted">{dec(me.xeet)}</span> XEET{me.wallet && <> · wallet <span className="num">{short(me.wallet, 4)}</span></>}</p>}
        </div>
      </div>
    </div>
  );
}

/** Ordinals/CryptoKitties-style sealed card: shuffles through real signs, "?" until mint. */
function Mystery() {
  const [i, setI] = useState(0);
  const [rolling, setRolling] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setI(Math.floor(Math.random() * SIGNS.length)), rolling ? 90 : 900);
    return () => clearInterval(t);
  }, [rolling]);
  const s = SIGNS[i];
  return (
    <button type="button" onPointerDown={() => setRolling(true)} onPointerUp={() => setRolling(false)} onPointerLeave={() => setRolling(false)}
      className="relative mx-auto block w-full max-w-[300px] select-none" aria-label="Mystery sign: hold to shuffle">
      <div className="holo rounded-[30px] p-[4px]">
        <div className="relative overflow-hidden rounded-[26px] bg-bg">
          <div className="flex items-center justify-between px-4 pt-3 font-pixel text-[11px] text-muted">
            <span>SIGN #???</span><span>SOLANA</span>
          </div>
          <div className="relative mx-6 my-5 aspect-square">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={signSrc(s.n)} alt="" className="h-full w-full opacity-30 blur-[1.5px] transition" />
            <div className="absolute inset-0 grid place-items-center font-display text-[120px] font-bold leading-none text-ink drop-shadow-[0_6px_24px_rgba(0,0,0,.6)]">?</div>
          </div>
          <div className="flex items-center justify-between border-t border-dashed border-line px-4 py-2.5 font-pixel text-[11px]">
            <span className="text-mint">FREE</span><span className="text-muted">hold to shuffle</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function Alloc({ color, n, title, body }: { color: string; n: number; title: string; body: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className={`mt-1.5 h-3 w-3 flex-none rounded-full ${color}`} />
      <div className="flex-1">
        <div className="flex justify-between font-semibold text-ink"><span>{title}</span><span className="num">{n}</span></div>
        <div className="mt-0.5 text-muted">{body}</div>
      </div>
    </li>
  );
}
