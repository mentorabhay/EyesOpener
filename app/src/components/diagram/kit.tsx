/**
 * The diagram kit (Wave 2, 17 October 2026): show, tell, prove.
 *   show   the shape: the steps, the checks, the grades, who does what
 *   tell   a tap (or Enter, or OK on a remote) on a step opens its sentence in place; Escape or a second tap closes it
 *   prove  the page's own fold at the bottom keeps the full text
 *
 * The contract every shape keeps:
 *  - Data, not drawings: a shape is fed nodes; every word comes from a copy file through texts().
 *  - HTML for text, so a long word or another script wraps instead of overflowing. Lines are drawn by CSS.
 *  - Wide shapes turn to a column below 640 px; text is never shrunk to fit.
 *  - A step that has a sentence is a native <details>: keyboard, screen reader and TV remote all work with no script.
 *  - One motion: the lines draw in once when the diagram first comes into view (components/diagram/motion.tsx),
 *    and nothing moves for reduced motion or when the Look and feel motion setting is calm or off.
 * Server-safe: no hooks, no browser APIs.
 */
import type { CSSProperties, ReactNode } from "react";
import css from "./diagram.module.css";

export type Tone = "go" | "stop" | "warn" | "info";

/** One step, check, grade or outcome. `say` is the sentence a tap opens; `tag` a short label beside the name (a time, a count). */
export interface Node {
  key: string;
  label: ReactNode;
  say?: ReactNode;
  tag?: ReactNode;
  tone?: Tone;
  icon?: ReactNode;
}

/** A node as a box: a <details> when it has a sentence, a plain box when it has none. */
export function Box({ n, className, open }: { n: Node; className?: string; open?: boolean }) {
  const cls = `${css.box}${n.tone ? ` ${css[n.tone]}` : ""}${className ? ` ${className}` : ""}`;
  const head = (
    <>
      {n.icon && <span className={css.icon} aria-hidden="true">{n.icon}</span>}
      <span className={css.label}>{n.label}</span>
      {n.tag && <span className={css.tag}>{n.tag}</span>}
    </>
  );
  if (!n.say) return <div className={cls}><div className={css.head}>{head}</div></div>;
  return (
    <details className={cls} open={open} data-tap>
      <summary className={css.head}>{head}<span className={css.more} aria-hidden="true" /></summary>
      <div className={css.say}>{n.say}</div>
    </details>
  );
}

/** The frame every shape sits in: a name for screen readers, and the mark the draw-in looks for. */
function Frame({ label, kind, children, className }: { label: string; kind: string; children: ReactNode; className?: string }) {
  return (
    <figure className={`${css.frame} ${css[kind]}${className ? ` ${className}` : ""}`} role="group" aria-label={label} data-diagram={kind}>
      {children}
    </figure>
  );
}

/**
 * A straight run of steps, in order. Getting started, a day. A long run stands as a column; with `per`, it stays a
 * row of boxes with arrows, as on the How it works page, broken into rows of at most `per` (a game's steps).
 */
export function Flow({ label, nodes, per }: { label: string; nodes: Node[]; per?: number }) {
  const rows = per ? Array.from({ length: Math.ceil(nodes.length / per) }, (_, r) => nodes.slice(r * per, r * per + per)) : [nodes];
  return (
    <Frame label={label} kind="flow" className={!per && nodes.length > 5 ? css.tall : per ? css.rows : undefined}>
      {rows.map((row, r) => (
        <ol key={r} className={css.row} start={r * (per ?? 0) + 1} style={per ? ({ "--per": per } as CSSProperties) : undefined}>
          {row.map((n, i) => {
            const at = r * (per ?? 0) + i;
            return <li key={n.key} className={css.cell} data-last={i === row.length - 1 || undefined}><span className={css.n} aria-hidden="true">{at + 1}</span><Box n={n} /></li>;
          })}
        </ol>
      ))}
    </Frame>
  );
}

/** A cycle: the last step leads back to the first. `back` says so in words (for example "Then back to Track"). */
export function Loop({ label, nodes, back }: { label: string; nodes: Node[]; back: ReactNode }) {
  return (
    <Frame label={label} kind="loop">
      <ol className={css.row}>
        {nodes.map((n, i) => <li key={n.key} className={css.cell} data-last={i === nodes.length - 1 || undefined}><Box n={n} /></li>)}
      </ol>
      <p className={css.back}><span className={css.backLine} aria-hidden="true" />{back}</p>
    </Frame>
  );
}

/** One check of a gate chain: the question, and where a "no" leads. */
export interface Gate { key: string; ask: Node; fail: Node }

/** Checks in order; the first that fails stops and says why. Every check passed leads to `pass`. Safety. */
export function Gates({ label, gates, pass, failWord }: { label: string; gates: Gate[]; pass: Node; failWord: ReactNode }) {
  return (
    <Frame label={label} kind="gates">
      <ol className={css.chain}>
        {gates.map((g, i) => (
          <li key={g.key} className={css.gate}>
            <span className={css.n} aria-hidden="true">{i + 1}</span>
            <Box n={g.ask} />
            <span className={css.fork}>{failWord}</span>
            <Box n={{ ...g.fail, tone: g.fail.tone ?? "stop" }} className={css.out} />
          </li>
        ))}
        <li className={css.gate} data-pass><span className={css.n} aria-hidden="true">✓</span><Box n={{ ...pass, tone: pass.tone ?? "go" }} /></li>
      </ol>
    </Frame>
  );
}

/** One answer of a decision and where it leads. */
export interface Branch { key: string; answer: ReactNode; to: Node }

/** A question whose answers lead to outcomes. Warning signs, the stop button. */
export function Tree({ label, question, branches }: { label: string; question: Node; branches: Branch[] }) {
  return (
    <Frame label={label} kind="tree">
      <Box n={question} className={css.root} />
      <ul className={css.branches} style={{ ["--n" as string]: branches.length }}>
        {branches.map((b) => (
          <li key={b.key} className={css.branch}><span className={css.answer}>{b.answer}</span><Box n={b.to} /></li>
        ))}
      </ul>
    </Frame>
  );
}

/** One grade of a ladder, with how many items stand on it. */
export interface Rung { key: string; grade: Node; count: number; countLabel: ReactNode; href?: string }

/** Ordered grades with counts, strongest first. Evidence. */
export function Ladder({ label, rungs }: { label: string; rungs: Rung[] }) {
  const top = Math.max(1, ...rungs.map((r) => r.count));
  return (
    <Frame label={label} kind="ladder">
      <ol className={css.rungs}>
        {rungs.map((r) => (
          <li key={r.key} className={css.rung}>
            <Box n={r.grade} />
            <span className={css.bar} aria-hidden="true"><i style={{ width: `${(r.count / top) * 100}%` }} /></span>
            {r.href ? <a className={css.count} href={r.href}>{r.countLabel}</a> : <span className={css.count}>{r.countLabel}</span>}
          </li>
        ))}
      </ol>
    </Frame>
  );
}

/** One lane: who, and what they do. */
export interface Lane { key: string; who: Node; does: Node[] }

/** Who does what, side by side. A counsellor, a sponsor, a family. */
export function Lanes({ label, lanes }: { label: string; lanes: Lane[] }) {
  return (
    <Frame label={label} kind="lanes">
      <div className={css.lanes} style={{ ["--n" as string]: lanes.length }}>
        {lanes.map((l) => (
          <section key={l.key} className={css.lane}>
            <Box n={l.who} className={css.who} />
            <ul className={css.does}>{l.does.map((d) => <li key={d.key}><Box n={d} /></li>)}</ul>
          </section>
        ))}
      </div>
    </Frame>
  );
}

/** One source and the outcomes it leads to. A profile to its programmes. */
export function BranchMap({ label, source, outcomes }: { label: string; source: Node; outcomes: Node[] }) {
  return (
    <Frame label={label} kind="branchmap">
      <div className={css.fan}>
        <Box n={source} className={css.source} />
        <ul className={css.outcomes}>{outcomes.map((o) => <li key={o.key}><Box n={o} /></li>)}</ul>
      </div>
    </Frame>
  );
}

/** One mark on a timeline: when, and what. */
export interface Mark { key: string; at: ReactNode; what: Node }

/** Weeks to scale: marks along a line. A 12-week programme. */
export function Timeline({ label, marks }: { label: string; marks: Mark[] }) {
  return (
    <Frame label={label} kind="timeline">
      <ol className={css.marks}>
        {marks.map((m) => (
          <li key={m.key} className={css.mark}><span className={css.at}>{m.at}</span><span className={css.dot} aria-hidden="true" /><Box n={m.what} /></li>
        ))}
      </ol>
    </Frame>
  );
}

/** Not a shape but a grid of named tiles, each opening its sentence on a tap. The names stay in view: rules, facts. */
export function Tiles({ label, nodes, cols = 3 }: { label: string; nodes: Node[]; cols?: 2 | 3 | 4 }) {
  return (
    <Frame label={label} kind="tiles">
      <ul className={css.tiles} style={{ ["--cols" as string]: cols }}>
        {nodes.map((n) => <li key={n.key}><Box n={n} className={css.tile} /></li>)}
      </ul>
    </Frame>
  );
}
