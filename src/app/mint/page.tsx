"use client";
import bs58 from "bs58";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Link from "next/link";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import { dec, short } from "@/components/format";
import { post, useMe } from "@/components/hooks";
import { Sim, Xeet } from "@/components/ui";

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

const ART = [
  { n: 17, name: "No Parking", file: "017-no-parking.svg" },
  { n: 19, name: "No Skating", file: "019-no-skating.svg" },
  { n: 34, name: "No Magnets", file: "034-no-magnets.svg" },
];

export default function MintPage() {
  const { data, isLoading } = useSWR<Mint>("/api/mint", { refreshInterval: 15_000 });
  const { data: meData } = useMe();
  const user = meData?.user;
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [busy, setBusy] = useState(false);
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
    <div className="rise">
      {/* status line */}
      <p className="text-center text-[15px] text-muted">
        <span className="inline-flex items-center gap-2 font-semibold text-mint"><span className="live-dot h-2.5 w-2.5 rounded-full bg-mint" />Free mint on Solana</span>
        {" · "}{data ? `${data.reserved}/${c!.reserve} reserved` : "…"}{" · "}mint opens in <span className="num text-ink">{cd}</span>
      </p>

      {/* eligibility banner */}
      {me && (
        <div className={`mt-5 rounded-3xl p-4 text-center ${me.eligible ? "bg-mint/10 ring-1 ring-mint/40" : "bg-surface"}`}>
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
                {me.rank ? `You're #${me.rank} in XEET. ` : ""}Reach top {c!.gtd} by ENDGAME, or reserve one of {c!.reserve} spots with {c!.reserveCost} XEET.
              </div>
            </>
          )}
        </div>
      )}

      {/* hero */}
      <section className="mt-8 text-center">
        <div className="mx-auto grid max-w-sm grid-cols-3 gap-2">
          {ART.map((a, i) => (
            <figure key={a.file} className={`relative rounded-3xl bg-surface p-3 ${i === 0 ? "col-span-2 row-span-2 p-6" : ""}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/signs/${a.file}`} alt={`SIGNS #${a.n}: ${a.name}`} className="aspect-square w-full" />
              <figcaption className="num absolute bottom-2 left-3 text-[10px] text-muted">#{a.n}</figcaption>
            </figure>
          ))}
        </div>
        <h1 className="mt-6 font-display text-[clamp(40px,13vw,72px)] font-bold leading-none tracking-tight">SIGNS</h1>
        <p className="mt-2 text-[17px] text-muted"><span className="num text-ink">303</span> signs (#1–300 + 3 test pieces) · free mint on Solana</p>

        <h2 className="mt-8 flex flex-wrap items-center justify-center gap-x-3 font-display text-[clamp(24px,7.5vw,38px)] font-bold leading-tight">
          Reserve <span className="num text-brand">#{data ? Math.min(c!.reserve, data.reserved + 1) : "–"}</span> for
          <span className="flex items-center gap-2 text-brand"><Xeet className="h-8 w-8" /><span className="num">1000</span> XEET</span>
        </h2>
        <button onClick={cta.action} disabled={cta.disabled || isLoading}
          className="mt-5 h-16 w-full rounded-full bg-brand font-display text-xl font-semibold text-white transition hover:bg-brand-2 active:scale-[.99] disabled:bg-brand-dim disabled:text-white/60">
          {cta.label}
        </button>
        {err && <p className="mt-3 text-sm text-loss">{err}</p>}
        {me && <p className="mt-3 text-sm text-muted">Your balance: <span className="num text-ink">{dec(me.xeet)}</span> XEET{me.wallet && <> · signing wallet <span className="num">{short(me.wallet, 4)}</span></>}</p>}
      </section>

      {/* allocation */}
      <section className="mt-10 rounded-3xl bg-surface p-5">
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
          <Alloc color="bg-gold" n={33} title="Guaranteed free mint" body={<>Top 33 XEET holders at the ENDGAME snapshot (Jun 30, 2027 00:00 UTC). <Link href="/endgame" className="text-ink underline">See the board</Link></>} />
          <Alloc color="bg-brand" n={250} title="Reserve, first come first served" body={<>1,000 XEET per spot, signed with your Solana wallet. <span className="text-ink">{left}</span> left.</>} />
          <Alloc color="bg-faint" n={20} title="Creator reserve" body="Held by the Xarme team." />
        </ul>
      </section>

      <section className="mt-4 rounded-3xl bg-surface p-5 text-sm text-muted">
        <h3 className="font-display text-lg font-semibold text-ink">How it works</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5">
          <li>Sign in with X and link a Solana wallet. The linked wallet is where your SIGN mints.</li>
          <li>Two routes: <span className="text-ink">reserve</span> (spends 1,000 XEET per spot, no refunds) or <span className="text-ink">stack XEET</span> to finish top 33 at the snapshot (costs nothing). Reserving lowers your balance, so it can cost you a top-33 place.</li>
          <li>One reserve per wallet: 2,000 XEET does not buy 2 spots.</li>
          <li>Top-33 holders can also reserve one. That makes 2 (the max per wallet) only if they still hold a top-33 place at the snapshot; otherwise they keep just the reserve.</li>
          <li>The free mint opens at ENDGAME. You pay only Solana network fees.</li>
        </ol>
        {!data?.onchain && <p className="mt-4"><Sim>MINT PROGRAM NOT DEPLOYED</Sim> <span className="ml-1">Reservations are recorded off-chain with your wallet signature.</span></p>}
      </section>
    </div>
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
