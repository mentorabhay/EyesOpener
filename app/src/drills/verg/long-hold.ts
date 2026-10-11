// Eyes Opener: Long Hold. The member picks a demand and holds one ring there for two minutes.
/**
 * Long Hold. The member picks a demand and holds one ring there for two minutes.
 * It measures the longest unbroken hold (seconds) and the demand of that hold (prism dioptres).
 *
 * Ink: the ring is the fusion target, one ring for each eye in that eye's ink, with the left eye's dot at the top
 * and the right eye's at the bottom. The frame, the numbers, the instruction, the bar and the split spot are in
 * both ink.
 *
 * What the demand does: it starts at 0. Up, or a tap in the top half, asks for 1 more; Left, or a tap in the
 * bottom half away from the split spot, asks for 1 less (Down is kept for "it split"). The drawn demand creeps to
 * what was asked, 1 a second. Once it is there and above zero, the hold clock runs and the bar fills toward two
 * minutes. Changing the demand starts a new hold. A split eases the demand and the clock starts again.
 * At two minutes the hold is complete: the demand glides back to rest and the member may start another.
 * The clock only counts up: there is nothing to beat and no penalty for stopping.
 */
import { words as t } from "@/copy/drills-verg";
import { H, W, type GameDef } from "@/games/kit";
import { settled } from "@/games/verg/parts";
import { aim, ease, newDemand, onSplitSpot, ramp, splitPressed, target, type Demand } from "@/games/vergence";
import { ask, bar, cue, pd, plan, span, whole } from "./parts";

interface State {
  d: Demand;
  /** Seconds of the hold now running. */
  clock: number;
  /** True once a two-minute hold is complete, until the member asks for a demand again. */
  done: boolean;
}

/** Seconds in a full hold. */
const FULL = 120;

export const longHold: GameDef<State> = {
  init: () => ({ d: newDemand(), clock: 0, done: false }),

  update(k, s) {
    const d = s.d, i = k.input;
    if (splitPressed(k)) {
      ease(k, d);
      s.clock = 0;
      return;
    }
    const tap = i.tapped && !onSplitSpot(k);
    const more = i.pressed.has("up") || (tap && i.y < H / 2), less = i.pressed.has("left") || (tap && i.y >= H / 2);
    if (more || less) {
      /* Whole steps, from rest up to the most this screen can show. */
      const asked = Math.max(0, Math.min(Math.floor(k.convMax + 1e-6), Math.round(d.goal) + (more ? 1 : -1)));
      if (asked !== d.goal) { aim(k, d, asked); s.clock = 0; s.done = false; }
    }
    ramp(k, d, 1);
    if (s.done || d.goal <= 0 || !settled(d)) return;
    s.clock += k.dt;
    /* A hold is recorded from its first full second. The demand recorded is the one of the longest hold. */
    const sec = Math.min(FULL, whole(s.clock)), best = k.stats.hold_s ?? 0;
    if (sec >= 1 && (sec > best || (sec === best && d.goal > (k.stats.hold_pd ?? 0)))) {
      k.peak("hold_s", sec);
      k.report("hold_pd", pd(d.goal));
    }
    if (s.clock < FULL) return;
    k.hit();
    k.add();
    s.done = true;
    aim(k, d, 0);
  },

  draw(k, s) {
    k.frame();
    const p = plan(k, true), d = s.d;
    target(k, W / 2, p.mid, p.r, d.now);
    const best = "hold_s" in k.stats ? ` · ${t.hold.best} ${span(k.stats.hold_s)}` : "";
    k.hud(`${t.hold.at} ${Math.round(d.goal)} · ${t.hold.held} ${span(Math.min(FULL, whole(s.clock)))}${best}`);
    cue(k, p, s.done ? t.hold.done : d.goal <= 0 ? t.hold.more : t.keep);
    bar(k, p, s.clock / FULL);
    ask(k);
  },
};
