import type { ReactNode } from "react";
import { onboarding } from "@/copy/onboarding";
import { EYE_NAME, LETTER_MULTIPLE, TARGET_MULTIPLE, percent, strongInk, type Derived } from "@/engine";
import css from "./onboarding.module.css";

const s = onboarding.settings;

/** The eye settings with where each one comes from. `ppc` adds sizes in pixels for this screen. */
export function Settings({ d, ppc, gamma, warn }: { d: Derived; ppc?: number; gamma?: number; warn: boolean }) {
  const size = (cm: number) => `${(cm * 10).toFixed(1)} mm` + (ppc ? ` · ${Math.max(1, Math.round(cm * ppc))} px` : "");
  const rows: [string, ReactNode, string][] = [
    [s.weak, d.weak ? EYE_NAME[d.weak] : s.noWeak, s.weakFrom],
    [s.lens, s.lensWhere(d.weak ? d.cyanEye : null), d.flags.ownGlasses ? s.lensOwn : s.lensFrom],
    [s.contrast, <span className={css.ink} key="ink"><i style={{ background: strongInk(d.con, gamma) }} />{percent(d.con)}</span>, s.contrastFrom[d.conSource]],
    [s.letter, size(d.letterCm), s.letterFrom(LETTER_MULTIPLE)],
    [s.target, size(d.targetCm), s.targetFrom(TARGET_MULTIPLE)],
    [s.text, `${d.appPx} px`, s.textFrom],
    [s.faint, d.faint ? s.faintOn : s.faintOff, s.faintFrom],
    [s.opens, s.programme[d.opens][0], s.programme[d.opens][1]],
  ];
  return (
    <>
      {warn && d.flags.stop && <p className="notice" data-b="danger">{s.doctorFirst}</p>}
      <dl className="kv">
        {rows.map(([name, value, from]) => (<div key={name}><dt>{name}</dt><dd className="tnum">{value}<small>{from}</small></dd></div>))}
      </dl>
    </>
  );
}
