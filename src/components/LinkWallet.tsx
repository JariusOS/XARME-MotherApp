"use client";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import bs58 from "bs58";
import { useState } from "react";
import { mutate } from "swr";
import { post } from "./hooks";
import { Button } from "./ui";

/** Connect a Solana wallet, then prove ownership by signing a nonce (verified server-side). */
export default function LinkWallet({ compact = false }: { compact?: boolean }) {
  const { publicKey, signMessage, connected } = useWallet();
  const { setVisible } = useWalletModal();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!connected || !publicKey) {
    return <Button onClick={() => setVisible(true)} className={compact ? "" : "w-full"}>Connect Solana wallet</Button>;
  }
  return (
    <div className={compact ? "" : "w-full"}>
      <Button
        className={compact ? "" : "w-full"}
        disabled={busy || !signMessage}
        onClick={async () => {
          setErr(null);
          setBusy(true);
          try {
            const { message } = await post<{ message: string }>("/api/wallet/nonce");
            const sig = await signMessage!(new TextEncoder().encode(message));
            await post("/api/wallet/link", { publicKey: publicKey.toBase58(), signature: bs58.encode(sig) });
            await mutate("/api/me");
          } catch (e) {
            setErr((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}>
        {busy ? "Waiting for signature…" : "Verify wallet ownership"}
      </Button>
      {!signMessage && <p className="mt-2 text-xs text-loss">This wallet can&apos;t sign messages.</p>}
      {err && <p className="mt-2 text-xs text-loss">{err}</p>}
    </div>
  );
}
