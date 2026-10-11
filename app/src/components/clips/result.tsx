// Eyes Opener: What a finished clip found, in plain words: the number with its unit, how to read it, and how it is used.
"use client";
/**
 * What a finished clip found, in plain words: the number with its unit, how to read it, and how it is used.
 * Every value shown here came back from the server, which worked it out from what the browser measured.
 */
import Link from "next/link";
import { clips as c, meaningOf, reading, usedFor } from "@/copy/clips";
import { screen as t } from "@/copy/screen";
import { LOOKS, clipTest, type OfferedClip } from "@/data/clips";
import type { ClipCtx, ClipSaved } from "@/lib/clips";
import css from "./clips.module.css";
import { fillEyes } from "./look";

type Saved = Extract<ClipSaved, { ok: true }>;
const TONE = { saved: "ok", pass: "ok", note: undefined, fail: "warn", na: undefined } as const;
const num = (v: unknown) => (typeof v === "number" ? v : 0);

export function ClipResult({ def, ctx, saved }: { def: OfferedClip; ctx: ClipCtx; saved: Saved }) {
  const { outcome, say, results, detail, screen } = saved, play = def.play, store = def.store;
  const look = play.template === "look" ? LOOKS[play.scene] : null;
  const advice = look && (outcome === "pass" || outcome === "note" || outcome === "fail") ? look.advice[outcome] : "";
  const checkup = store.to === "result" ? store.keys.map((k) => clipTest(k)).find((x) => x?.checkup) : undefined;
  const lines: string[] = [];

  if (say === "other_lens") lines.push(c.says.other_lens(detail.lens === "red" ? "red" : "cyan", t.pct(num(detail.leak))));
  else if (say === "finer" || say === "coarser" || say === "never_split" || say === "out_of_range") lines.push(c.says[say]);
  else if (store.to === "screen" && screen) {
    if (store.field === "size") lines.push(c.measure.sizeSaved(screen.ppc), c.measure.recheck);
    if (store.field === "distance") lines.push(c.measure.distSaved(screen.dist), c.measure.recheck);
    if (store.field === "gamma") lines.push(t.gamma.result(screen.gamma));
    if (store.field === "ink" && screen.ink !== null) lines.push(t.ink.result(screen.ink), t.ink.means);
    if (store.field === "leak" && screen.leak) {
      lines.push(t.leak.result.red(screen.leak.red), t.leak.result.cyan(screen.leak.cyan));
      if (play.template === "match" && play.kind === "leak_both") lines.push(ctx.leak ? `${c.match.last}: ${t.leak.result.red(ctx.leak.red)} ${t.leak.result.cyan(ctx.leak.cyan)}` : c.match.lastNone);
    }
  } else if (play.template === "auto" && play.kind === "frames") {
    lines.push(c.auto.frames(String(num(detail.fps)), t.pct(num(detail.late))));
    if (outcome === "pass" || outcome === "note" || outcome === "fail") lines.push(c.auto.framesTone[outcome]);
  } else if (play.template === "auto") lines.push(c.auto.depthStep(String(Math.round(num(detail.arcsec)))), c.auto.depthHow);
  else if (play.template === "camera" && play.kind === "scale") lines.push(c.camera.scale.ok(num(detail.atCm), Math.round(num(detail.readCm))));
  if (play.template === "grid" && results[0]) lines.push(results[0].value > 0 ? c.grid.warn : c.grid.none);
  if (play.template === "choose" && play.kind === "dots") lines.push(c.choose.noSettings);

  return (
    <div className={css.res}>
      <h2>{look ? c.result.lookHead[outcome] : results.length || store.to !== "result" ? c.outcome[outcome] : c.runner.notSaved}</h2>
      {advice && <p className="notice" data-b={TONE[outcome]}>{fillEyes(advice, ctx.cyanEye)}</p>}
      {results.length > 0 && (
        <dl className="kv">
          {results.map((r) => {
            const test = clipTest(r.key)!;
            return (
              <div key={`${r.key}${r.eye ?? ""}`}>
                <dt>{test.name}{r.eye && `, ${c.runner.eye(r.eye).toLowerCase()}`}</dt>
                <dd className="tnum">{reading(r.key, test.unit, r.value, r.note)}<small>{meaningOf(r.key, test.unit)}</small></dd>
              </div>
            );
          })}
        </dl>
      )}
      {lines.map((line) => <p key={line}>{line}</p>)}
      {(results.length > 0 || store.to !== "result") && !say && <p className="muted small"><b>{c.result.usedFor}.</b> {usedFor(store, def.code)}</p>}
      <p className="muted small">{c.estimate}</p>
      <div className={css.acts}>
        {checkup && results.length > 0 && <Link className="btn btn-sm" href={`/test/${checkup.key}`}>{c.result.openHistory}</Link>}
        {store.to === "screen" && store.field !== "size" && store.field !== "distance" && <Link className="btn btn-sm" href="/settings/screen">{c.result.screenPage}</Link>}
      </div>
    </div>
  );
}
