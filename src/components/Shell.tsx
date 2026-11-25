"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { mutate } from "swr";
import { compact, short } from "./format";
import { post, useMe, useStatus } from "./hooks";
import { Gema, Logo, Sim, Xeet } from "./ui";

const TABS = [
  { href: "/", label: "Discover", icon: "M11 4a7 7 0 1 0 4.9 12l4.6 4.6M11 4a7 7 0 0 1 7 7" },
  { href: "/dashboard", label: "Miner", icon: "M4 20V10m6 10V4m6 16v-7m4 7H2" },
  { href: "/endgame", label: "ENDGAME", icon: "M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z" },
  { href: "/wallet", label: "Wallet", icon: "M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H3zm0 0V6a2 2 0 0 1 2-2h11M17 13.5h.01" },
];

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={d} />
    </svg>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const { data } = useMe();
  const { data: status } = useStatus();
  const { setVisible } = useWalletModal();
  const me = data?.user;
  const simulated = status && (status.mode.xAuth === "simulated" || status.mode.xData === "simulated");

  return (
    <div className="min-h-dvh">
      {simulated && (
        <div className="border-b border-gold/20 bg-gold/[.06] px-4 py-1.5 text-center text-[11px] text-gold">
          Preview mode: {status!.mode.xAuth === "simulated" && "X login"}
          {status!.mode.xAuth === "simulated" && status!.mode.xData === "simulated" && " and "}
          {status!.mode.xData === "simulated" && "post metrics"} are simulated. See Wallet → System status.
        </div>
      )}
      <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Logo className="h-6 w-6 text-ink" />
            <span className="text-sm font-semibold tracking-wide">XARME <span className="text-muted">COLLECTIVE</span></span>
          </Link>
          <nav className="ml-6 hidden gap-1 md:flex">
            {TABS.map((t) => {
              const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
              const endgame = t.label === "ENDGAME";
              return (
                <Link key={t.href} href={t.href}
                  className={`rounded-lg px-3 py-1.5 text-sm transition ${active ? "bg-raised text-ink" : "text-muted hover:text-ink"} ${endgame ? "font-bold tracking-wider text-gold hover:text-gold" : ""}`}>
                  {t.label === "Miner" ? "Miner Dashboard" : t.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {me ? (
              <>
                <div className="hidden items-center gap-3 rounded-lg border border-line bg-surface px-3 py-1.5 sm:flex">
                  <span className="flex items-center gap-1.5"><Xeet className="h-4 w-4" /><span className="num text-xs">{compact(me.xeet)}</span></span>
                  <span className="flex items-center gap-1.5"><Gema className="h-4 w-4" /><span className="num text-xs">{compact(me.gema)}</span></span>
                </div>
                {!me.wallet && (
                  <button onClick={() => setVisible(true)} className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold">Connect wallet</button>
                )}
                <button
                  title="Sign out"
                  onClick={async () => { await post("/api/auth/logout"); mutate("/api/me"); }}
                  className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs text-muted hover:text-ink">
                  @{me.username}{me.simulated && <Sim>DEMO</Sim>}
                </button>
              </>
            ) : (
              <a href="/api/auth/x/login" className="flex items-center gap-2 rounded-lg bg-ink px-3 py-1.5 text-xs font-semibold text-bg">
                Connect <Logo className="h-3.5 w-3.5" />
              </a>
            )}
            {me?.wallet && <span className="num hidden text-xs text-muted lg:inline">{short(me.wallet)}</span>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-6 md:pb-12">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-4">
          {TABS.map((t) => {
            const active = t.href === "/" ? path === "/" : path.startsWith(t.href);
            const endgame = t.label === "ENDGAME";
            return (
              <Link key={t.href} href={t.href}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${active ? (endgame ? "text-gold" : "text-ink") : endgame ? "text-gold/70" : "text-muted"} ${endgame ? "font-bold tracking-wider" : ""}`}>
                <Icon d={t.icon} className="h-5 w-5" />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
