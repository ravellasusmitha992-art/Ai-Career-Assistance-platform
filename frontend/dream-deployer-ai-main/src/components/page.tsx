import type { ReactNode } from "react";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold md:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border bg-card p-6 shadow-card ${className}`}>{children}</div>;
}

export function Chips({ items, tone = "muted" }: { items: string[]; tone?: "muted" | "good" | "bad" }) {
  const cls =
    tone === "good" ? "bg-success/15 text-success" : tone === "bad" ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground";
  if (!items.length) return <p className="text-sm text-muted-foreground">—</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((s) => (
        <span key={s} className={`rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>
          {s}
        </span>
      ))}
    </div>
  );
}

export function ScoreRing({ score, label }: { score: number; label?: string }) {
  const r = 42;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center">
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} className="stroke-muted" strokeWidth="10" fill="none" />
        <circle
          cx="55" cy="55" r={r} fill="none" strokeWidth="10" strokeLinecap="round"
          className={score >= 70 ? "stroke-success" : score >= 45 ? "stroke-accent" : "stroke-destructive"}
          strokeDasharray={c} strokeDashoffset={c - (c * score) / 100} transform="rotate(-90 55 55)"
        />
        <text x="55" y="62" textAnchor="middle" className="fill-foreground font-display text-2xl font-extrabold">
          {score}
        </text>
      </svg>
      {label && <span className="mt-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>}
    </div>
  );
}

export function errMsg(e: unknown) {
  return e instanceof Error ? e.message : "Something went wrong";
}
