// Eyes Opener: Core system module providing logic and utilities for setup.
import Link from "next/link";
import { setup as t } from "@/copy/setup";
import { minutesLeft, missing } from "@/lib/setup-rules";
import type { Setup } from "@/lib/setup";
import css from "./setup.module.css";

/** A small ring that fills as the required steps are done. A plain colour, not a gradient: a gradient defined in the hidden sidebar would not paint on a phone. */
export function Ring({ done, of, size = 30 }: { done: number; of: number; size?: number }) {
  const r = 12, c = 2 * Math.PI * r, share = of ? done / of : 1;
  return (
    <svg className={css.ring} width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r={r} fill="none" stroke="var(--line)" strokeWidth="4" />
      <circle cx="15" cy="15" r={r} fill="none" stroke="var(--g1)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${c * share} ${c}`} transform="rotate(-90 15 15)" />
    </svg>
  );
}

/** The sidebar's setup link, at the top while setup is not done. */
export function SetupLink({ s }: { s: Setup }) {
  return (
    <Link href="/setup" className={css.side}>
      <Ring done={s.done} of={s.of} />
      <span><b>{t.nav.label}</b><small>{t.count(s.done, s.of)}</small></span>
    </Link>
  );
}

/** The same on a phone, where the sidebar is hidden: a slim bar at the top of each page. */
export function SetupBar({ s }: { s: Setup }) {
  return (
    <Link href="/setup" className={css.bar}>
      <Ring done={s.done} of={s.of} size={24} />
      <span><b>{t.nav.label}</b> · {t.count(s.done, s.of)}</span>
      <span className={css.go}>{t.next}</span>
    </Link>
  );
}

/**
 * Stands in place of a two-eye scene until the person's setup is done: the steps still to do, a link to finish them and
 * a way to something that needs no glasses. The dose is not touched while it shows.
 */
export function SetupGate({ s, name }: { s: Setup; name: string }) {
  const left = missing(s.steps);
  return (
    <section className={`c ${css.gate}`} aria-labelledby="setup-gate">
      <div>
        <h2 id="setup-gate">{t.gate.title(left.length, name)}</h2>
        <p className="muted">{t.gate.sub}</p>
      </div>
      <ol className={css.left}>
        {left.map((st) => (
          <li key={st.key}>
            <span><b>{t.steps[st.key].name}</b>{st.part === "screen" && <span className="muted"> · {t.gate.screenPart}</span>}</span>
            <span className="muted small">{t.steps[st.key].time}</span>
          </li>
        ))}
      </ol>
      <div className="row">
        <Link href={s.next?.href ?? "/setup"} className="btn btn-g">{t.gate.cta(minutesLeft(s.steps))}</Link>
        <Link href="/train/exercises" className="btn">{t.gate.away}</Link>
      </div>
      <p className="muted small">{t.gate.why}</p>
    </section>
  );
}
