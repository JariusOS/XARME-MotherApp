"use client";
export default function Segmented<T extends string>({
  value, onChange, options,
}: { value: T; onChange: (v: T) => void; options: { id: T; label: string; icon?: React.ReactNode; tone?: "live" }[] }) {
  return (
    <div className="flex rounded-full border border-line p-1" role="tablist">
      {options.map((o) => {
        const on = o.id === value;
        return (
          <button key={o.id} role="tab" aria-selected={on} onClick={() => onChange(o.id)}
            className={`flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 py-2.5 font-display text-[15px] font-semibold transition
              ${on ? "bg-brand text-white" : o.tone === "live" ? "text-brand-2" : "text-ink/90 hover:bg-surface"}`}>
            {o.tone === "live" && !on && <span className="h-2.5 w-2.5 rounded-full bg-brand" />}
            {o.icon}{o.label}
          </button>
        );
      })}
    </div>
  );
}
