/**
 * See Both Lights. Two still lights and a white dot between them, seen through the red-cyan glasses. Now and
 * then a quiet question asks how many lights the member sees. It measures how often both eyes were switched on.
 *
 * Ink: this is what the whole drill rests on. The left light is weaker-eye ink (cyan): only the eye behind the
 * cyan lens can see it. The right light is stronger-eye ink (red, at the member's own contrast): only the eye
 * behind the red lens can see it. Two lights seen means both eyes are on; one light means one eye has switched
 * off. The frame, the white dot to look at and every word are both-eyes ink, so they hold the two eyes together
 * and neither eye can read the question alone.
 *
 * It is counsellor-led, so it is slow and plain: nothing moves, nothing is timed, and no answer is right or
 * wrong. A question comes 8 to 12 seconds after the last answer and stays until it is answered: Left or a tap on
 * the left half for one light, Right or a tap on the right half for two. `checks` is how many questions were
 * answered and `both_pct` the share answered "two", as a whole percent. Both are reported after every answer.
 */
import { words } from "@/copy/drills-skill";
import { W, type GameDef, type Kit } from "@/games/kit";
import { ease } from "@/games/skills/common";
import { area, dim, foot, sayFoot, sided } from "./parts";

const t = words.seeBothLights;
/** A question eases in over `RISE` seconds and can be answered once it has been readable for `READ`. */
const RISE = 0.6, READ = 0.8, ECHO = 1.5;

interface State {
  /** When the question on screen appeared, or null when there is none; and when the next one is due. */
  asked: number | null; next: number;
  checks: number; two: number;
  /** The last answer, shown back for a moment so the member sees what was kept. */
  said: { at: number; two: boolean } | null;
}

const wait = (k: Kit) => k.t + 8 + k.rand() * 4;

function lay(k: Kit) {
  /* The question is the tallest thing the bottom of the scene ever holds, so the lights are placed above it. */
  const ask = foot(k, [t.ask, t.keys]), rest = foot(k, [t.look, t.keep]);
  const a = area(k, Math.min(ask.top, rest.top)), r = Math.max(8, Math.min(22 * k.k, 60, a.h / 2 - 4));
  return { ask, rest, cx: W / 2, cy: a.cy, r, apart: r * 1.9 };
}

export const seeBothLights: GameDef<State> = {
  init: (k) => ({ asked: null, next: wait(k), checks: 0, two: 0, said: null }),

  update(k, s) {
    if (s.asked === null) {
      if (k.t >= s.next) s.asked = k.t;
      return;
    }
    if (k.t - s.asked < READ) return;
    const side = sided(k);
    if (!side) return;
    s.checks++;
    if (side > 0) s.two++;
    k.add();
    k.report("checks", s.checks);
    k.report("both_pct", Math.round((100 * s.two) / s.checks));
    s.said = { at: k.t, two: side > 0 };
    s.asked = null;
    s.next = wait(k);
  },

  draw(k, s) {
    const L = lay(k);
    k.frame();
    k.disc(L.cx - L.apart, L.cy, L.r, "weak");
    k.disc(L.cx + L.apart, L.cy, L.r, "strong");
    k.disc(L.cx, L.cy, Math.max(2.5, Math.min(3 * k.k, L.r * 0.2)), "both");
    if (s.asked !== null) dim(k, "both", ease((k.t - s.asked) / RISE), () => sayFoot(k, L.ask));
    else if (s.said && k.t - s.said.at < ECHO) {
      const said = s.said;
      dim(k, "both", ease((ECHO - (k.t - said.at)) / 0.4), () => sayFoot(k, foot(k, [said.two ? t.two : t.one])));
    } else sayFoot(k, L.rest);
    k.hud(s.checks ? `${t.checks} ${s.checks} · ${t.both} ${k.stats.both_pct}%` : t.ready);
  },
};
