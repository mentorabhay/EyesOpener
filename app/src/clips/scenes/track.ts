// Eyes Opener: The tracking clip on the game kit: a ring glides along a smooth looping path and the member keeps a pointer on it.
/**
 * The tracking clip on the game kit: a ring glides along a smooth looping path and the member keeps a pointer on it.
 * It measures the share of the time the pointer was on the ring. That is the hand and the eyes working together:
 * a web page cannot see where the eyes point.
 *
 * Ink: no glasses are worn, so everything is both-eyes ink: the ring, the pointer, the bar and the words.
 * No other ink is used.
 *
 * Moving the pointer: a finger or a mouse puts it where they are; the four arrows move it at a steady pace.
 * The clock starts the first time the pointer touches the ring and runs for the set time. Nothing speeds up,
 * nothing is lost by slipping off: the ring simply glides on. The path is two slow sine waves, so the ring never
 * jumps and never stops, and it moves slower for a member who asked for reduced motion.
 *
 * What it reports: `on` the percent of the time on the ring, `secs` the seconds timed, and `done`.
 */
import { scenes as t } from "@/copy/clips";
import { H, W, type GameDef, type Kit } from "@/games/kit";

interface State {
  /** The pointer, in scene units, and where a finger or a mouse was last seen. */
  x: number; y: number; seenX: number; seenY: number;
  /** True once the member has moved the pointer, and once it has then touched the ring: the clock runs. */
  moved: boolean; going: boolean;
  /** Seconds timed, and seconds of them on the ring. */
  time: number; on: number;
  /** The clock of the path, slowed for reduced motion. */
  path: number;
  finished: boolean;
}

/** Seconds for one sweep sideways and one sweep up and down, and the pointer's speed under the arrow keys in units a second. */
const ACROSS = 11, UPDOWN = 7, KEY_SPEED = 240;

const radius = (k: Kit) => Math.max(26, Math.min(44, 30 * k.k));
const top = (k: Kit) => 30 + k.letter + 10;
function ringAt(k: Kit, path: number) {
  const r = radius(k), y0 = top(k) + r, y1 = H - 34 - r;
  return {
    x: W / 2 + (W / 2 - 30 - r) * Math.sin((2 * Math.PI * path) / ACROSS),
    y: (y0 + y1) / 2 + ((y1 - y0) / 2) * Math.sin((2 * Math.PI * path) / UPDOWN + 1),
    r,
  };
}

export function trackClip(seconds: number): GameDef<State> {
  return {
    init: (k) => ({ x: W / 2, y: H / 2, seenX: k.input.x, seenY: k.input.y, moved: false, going: false, time: 0, on: 0, path: 0, finished: false }),

    update(k, s) {
      if (s.finished) return;
      const i = k.input;
      /* a finger or a mouse that moved takes the pointer with it; the arrow keys move it from wherever it is */
      if (i.tapped || i.x !== s.seenX || i.y !== s.seenY) { s.x = s.seenX = i.x; s.y = s.seenY = i.y; s.moved = true; }
      if (i.dx || i.dy) {
        s.moved = true;
        s.x = Math.max(12, Math.min(W - 12, s.x + i.dx * KEY_SPEED * k.dt));
        s.y = Math.max(12, Math.min(H - 12, s.y + i.dy * KEY_SPEED * k.dt));
      }
      s.path += k.dt * k.slow;
      const ring = ringAt(k, s.path), touching = Math.hypot(s.x - ring.x, s.y - ring.y) <= ring.r;
      /* the clock waits for the member: a pointer that was never moved does not start it */
      if (!s.going) { if (touching && s.moved) s.going = true; else return; }
      s.time += k.dt;
      if (touching) s.on += k.dt;
      k.report("secs", Math.min(seconds, Math.floor(s.time)));
      k.report("on", Math.round((100 * s.on) / Math.max(s.time, 1e-6)));
      if (s.time >= seconds) { s.finished = true; k.hit(); k.report("done", 1); }
    },

    draw(k, s) {
      k.frame();
      const ring = ringAt(k, s.path), touching = Math.hypot(s.x - ring.x, s.y - ring.y) <= ring.r;
      k.ring(ring.x, ring.y, ring.r, "both", touching ? 7 : 3);
      k.disc(ring.x, ring.y, 3, "both");
      /* the pointer: a small cross, so it never hides the middle of the ring */
      k.line(s.x - 9, s.y, s.x + 9, s.y, "both", 3);
      k.line(s.x, s.y - 9, s.x, s.y + 9, "both", 3);
      k.hud(s.finished ? t.done : s.going ? t.onRing(k.stats.on ?? 0) : t.trackStart);
      /* a thin bar along the bottom fills as the time passes */
      k.box(22, H - 26, W - 44, 8, "both", false, 2);
      if (s.time > 0) k.box(22, H - 26, (W - 44) * Math.min(1, s.time / seconds), 8, "both");
    },
  };
}
