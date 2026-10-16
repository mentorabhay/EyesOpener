/**
 * Shared building blocks for every screen. Server-safe: no hooks, no browser APIs.
 * Styles live in src/app/globals.css (direction B).
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { common } from "@/copy/common";
import { catalogue, evidenceOf, type EvidenceKey } from "@/data";

export type Tone = "ok" | "warn" | "risk" | "danger" | "none" | "grad" | "plain";

export function PageHead({ title, sub, crumb, stats, children }: {
  title: string; sub?: ReactNode; crumb?: { href: string; label: string }[];
  stats?: { value: ReactNode; label: string }[]; children?: ReactNode;
}) {
  return (
    <header className="phead">
      <div>
        {crumb && (
          <nav className="crumb" aria-label={common.spoken.breadcrumb}>
            {crumb.map((c, i) => (<span key={c.href}>{i > 0 && " / "}<Link href={c.href}>{c.label}</Link></span>))}
          </nav>
        )}
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {stats && (
        <div className="stats">
          {stats.map((s) => (
            <div className="hstat" key={s.label}><div className="v tnum">{s.value}</div><div className="l">{s.label}</div></div>
          ))}
        </div>
      )}
      {children}
    </header>
  );
}

export function Card({ title, right, span = 12, tone, children, as: Tag = "section" }: {
  title?: ReactNode; right?: ReactNode; span?: 3 | 4 | 5 | 6 | 7 | 8 | 12; tone?: "dark" | "grad"; children: ReactNode; as?: "section" | "div" | "article";
}) {
  return (
    <Tag className={`c span${span}${tone ? " c-" + tone : ""}`}>
      {(title || right) && (<div className="c-head">{title && <h2>{title}</h2>}{right && <div className="r">{right}</div>}</div>)}
      {children}
    </Tag>
  );
}

export const Chip = ({ tone = "plain", children }: { tone?: Tone; children: ReactNode }) => (
  <span className="chip" data-b={tone}>{children}</span>
);

/** Evidence level of a mechanism, as a chip. Strong levels are green; "measures only" is plain. */
export function EvidenceChip({ level }: { level: EvidenceKey }) {
  const tone: Tone = level === "strong" || level === "sup" ? "ok" : level === "moderate" ? "plain" : level === "limited" ? "warn" : "none";
  return <Chip tone={tone}>{evidenceOf(level).label}</Chip>;
}

export function Btn({ href, kind = "", small, children }: { href: string; kind?: "g" | "d" | "gh" | ""; small?: boolean; children: ReactNode }) {
  return <Link href={href} className={`btn${kind ? " btn-" + kind : ""}${small ? " btn-sm" : ""}`}>{children}</Link>;
}

/** Progress bar. Pass null for "not measured yet": it is drawn hatched. */
export function Progress({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <div className="prog hatched" role="img" aria-label={common.spoken.notMeasuredOf(label)} />;
  const p = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return <div className="prog" role="img" aria-label={common.spoken.percentOf(label, p)}><i style={{ width: p + "%" }} /></div>;
}

/** Hatched placeholder for a value that does not exist yet. */
export const Void = ({ label }: { label?: string }) => <span className="void" role="img" aria-label={label ?? common.spoken.notMeasured} />;

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return <div className="empty"><b>{title}</b>{children}</div>;
}

/** Link-based filter pills: no client code, the choice lives in the URL. */
export function Pills({ items, current, param, base, label }: { items: { key: string; label: string }[]; current: string; param: string; base: string; label?: string }) {
  return (
    <nav className="pills" aria-label={label ?? common.spoken.filter}>
      {items.map((it) => (
        <Link key={it.key} className="pill" aria-current={it.key === current ? "true" : undefined} href={`${base}${base.includes("?") ? "&" : "?"}${param}=${encodeURIComponent(it.key)}`} scroll={false}>{it.label}</Link>
      ))}
    </nav>
  );
}

/** The three rings of the eye day. Shares are 0 to 1. */
export function Rings({ rest, train, light, size = 168 }: { rest: number; train: number; light: number; size?: number }) {
  const ring = (r: number, share: number, colour: string) => {
    const c = 2 * Math.PI * r;
    return (
      <g key={r}>
        <circle cx="60" cy="60" r={r} fill="none" stroke={colour} strokeOpacity=".2" strokeWidth="9" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={colour} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(c * Math.max(0.001, Math.min(1, share))).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 60 60)" />
      </g>
    );
  };
  const pc = (v: number) => Math.round(v * 100);
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={common.spoken.rings(pc(rest), pc(train), pc(light))}>
      {ring(50, rest, "var(--ring-rest)")}{ring(38, train, "var(--ring-train)")}{ring(26, light, "var(--ring-light)")}
    </svg>
  );
}

/** A catalogue thumbnail drawn in the three inks. The red ink follows the member's eye profile. */
export function SceneThumb({ thumb, label }: { thumb: string; label: string }) {
  return (
    <div className="scene ratio">
      <svg viewBox="0 0 160 90" role="img" aria-label={label} dangerouslySetInnerHTML={{ __html: catalogue.thumbs[thumb] ?? "" }} />
    </div>
  );
}
