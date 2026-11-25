"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";
import { dec } from "./format";
import { Gema, Logo, Sim, Xeet } from "./ui";

export type MineResult = {
  post: { id: string; text: string; authorUsername: string; authorName: string; impressions: number; likes: number; source: string };
  xeet: number;
  gema: number;
  minesToday: number;
};

/** Post-mine receipt, after the MotherApp "Sniped" card. */
export default function Receipt({ r, onClose }: { r: MineResult; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const shareText = `Just mined ${dec(r.xeet, 4)} XEET from @${r.post.authorUsername}'s post on Xarme Collective.`;
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Mining receipt" className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div className="rise relative w-full max-w-sm overflow-hidden rounded-3xl bg-[#151515]" onClick={(e) => e.stopPropagation()}>
        <div className="pointer-events-none absolute -bottom-24 left-1/2 h-64 w-[130%] -translate-x-1/2 rounded-full bg-brand/60 blur-3xl" />
        <div className="relative p-5">
          <div className="relative overflow-hidden rounded-2xl border border-faint bg-black p-4">
            <div className="absolute -right-10 top-5 w-40 rotate-45 bg-red-600 py-1 text-center text-xs font-black text-white">Mined</div>
            <div className="text-sm font-semibold">{r.post.authorName}</div>
            <div className="text-xs text-muted">@{r.post.authorUsername}</div>
            <p className="mt-3 line-clamp-4 pr-6 text-sm leading-relaxed">{r.post.text}</p>
            <div className="mt-4 flex justify-between text-xs text-muted">
              <span className="num">{r.post.impressions.toLocaleString()} views</span>
              <span className="num">{r.post.likes.toLocaleString()} likes</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-2xl font-black tracking-tight text-ink/90">Extraction complete</h2>
          <p className="mt-1 text-center text-sm text-muted">First to the post. It&apos;s yours.</p>
          <dl className="mt-6 space-y-4 text-lg">
            <Row k="XEET" v={<span className="flex items-center gap-2"><Xeet className="h-6 w-6" /><span className="num font-bold">{dec(r.xeet, 4)}</span></span>} />
            <Row k="gema" v={<span className="flex items-center gap-2"><Gema className="h-6 w-6" /><span className="num font-bold">{dec(r.gema, 4)}</span></span>} />
            <Row k="Status" v={<span className="font-black text-lime-400">SUCCESS</span>} />
            <Row k="Today" v={<span className="num">{r.minesToday}/3 mines</span>} />
          </dl>
          {r.post.source === "simulated" && <div className="mt-4 text-center"><Sim>SIMULATED METRICS</Sim></div>}
          <div className="mt-6 flex items-center justify-between border-t border-white/20 pt-4">
            <button onClick={onClose} className="text-sm text-muted hover:text-ink">Close</button>
            <Logo className="h-6 w-6" />
            <a className="text-sm font-semibold" target="_blank" rel="noreferrer"
              href={`https://x.com/intent/post?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(`https://x.com/i/status/${r.post.id}`)}`}>
              Share
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-center justify-between"><dt className="text-ink/90">{k}</dt><dd>{v}</dd></div>;
}
