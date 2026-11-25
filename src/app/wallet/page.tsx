"use client";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import LinkWallet from "@/components/LinkWallet";
import { dec, short } from "@/components/format";
import { useMe, useStatus } from "@/components/hooks";
import { Gema, Sim, Stat, Xeet } from "@/components/ui";

export default function WalletPage() {
  const { data } = useMe();
  const me = data?.user;
  const { data: status } = useStatus();
  const { connection } = useConnection();
  const { disconnect, connected } = useWallet();
  const [sol, setSol] = useState<number | null | "error">(null);

  useEffect(() => {
    if (!me?.wallet) return;
    connection.getBalance(new PublicKey(me.wallet))
      .then((l) => setSol(l / LAMPORTS_PER_SOL))
      .catch(() => setSol("error"));
  }, [me?.wallet, connection]);

  return (
    <div className="rise space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Wallet</h1>
        <p className="mt-1 text-sm text-muted">XEET and GEMA are tracked off-chain until ENDGAME. Your linked wallet is where they settle.</p>
      </div>

      {!me ? (
        <a href="/api/auth/x/login" className="inline-flex h-12 items-center rounded-full bg-brand px-6 text-sm font-semibold">Connect X first</a>
      ) : (
        <>
          <section className="rounded-3xl bg-surface p-5">
            <div className="text-[11px] uppercase tracking-wider text-muted">Solana wallet</div>
            {me.wallet ? (
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="num break-all text-sm">{me.wallet}</div>
                  <div className="mt-1 text-xs text-mint">Ownership verified by signature</div>
                </div>
                <div className="text-right">
                  <div className="num text-2xl font-bold">
                    {sol === null ? "…" : sol === "error" ? "—" : dec(sol, 4)} <span className="text-sm text-muted">SOL</span>
                  </div>
                  {sol === "error" && <div className="text-xs text-loss">RPC unavailable</div>}
                </div>
              </div>
            ) : (
              <div className="mt-3 max-w-sm"><LinkWallet /></div>
            )}
            {connected && <button onClick={disconnect} className="mt-4 text-xs text-muted hover:text-ink">Disconnect browser wallet</button>}
          </section>

          <section className="grid gap-2 sm:grid-cols-2">
            <Stat label="XEET (locked)" value={<span className="flex items-center gap-2"><Xeet className="h-5 w-5" />{dec(me.xeet, 4)}</span>}
              sub="Accumulative. Cannot be spent or transferred before ENDGAME." />
            <Stat label="GEMA (spendable)" value={<span className="flex items-center gap-2"><Gema className="h-5 w-5" />{dec(me.gema, 4)}</span>}
              sub={<span>Upgrades &amp; in-app activities: <span className="text-gold">not yet available</span></span>} />
          </section>
        </>
      )}

      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted">System status</h2>
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-3xl bg-surface text-sm">
          <StatusRow name="X account login" real={status?.mode.xAuth === "real"} realText="OAuth 2.0 (PKCE)" simText="Demo account, no X app configured" />
          <StatusRow name="Post metrics" real={status?.mode.xData === "real"} realText="Verified via X API v2" simText="Deterministic simulated metrics" />
          <StatusRow name="Wallet linking" real realText="ed25519 signature verified server-side" />
          <StatusRow name="SOL balance" real realText={`Solana RPC`} />
          <StatusRow name="Database" real={status?.mode.database !== "ephemeral"} realText={status?.mode.database === "postgres" ? "Postgres" : "Embedded Postgres (local)"} simText="Temporary: resets when the server restarts" />
          <StatusRow name="On-chain XEET/GEMA" real={false} simText="Off-chain ledger; settlement not built" />
        </div>
        {me?.wallet && <p className="mt-2 text-xs text-faint">Linked: {short(me.wallet, 6)}</p>}
      </section>
    </div>
  );
}

function StatusRow({ name, real, realText, simText }: { name: string; real?: boolean; realText?: string; simText?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span>{name}</span>
      <span className="flex items-center gap-2 text-right text-xs text-muted">
        {real ? realText : simText}
        {real ? <span className="rounded border border-mint/40 bg-mint/10 px-1.5 py-px text-[10px] font-semibold text-mint">LIVE</span> : <Sim />}
      </span>
    </div>
  );
}
