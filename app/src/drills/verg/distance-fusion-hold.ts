// Eyes Opener: Distance Fusion Hold. For a TV at about 3 m, on a counsellor's plan: the member holds one ring far away while.
/**
 * Distance Fusion Hold. For a TV at about 3 m, on a counsellor's plan: the member holds one ring far away while
 * the demand rises a little at a time. It measures the seconds held as one in all, and the most demand that was
 * held for at least ten seconds (prism dioptres).
 *
 * Ink: the ring is the fusion target, one ring for each eye in that eye's ink, with the left eye's dot at the top
 * and the right eye's at the bottom. The frame, the numbers, the instruction, the bar and the split spot are in
 * both ink. Nothing else is drawn: this drill is counsellor-led, so it is slow and bare.
 *
 * What the demand does: it starts at 0 and stays there for the first 20 seconds. Every 20 seconds held as one at
 * a demand, it rises by 1, half a prism dioptre a second, up to 80% of what the screen can show (the whole
 * number at or under it). A split eases it at once and the clocks wait five seconds before they run again.
 * The member has one control, "it split": there is nothing to press to keep going and no clock to beat.
 * The bar shows the 20 seconds filling.
 */
import { words as t } from "@/copy/drills-verg";
import { W, type GameDef, type Kit } from "@/games/kit";
import { settled } from "@/games/verg/parts";
import { aim, ease, newDemand, ramp, splitPressed, target, type Demand } from "@/games/vergence";
import { ask, bar, cue, pd, plan, span, whole } from "./parts";

interface State {
  d: Demand;
  /** Seconds held as one in all, and at the demand now. */
  total: number; here: number;
  /** Seconds the clocks wait after a split. */
  wait: number;
}

/** Seconds at a demand before it rises, seconds before a demand counts as held, the wait after a split, and the rate of the rise. */
const STEP = 20, HELD = 10, WAIT = 5, RATE = 0.5;
/** The most this drill asks for: 80% of what the screen can show, as a whole number so every demand held is one. */
const most = (k: Kit) => { const top = k.convMax * 0.8; return top >= 1 ? Math.floor(top + 1e-6) : top; };

export const distanceFusionHold: GameDef<State> = {
  init: () => ({ d: newDemand(), total: 0, here: 0, wait: 0 }),

  update(k, s) {
    const d = s.d;
    if (splitPressed(k)) {
      ease(k, d);
      /* The climb waits too: a rise that was under way is dropped, and the demand settles on the whole number below. */
      aim(k, d, Math.floor(d.now + 1e-6));
      s.here = 0;
      s.wait = WAIT;
      return;
    }
    ramp(k, d, RATE);
    if (s.wait > 0) { s.wait -= k.dt; return; }
    s.total += k.dt;
    if (whole(s.total) >= 1) k.report("hold_s", whole(s.total));
    if (!settled(d)) return;
    s.here += k.dt;
    if (s.here >= HELD && pd(d.goal) > 0) k.peak("hold_pd", pd(d.goal));
    if (s.here < STEP || d.goal >= most(k) - 1e-6) return;
    aim(k, d, Math.min(most(k), d.goal + 1));
    s.here = 0;
    k.hit();
    k.add();
  },

  draw(k, s) {
    k.frame();
    const p = plan(k, true), d = s.d;
    target(k, W / 2, p.mid, p.r, d.now);
    k.hud(`${t.far.held} ${span(whole(s.total))} · ${t.turnedIn} ${Math.round(d.now)}`);
    cue(k, p, s.wait > 0 ? t.far.rest : t.keep);
    bar(k, p, d.goal >= most(k) - 1e-6 ? 1 : s.here / STEP);
    ask(k);
  },
};
