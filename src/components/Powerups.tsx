"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import useSWR, { mutate } from "swr";
import { dec } from "./format";
import { post } from "./hooks";
import { Gema } from "./ui";

type Catalog = {
  slots: { base: number; max: number; cost: number[] };
  cooldown: { windows: number[]; max: number; cost: number[] };
  boost: { multiplier: number; mines: number; cost: number };
};
type Loadout = { slots: number; windowHours: number; slotLevel: number; cooldownLevel: number; boostLeft: number; multiplier: number };
type Data = { catalog: Catalog; loadout: Loadout | null; gema: number | null };

export function PowerupsButton({ active }: { active?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Mine powerups"
        className={`relative grid h-11 w-11 flex-none place-items-center rounded-full bg-surface text-gold transition hover:bg-raised ${active ? "ring-2 ring-gold" : ""}`}>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
        {active && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-gold" />}
      </button>
      {open && <PowerupsDialog onClose={() => setOpen(false)} />}
    </>
  );
}

function PowerupsDialog({ onClose }: { onClose: () => void }) {
  const { data } = useSWR<Data>("/api/powerups");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  async function buy(kind: string, label: string) {
    setBusy(kind); setMsg(null);
    try {
      const r = await post<{ spent: number }>("/api/powerups", { kind });
      setMsg({ ok: true, text: `${label} unlocked for ${r.spent} GEMA.` });
      mutate("/api/powerups"); mutate("/api/me");
    } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    finally { setBusy(null); }
  }

  const c = data?.catalog, lo = data?.loadout, gema = data?.gema ?? 0;
  const tools = c ? [
    {
      kind: "slots", icon: "M4 6h16M4 12h16M4 18h10", title: "Extra slot",
      now: `${lo?.slots ?? c.slots.base} slots`, next: lo && lo.slotLevel < c.slots.max ? `${lo.slots + 1} slots` : null,
      cost: lo && lo.slotLevel < c.slots.max ? c.slots.cost[lo.slotLevel] : null,
      level: lo?.slotLevel ?? 0, max: c.slots.max, note: "Mine more posts per window. Permanent.",
    },
    {
      kind: "cooldown", icon: "M12 7v5l3 2M21 12a9 9 0 1 1-9-9", title: "Cooldown cut",
      now: `${lo?.windowHours ?? 24}h window`, next: lo && lo.cooldownLevel < c.cooldown.max ? `${c.cooldown.windows[lo.cooldownLevel + 1]}h window` : null,
      cost: lo && lo.cooldownLevel < c.cooldown.max ? c.cooldown.cost[lo.cooldownLevel] : null,
      level: lo?.cooldownLevel ?? 0, max: c.cooldown.max, note: "Slots free up sooner. Permanent.",
    },
    {
      kind: "boost", icon: "M13 2 4 14h7l-1 8 9-12h-7z", title: `${c.boost.multiplier}x XEET boost`,
      now: lo?.boostLeft ? `${lo.boostLeft} boosted mine${lo.boostLeft > 1 ? "s" : ""} left` : "Off",
      next: lo?.boostLeft ? null : `${c.boost.multiplier}x on next ${c.boost.mines} mines`,
      cost: lo?.boostLeft ? null : c.boost.cost, level: lo?.boostLeft ? 1 : 0, max: 1,
      note: "Multiplies XEET on your next mines. One pack at a time.",
    },
  ] : [];

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label="Mine powerups" onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-sm sm:items-center">
      <div onClick={(e) => e.stopPropagation()} className="rise w-full max-w-md rounded-3xl bg-surface p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-pixel text-xs text-gold">MINE POWERUPS</div>
            <h2 className="font-display text-2xl font-bold">Tools</h2>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-bg px-3 py-1.5 text-sm">
            <Gema className="h-4 w-4" /><span className="num font-semibold">{dec(gema)}</span>
          </div>
        </div>
        {!lo && data && <p className="mt-4 text-sm text-muted">Sign in with X to use powerups.</p>}
        <div className="mt-4 space-y-2">
          {tools.map((t) => (
            <div key={t.kind} className="rounded-2xl bg-bg p-4">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 flex-none place-items-center rounded-xl bg-raised text-gold">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill={t.kind === "boost" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d={t.icon} /></svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-semibold">{t.title}</h3>
                    {t.max > 1 && (
                      <span className="flex gap-1">{Array.from({ length: t.max }, (_, i) => <span key={i} className={`h-1.5 w-4 rounded-full ${i < t.level ? "bg-gold" : "bg-line"}`} />)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted">{t.note}</p>
                  <p className="mt-1.5 text-sm"><span className="text-muted">Now</span> {t.now}{t.next && <><span className="text-muted"> → </span><span className="text-mint">{t.next}</span></>}</p>
                </div>
              </div>
              <button type="button" disabled={!lo || t.cost === null || busy !== null || gema < (t.cost ?? 0)}
                onClick={() => buy(t.kind, t.title)}
                className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand text-sm font-semibold text-white hover:bg-brand-2 disabled:bg-raised disabled:text-muted">
                {t.cost === null ? (t.kind === "boost" ? "Active" : "Maxed") : busy === t.kind ? "Unlocking…" :
                  <>Unlock for <Gema className="h-4 w-4" /><span className="num">{t.cost}</span> GEMA</>}
              </button>
            </div>
          ))}
        </div>
        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-mint" : "text-loss"}`}>{msg.text}</p>}
        <p className="mt-3 text-center text-[11px] text-faint">Prices are placeholders while the economy is tuned.</p>
        <button onClick={onClose} className="mt-3 w-full py-2 text-sm text-muted hover:text-ink">Close</button>
      </div>
    </div>,
    document.body,
  );
}
