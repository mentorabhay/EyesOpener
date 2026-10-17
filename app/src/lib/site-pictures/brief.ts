// Turns a picture's brief into the words an image model is asked with. Pure.
import type { Brief } from "@/copy/pictures";

export interface Common { glasses: string; screen: string; camera: string; style: string; styleAway: string }

const glassesIn = (b: Brief) => /red-cyan glasses/i.test(`${b.action} ${b.people}`);
/* a brief that says what its own screen shows keeps it; one with only the glow of a television has none */
const screenIn = (b: Brief) => /\b(laptop|tablet|screen)\b/i.test(`${b.action} ${b.props}`) && !/glow of the television/i.test(b.setting) && !/(on the screen, only|showing)/i.test(b.props);

/**
 * One description, in the order a picture is read: the frame, the people, where they look, what they do, the place,
 * the light, the things in view, then the house rules (the glasses, the screen, the camera, the look) and what to leave out.
 */
export function promptOf(b: Brief, c: Common, shape: "16:9" | "4:3", place: "home" | "away" = "home"): string {
  return [
    `A landscape photo, ${shape}.`,
    b.people, b.facing, b.action, b.setting, b.light, b.props,
    glassesIn(b) ? c.glasses : "",
    screenIn(b) ? c.screen : "",
    c.camera, place === "away" ? c.styleAway : c.style,
    `Leave out: ${b.avoid.charAt(0).toLowerCase()}${b.avoid.slice(1).replace(/\.$/, "")}.`,
  ].filter(Boolean).join(" ");
}
