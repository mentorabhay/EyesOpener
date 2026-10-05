/**
 * The hold clips on the game kit: one ring is pulled in to a set demand and held as one for a set time.
 *
 * Ink: as in the fusion-range scene. The ring is the fusion target, one ring for each eye in that eye's ink with
 * that eye's own dot; the frame, the words, the bar and the split spot are in both ink.
 *
 * The demand starts at zero, waits for the member's "ready", then climbs one prism dioptre a second to the set
 * demand (never past what the screen has room for). The clock runs from the moment it gets there. A split at any
 * time ends the clip: the demand eases at once and glides home. The clock only counts up; nothing is lost by
 * stopping early.
 *
 * What it reports: `held` the whole seconds held at the set demand before the first split (0 when it split on the
 * way there), `demand` the demand that was really set, `cannot` and `done`.
 */
import { scenes as t } from "@/copy/clips";
import { ask, bar, cue, pd, plan, span, whole } from "@/drills/verg/parts";
import { W, type GameDef } from "@/games/kit";
import { settled, single } from "@/games/verg/parts";
import { aim, ease, newDemand, ramp, splitPressed, target, type Demand } from "@/games/vergence";

interface State { d: Demand; phase: "ready" | "climb" | "hold" | "home" | "done"; since: number; clock: number }

const SETTLE = 0.4;

export function holdClip(demand: number, seconds: number): GameDef<State> {
  return {
    init: () => ({ d: newDemand(), phase: "ready", since: 0, clock: 0 }),

    update(k, s) {
      const d = s.d, go = (phase: State["phase"]) => { s.phase = phase; s.since = 0; };
      const goal = Math.max(0, Math.min(Math.floor(k.convMax + 1e-6), Math.round(demand)));
      s.since += k.dt;
      if (s.phase === "done") return;
      if (s.phase === "ready") {
        if (splitPressed(k) && s.since > SETTLE) { k.report("cannot", 1); k.report("done", 1); go("done"); return; }
        if (single(k) && s.since > SETTLE) { k.report("demand", pd(goal)); k.report("held", 0); aim(k, d, goal); go("climb"); }
        return;
      }
      if (s.phase === "climb" || s.phase === "hold") {
        if (splitPressed(k) && s.since > SETTLE) { ease(k, d); aim(k, d, 0); go("home"); return; }
        ramp(k, d, 1);
        if (s.phase === "climb") { if (settled(d)) go("hold"); return; }
        s.clock += k.dt;
        k.report("held", Math.min(seconds, whole(s.clock)));
        if (s.clock >= seconds) { aim(k, d, 0); go("home"); }
        return;
      }
      ramp(k, d, 2);
      if (Math.abs(d.now) < 1e-9) { d.now = d.goal = 0; k.report("done", 1); go("done"); }
    },

    draw(k, s) {
      k.frame();
      const p = plan(k, true);
      target(k, W / 2, p.mid, p.r, s.d.now);
      k.hud(`${t.pull} ${Math.round(Math.abs(s.d.goal))} · ${t.held} ${span(Math.min(seconds, whole(s.clock)))}`);
      cue(k, p, s.phase === "done" ? (k.stats.cannot ? t.cannot : t.finished) : s.phase === "ready" ? t.ready : s.phase === "home" ? t.home : s.phase === "hold" ? t.holdIt : t.keep);
      bar(k, p, s.clock / seconds);
      ask(k);
    },
  };
}
