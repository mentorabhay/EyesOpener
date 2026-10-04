"use client";
import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { BalanceTest } from "@/components/measure/balance-test";
import { Cover, GlassesOn } from "@/components/measure/cover";
import { DepthTest } from "@/components/measure/depth-test";
import { FourDotTest } from "@/components/measure/four-dot";
import { FusionTest } from "@/components/measure/fusion-test";
import { LetterTest, type LetterResult } from "@/components/measure/letter-test";
import { NearPointTest } from "@/components/measure/near-point";
import { SurveyTest } from "@/components/measure/survey";
import { test as c } from "@/copy/test";
import type { Eye, Screen } from "@/engine";
import type { RunKey } from "../../results";
import css from "../../test.module.css";
import { saveCheckup, type Checkup } from "./actions";

interface Props {
  testKey: RunKey;
  /** The measured screen. Null only for a check-up that draws nothing at true size. */
  screen: Screen | null;
  cyanEye: Eye;
  /** The stronger eye's contrast from the eye profile. */
  contrast: number;
  /** Under 12: a grown-up runs the near point check. */
  young: boolean;
  child: boolean;
}

/**
 * Runs one check-up. The letter tests go left eye then right eye; the glasses tests use both eyes together;
 * the near point and the survey need no drawing, so they begin at once.
 */
export function Runner({ testKey, screen, cyanEye, contrast, young, child }: Props) {
  const [eye, setEye] = useState<Eye>("L");
  /* a test starts on a press, so its random letters are only ever drawn in the browser */
  const [started, setStarted] = useState(false);
  const [left, setLeft] = useState<LetterResult | null>(null);
  const [done, setDone] = useState<Checkup | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function save(result: Checkup) {
    setDone(result);
    setError(null);
    startSaving(async () => setError((await saveCheckup(result)).error));
  }
  const nextEye = (r: LetterResult) => { setLeft(r); setEye("R"); setStarted(false); };
  /** A test that is worn with the glasses: which way round they go, then Start, then the test. */
  const withGlasses = (test: ReactNode) => (
    <>
      <h2>{c.run.both}</h2>
      <GlassesOn cyanEye={cyanEye} />
      {started ? test : <button type="button" className="btn btn-g" onClick={() => setStarted(true)}>{c.run.start}</button>}
    </>
  );

  function body() {
    switch (testKey) {
      case "acuity":
      case "contrast":
        return (
          <>
            <h2>{c.run.eyeHead(eye)}</h2>
            {!started && <Cover eye={eye} />}
            {!started && <button type="button" className="btn btn-g" onClick={() => setStarted(true)}>{c.run.start}</button>}
            {started && <LetterTest key={eye} kind={testKey} screen={screen!} onDone={(r) => (eye === "L" ? nextEye(r) : save({ key: testKey, L: left!, R: r }))} />}
          </>
        );
      case "balance":
        return withGlasses(<BalanceTest gamma={screen!.gamma} onDone={(x) => save({ key: "balance", x, cyanEye })} />);
      case "stereo":
        return withGlasses(<DepthTest screen={screen!} cyanEye={cyanEye} onDone={(r) => save({ key: "stereo", ...r })} />);
      case "fusion_break":
        return withGlasses(<FusionTest screen={screen!} cyanEye={cyanEye} contrast={contrast} onDone={(r) => save({ key: "fusion_break", ...r })} />);
      case "suppression":
        return withGlasses(<FourDotTest ppc={screen!.ppc} onDone={(r) => save({ key: "suppression", ...r })} />);
      case "near_point":
        return <><h2>{c.run.helper}</h2><NearPointTest young={young} onDone={(tries) => save({ key: "near_point", tries })} /></>;
      case "symptoms":
        return <><h2>{c.run.survey}</h2><SurveyTest child={child} onDone={(answers) => save({ key: "symptoms", answers })} /></>;
    }
  }

  return (
    <section className={`c ${css.run}`}>
      {done ? (
        error && !saving ? (
          <>
            <p className="notice" data-b="danger" role="alert">{error}</p>
            <button type="button" className="btn btn-d" onClick={() => save(done)}>{c.run.retry}</button>
          </>
        ) : <p role="status">{c.run.saving}</p>
      ) : body()}
      {!done && <Link href={`/test/${testKey}`} className="btn btn-gh btn-sm">{c.run.back}</Link>}
    </section>
  );
}
