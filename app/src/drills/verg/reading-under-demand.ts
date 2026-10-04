/**
 * Reading Under Demand. The member reads short sentences while the screen holds a turning-in demand.
 * It measures the lines read, lines a minute, and the most demand at which a line was finished (prism dioptres).
 *
 * Ink: the sentence is the fusion target. It is drawn once for each eye in that eye's ink, pulled apart
 * sideways by the demand. The left eye's copy has a small dot above it, the right eye's a small dot below, so
 * "one sentence with a dot above and a dot below" can only be seen with both eyes on and joined. The frame, the
 * numbers, the instruction and the split spot are in both ink.
 *
 * What the demand does: it starts at 0 and creeps, 1 a second, to a goal that rises with the level: about 3 at
 * level 1, up to 70% of what this screen can show at level 10. OK or a tap shows the next sentence and counts a line.
 * A split eases the demand at once, holds it for three seconds, and lowers the goal to just under where it
 * split; each line read after that lets the goal back up a little.
 * The rate is one of the measures, so the clock runs; nothing else hurries the member.
 */
import { words as t } from "@/copy/drills-verg";
import { W, type GameDef, type Kit } from "@/games/kit";
import { single } from "@/games/verg/parts";
import { aim, ease, newDemand, ramp, splitPressed, type Demand } from "@/games/vergence";
import { ask, cue, pd, plan, tenth, wide, type Plan } from "./parts";

interface State {
  d: Demand;
  /** Which sentence is on screen, and how many lines were read. */
  at: number; lines: number;
  /** When the sentence on screen appeared. */
  since: number;
  /** The most demand the member can take for now: lowered by a split, raised a little by each line read. */
  cap: number;
  /** Seconds the demand holds still after a split. */
  wait: number;
}

/** The shortest time in which a sentence can be read, the seconds of play before a rate means anything, and line spacing. */
const SOONEST = 0.6, ENOUGH = 20, LEADING = 1.3;

/** The most demand the drill asks for on this screen, and the goal at this level. */
const most = (k: Kit) => k.convMax * 0.7;
function goal(k: Kit, s: State) {
  const hi = most(k), lo = Math.min(3, hi);
  return Math.min(s.cap, lo + ((hi - lo) * (k.level - 1)) / 9);
}

/**
 * Sets a sentence in one line or two, whichever gives the larger letters, at the member's letter size or
 * smaller when the room is short. `room` is the width one eye's copy may take; `tall` the height for the lines.
 */
export function setLines(k: Kit, text: string, px: number, room: number, tall: number): { lines: string[]; px: number } {
  const sized = (lines: string[]) => {
    const w = Math.max(...lines.map((l) => wide(k, l, px)));
    return { lines, px: Math.min(px, w > room ? (px * room) / w : px, tall / (lines.length * LEADING)) };
  };
  const one = sized([text]), parts = text.split(" ");
  if (one.px >= px || parts.length < 2) return one;
  /* Break where the two halves are most alike in width. */
  let two = one, least = Infinity;
  for (let n = 1; n < parts.length; n++) {
    const pairOf = [parts.slice(0, n).join(" "), parts.slice(n).join(" ")], w = Math.max(wide(k, pairOf[0], px), wide(k, pairOf[1], px));
    if (w < least) { least = w; two = sized(pairOf); }
  }
  return two.px > one.px ? two : one;
}

/** The radius of each eye's dot, and the gap between a dot and the words. */
const dot = (k: Kit, p: Plan) => Math.max(2.5, Math.min(5 * k.k, p.tall * 0.06));

export const readingUnderDemand: GameDef<State> = {
  init(k) {
    const d = newDemand(), s: State = { d, at: Math.floor(k.rand() * t.sentences.length) % t.sentences.length, lines: 0, since: 0, cap: 99, wait: 0 };
    aim(k, d, goal(k, s));
    return s;
  },

  update(k, s) {
    const d = s.d;
    if (splitPressed(k)) {
      const was = d.now;
      ease(k, d);
      aim(k, d, d.now);
      s.cap = Math.max(0, was - 1.5);
      s.wait = 3;
      return;
    }
    s.wait = Math.max(0, s.wait - k.dt);
    if (s.wait <= 0) aim(k, d, goal(k, s));
    ramp(k, d, 1);
    /* A press this soon after a new sentence is a second tap, not a line read. */
    if (single(k) && k.t - s.since >= SOONEST) {
      s.lines++;
      k.add();
      if (s.lines % 3 === 0) k.hit();
      k.report("lines", s.lines);
      if (pd(d.now) > 0) k.peak("hold_pd", pd(d.now));
      s.cap += 0.25;
      s.at = (s.at + 1) % t.sentences.length;
      s.since = k.t;
    }
    /* Lines a minute since the start, kept up to date as play goes on. Not before 20 seconds. */
    if (s.lines > 0 && k.t >= ENOUGH) k.report("lines_per_min", tenth(s.lines / (k.t / 60)));
  },

  draw(k, s) {
    k.frame();
    const p = plan(k), r = dot(k, p), gap = r * 0.8;
    /* One eye's copy must stay inside the frame at the most demand the drill asks for, so the letters never change size as it climbs. */
    const room = W - 44 - k.prismUnits(most(k)), tall = Math.max(8, p.tall - 4 * r - 2 * gap);
    const base = Math.max(k.letter, 20), set = setLines(k, t.sentences[s.at], base, room, tall), n = set.lines.length, lead = set.px * LEADING;
    /* The dots keep their place from one sentence to the next: where a two-line sentence at full size would put them. */
    const reach = Math.min(tall / 2, base * LEADING) + gap + r;
    let first = true;
    k.fuse(s.d.now, (ink, shift) => {
      const x = W / 2 + shift;
      set.lines.forEach((line, i) => k.text(line, x, p.mid - (n * lead) / 2 + lead * (i + 0.5) + set.px * 0.35, ink, set.px, "center"));
      /* The left eye's copy carries its dot above the words, the right eye's below. */
      k.disc(x, first ? p.mid - reach : p.mid + reach, r, ink);
      first = false;
    });
    /* Shown as a whole number, so the line of numbers stays still while the member reads. */
    const rate = "lines_per_min" in k.stats ? ` · ${Math.round(k.stats.lines_per_min)} ${t.read.aMinute}` : "";
    k.hud(`${t.read.lines} ${s.lines}${rate} · ${t.turnedIn} ${Math.round(s.d.now)}`);
    cue(k, p, t.read.read);
    ask(k);
  },
};
