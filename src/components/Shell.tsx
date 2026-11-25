"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { mutate } from "swr";
import { post, useMe, useStatus } from "./hooks";
import { Logo, Sim } from "./ui";

const TABS = [
  { href: "/", label: "Discover", icon: "M12 3v18M3 12h18M5 5h14v14H5z" },
  { href: "/endgame", label: "ENDGAME", icon: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4a3 3 0 0 0 3 3M17 6h3a3 3 0 0 1-3 3" },
  { href: "/mint", label: "Mint", icon: "M4 4h16v16H4zM4 15l5-5 4 4 3-3 4 4" },
  { href: "/market", label: "Market", icon: "M3 9l1.5-5h15L21 9M3 9h18v11H3zM9 20v-6h6v6" },
  { href: "/dashboard", label: "Miner", icon: "M4 20V10m6 10V4m6 16v-7m4 7H2" },
  { href: "/wallet", label: "Wallet", icon: "M3 7h15a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H3zm0 0V6a2 2 0 0 1 2-2h11M17 13.5h.01" },
];

function Icon({ d, className }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
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
  const preview = status && (status.mode.xAuth === "simulated" || status.mode.xData === "simulated" || status.mode.database === "ephemeral");
  const isActive = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-2xl px-4 pb-16">
        {/* top bar: logo + text links, like outbid's header */}
        <header className="flex items-center gap-3 pb-4 pt-6">
          <Link href="/" aria-label="Xarme Collective home" className="text-ink">
            <Logo className="h-9 w-9" />
          </Link>
          <nav className="ml-auto flex items-center gap-4 text-[15px] text-muted">
            <Link href="/mint" className="font-semibold text-brand-2 hover:text-brand">SIGNS mint</Link>
            <Link href="/dashboard" className="hidden hover:text-ink sm:inline">My mines</Link>
            {me ? (
              <button
                onClick={async () => { await post("/api/auth/logout"); mutate("/api/me"); }}
                className="flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-sm text-ink hover:bg-raised"
                title="Sign out">
                @{me.username}{me.simulated && <Sim>DEMO</Sim>}
              </button>
            ) : (
              <a href="/api/auth/x/login" className="rounded-full bg-surface px-3 py-1.5 text-sm font-semibold text-ink hover:bg-raised">
                Sign in with X
              </a>
            )}
          </nav>
        </header>

        {/* pill tab bar */}
        <nav className="flex gap-1 overflow-x-auto rounded-full bg-surface p-1.5 [scrollbar-width:none]" aria-label="Main">
          {TABS.map((t) => {
            const active = isActive(t.href);
            const end = t.label === "ENDGAME";
            return (
              <Link key={t.href} href={t.href}
                className={`flex flex-none items-center gap-2 rounded-full px-4 py-2.5 font-display text-[15px] font-semibold transition
                  ${active ? "bg-brand text-white" : end ? "text-gold hover:bg-raised" : "text-ink/90 hover:bg-raised"}`}>
                <Icon d={t.icon} className="h-[18px] w-[18px]" />
                {t.label}
              </Link>
            );
          })}
        </nav>

        {me && !me.wallet && (
          <button onClick={() => setVisible(true)}
            className="mt-3 w-full rounded-2xl border border-brand/40 bg-brand/10 px-4 py-3 text-left text-sm">
            <span className="font-semibold text-brand-2">Connect a Solana wallet</span>
            <span className="text-muted"> to start mining. Verify it on the Wallet tab.</span>
          </button>
        )}

        <main className="pt-6">{children}</main>

        {preview && (
          <p className="mt-10 text-center text-xs text-faint">
            Preview: {[
              status!.mode.xAuth === "simulated" && "X login",
              status!.mode.xData === "simulated" && "post metrics",
              status!.mode.database === "ephemeral" && "storage",
            ].filter(Boolean).join(", ")} simulated or temporary · <Link href="/wallet" className="underline">system status</Link>
          </p>
        )}
      </div>
    </div>
  );
}
