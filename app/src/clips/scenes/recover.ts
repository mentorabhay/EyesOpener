// Eyes Opener: The recovery-time clip on the game kit: how many seconds the eyes take to make one picture again after a split.
/**
 * The recovery-time clip on the game kit: how many seconds the eyes take to make one picture again after a split.
 *
 * Ink: as in the fusion-range scene. The ring is the fusion target, one ring for each eye in that eye's ink with
 * that eye's own dot; the frame, the words, the bar and the split spot are in both ink.
 *
 * The demand starts at zero and climbs one prism dioptre a second, turning in, inside the kit's limits. When the
 * member says "it split", the demand eases by 2 prism dioptres (the kit's `ease`) and waits there while the clock
 * runs, until the member says "one ring again". If that takes more than 8 seconds it eases by another 2, and the
 * clock stops at 30 seconds whatever happens. Three repeats.
 *
 * What it reports: `tn` the seconds of repeat n, to one decimal; `vn` 1 for a repeat with nothing to time (the
 * screen's limit was reached with no split); `cannot` and `done` as in the fusion-range scene.
 */
import { scenes as t } from "@/copy/clips";
import { ask, bar, cue, pd, plan, tenth } from "@/drills/verg/parts";
import { FUSION_REPEATS } from "@/engine";
import { W, type GameDef } from "@/games/kit";
import { single } from "@/games/verg/parts";
import { aim, ease, newDemand, ramp, splitPressed, target, type Demand } from "@/games/vergence";

interface State {
  d: Demand;
  phase: "ready" | "climb" | "wait" | "home" | "rest" | "done";
  n: number; since: number;
  /** Seconds since the split, and when the demand was last eased. */
  clock: number; eased: number;
  void: boolean;
}

const SETTLE = 0.4, EASE_EVERY = 8;
/** The clock stops here. */
export const RECOVER_MAX = 30;
const arrived = (d: Demand) => Math.abs(d.goal - d.now) < 1e-9;

export const recoverClip: GameDef<State> = {
  init: () => ({ d: newDemand(), phase: "ready", n: 0, since: 0, clock: 0, eased: 0, void: false }),

  update(k, s) {
    const d = s.d, go = (phase: State["phase"]) => { s.phase = phase; s.since = 0; };
    s.since += k.dt;
    if (s.phase === "done") return;

    if (s.phase === "ready" || s.phase === "rest") {
      if (splitPressed(k) && s.since > SETTLE) { k.report("cannot", 1); k.report("done", 1); go("done"); return; }
      if (s.phase === "rest" && s.n >= FUSION_REPEATS) { k.report("done", 1); go("done"); return; }
      if (single(k) && s.since > SETTLE) { s.void = false; aim(k, d, k.convMax); go("climb"); }
      return;
    }
    if (s.phase === "climb") {
      if (splitPressed(k) && s.since > SETTLE && pd(d.now) > 0) {
        ease(k, d);
        aim(k, d, d.now);
        s.clock = 0; s.eased = 0;
        go("wait");
        return;
      }
      ramp(k, d, 1);
      if (arrived(d)) { s.n += 1; k.report(`v${s.n}`, 1); s.void = true; aim(k, d, 0); go("home"); }
      return;
    }
    if (s.phase === "wait") {
      s.clock += k.dt;
      const joined = single(k) && s.since > SETTLE;
      if (joined || s.clock >= RECOVER_MAX) {
        s.n += 1;
        k.report(`t${s.n}`, tenth(Math.min(RECOVER_MAX, s.clock)));
        aim(k, d, 0);
        go("home");
        return;
      }
      /* still two after a while: let go a little more, and keep the clock running */
      if (s.clock - s.eased >= EASE_EVERY && Math.abs(d.now) > 0) { ease(k, d); aim(k, d, d.now); s.eased = s.clock; }
      return;
    }
    ramp(k, d, 2);
    if (arrived(d)) go("rest");
  },

  draw(k, s) {
    k.frame();
    const p = plan(k, true);
    target(k, W / 2, p.mid, p.r, s.d.now);
    const repeat = Math.min(FUSION_REPEATS, s.n + (s.phase === "rest" || s.phase === "done" || s.phase === "home" ? 0 : 1));
    k.hud(s.phase === "done" ? t.done : t.repeat(Math.max(1, repeat), FUSION_REPEATS));
    cue(k, p, s.phase === "done" ? (k.stats.cannot ? t.cannot : t.finished)
      : s.phase === "ready" ? t.ready
        : s.phase === "wait" ? t.again
          : s.phase === "rest" ? (s.void ? t.atLimit : t.rest)
            : s.phase === "home" ? (s.void ? t.atLimit : t.home) : t.keep);
    bar(k, p, s.phase === "wait" ? s.clock / RECOVER_MAX : 0);
    ask(k);
  },
};
