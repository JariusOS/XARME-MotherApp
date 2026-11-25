"use client";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { SWRConfig } from "swr";

const RPC = process.env.NEXT_PUBLIC_SOLANA_RPC || "https://api.mainnet-beta.solana.com";

export const fetcher = async (url: string) => {
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok) throw Object.assign(new Error(j.error ?? "Request failed"), { status: r.status });
  return j;
};

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig value={{ fetcher, revalidateOnFocus: true }}>
      <ConnectionProvider endpoint={RPC}>
        {/* Wallet Standard auto-detects Phantom, Solflare, Backpack, etc. */}
        <WalletProvider wallets={[]} autoConnect>
          <WalletModalProvider>{children}</WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </SWRConfig>
  );
}
