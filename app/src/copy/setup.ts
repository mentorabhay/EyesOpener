/**
 * Words of Setup (/setup): the steps a person needs before two-eye games, the card that holds a two-eye item until they
 * are done, and the setup link in the sidebar. The rules: src/lib/setup-rules.ts.
 */
import { texts } from "@/i18n/texts";
import type { SetupKey } from "@/lib/setup-rules";

export const setup = texts("copy/setup", "setup", () => ({
  title: "Setup",
  head: (name: string) => `Get ${name} ready to play`,
  sub: "Two-eye games open once the required steps are done. A grown-up does the screen and glasses part once. Each person does their own part.",
  ready: (name: string) => `${name} is set up. Every two-eye game is open.`,
  count: (done: number, of: number) => `${done} of ${of} done`,
  left: (minutes: number) => (minutes <= 1 ? "about a minute left" : `about ${minutes} minutes left`),
  next: "Continue setup",
  nextIs: (step: string) => `Next: ${step}`,
  parts: {
    screen: { title: "This screen and these glasses", sub: "Once for the household. Again when the screen or the glasses change." },
    person: { title: (name: string) => name, sub: "Each person in the family does their own part." },
  },
  required: "Required",
  recommended: "Recommended",
  state: { done: "Done", todo: "To do", again: "Do again", skip: "Not needed" } as Record<string, string>,
  steps: {
    size: { name: "Screen size", what: "A bank card sets the true size of letters and targets.", time: "30 s" },
    gamma: { name: "Brightness curve", what: "How this screen turns a number into light. Makes contrast truer.", time: "1 min" },
    tune: { name: "Glasses tuning", what: "The cyan and red inks for these glasses, so less of each shows through the wrong lens.", time: "2 min" },
    leak: { name: "Leak check", what: "How much still shows through each lens. It suggests which colour the weaker eye sees.", time: "1 min" },
    ink: { name: "Ink balance", what: "How bright red looks next to cyan through these glasses. Makes contrast truer.", time: "1 min" },
    safety: { name: "Safety questions", what: "Four questions for each eye. They say who should see a doctor first.", time: "1 min" },
    eyes: { name: "Eye check, each eye", what: "Finds the weaker eye and sets the size of letters and targets.", time: "4 min" },
    lens: { name: "Lens choice", what: "Which colour the weaker eye sees, and which way to wear the glasses.", time: "30 s" },
    balance: { name: "Balance check-up", what: "How far the stronger eye's picture is dimmed so the two eyes pull equally.", time: "1 min" },
  } satisfies Record<SetupKey, { name: string; what: string; time: string }>,
  why: {
    stale_tune: "Out of date: done before the inks were tuned.",
    lens_changed: "Needed again: the lens choice changed.",
    screen_changed: "Needed again: the screen or the glasses were measured since.",
    at_limit: "The size is at the end of the slider. Most screens are near the middle, so measure it again with a card.",
  } as Record<string, string>,
  open: {
    title: "Open while setup finishes",
    body: "Exercises away from the screen, care logs, the community and Settings. Two-eye games, films and two-eye check-ups wait.",
  },
  doIt: { todo: "Start", again: "Do again", done: "Again", skip: "Look" } as Record<string, string>,
  detail: { noWeak: "No weaker eye was found.", games: "Go to the games" },
  grownUp: "A guardian does the screen and glasses part, and not in child mode.",
  tester: "Staff test household: two-eye items stay open here whatever the setup.",

  /** The card that stands in place of a two-eye scene until setup is done. */
  gate: {
    title: (n: number, name: string) => (n === 1 ? `One step before ${name} plays` : `${n} steps before ${name} plays`),
    sub: "This needs the red-cyan glasses, so setup comes first.",
    cta: (minutes: number) => (minutes <= 1 ? "Finish setup · about a minute" : `Finish setup · about ${minutes} minutes`),
    away: "Do an exercise away from the screen",
    why: "The minutes for today are not used while this card shows. A linked counsellor sees the same steps.",
    screenPart: "this screen and glasses",
  },

  /** On a linked counsellor's page for the member. */
  counsellor: (done: number, of: number, left: string[]) => `Setup: ${done} of ${of} done. Still to do: ${left.join(", ")}. Two-eye games wait until then.`,

  /** The sidebar link while setup is not done. */
  nav: { label: "Setup", ring: (done: number, of: number) => `${done} of ${of}` },
}));
