// Eyes Opener: Words of the step strips at the top of a page (src/components/guide/flow.tsx) and of the folded details at the.
/**
 * Words of the step strips at the top of a page (src/components/guide/flow.tsx) and of the folded details at the
 * bottom (src/components/guide/more.tsx). A strip shows what to do in three to six short steps; the full text of a
 * page sits folded under "Read more".
 */
import { texts } from "@/i18n/texts";
import type { Eye } from "@/engine";

const side = (e: Eye) => (e === "L" ? "left" : "right");
const other = (e: Eye) => (e === "L" ? "right" : "left");

export const guide = texts("copy/guide", "guide", () => ({
  how: "How it works",
  step: (n: number, of: number) => `Step ${n} of ${of}`,
  pause: "Pause the steps",
  play: "Play the steps",
  watch: "Watch the steps",
  more: "Read more",
  moreAbout: (what: string) => `Read more about ${what}`,
  moreHint: "Everything else about this page",

  /** A game: glasses, the moments to act, and the stop button. */
  game: {
    glasses: "Glasses on",
    glassesWay: (cyan: Eye) => `Cyan lens over your ${side(cyan)} eye, red over your ${other(cyan)} eye.`,
    patch: "Patch or glasses on",
    patchText: "A patch goes over the stronger eye.",
    stop: "Feel unwell? Stop",
    stopText: "Press \"Stop, I feel unwell\" and rest your eyes.",
    glassesMore: "About the glasses",
  },

  /** An exercise: get ready, the steps of the routine, then the numbers. */
  exercise: {
    ready: "Get ready",
    record: "Save your numbers",
    recordText: "Type them in after the routine, or the tool keeps them.",
  },

  /** The check-ups page. */
  checkups: [
    { title: "Pick one that is due", text: "Due check-ups are marked in amber." },
    { title: "Follow the screen", text: "Each step says what to do." },
    { title: "See the change", text: "Each result sits beside your first one." },
  ],

  /** One check-up, before and while it runs. */
  run: {
    cover: (e: Eye) => ({ title: `Cover your ${other(e)} eye`, text: "Use your palm. Do not press." }),
    letter: { title: "Which way does the E point?", text: "Use the arrows. Not sure? Press the middle button." },
    faint: { title: "Which way does the E point?", text: "It gets fainter after each right answer." },
    swap: { title: "Then the other eye", text: "Swap hands and do the same." },
    glasses: (cyan: Eye) => ({ title: "Glasses on", text: `Cyan lens over your ${side(cyan)} eye.` }),
    balance: { title: "Pick the stronger letter", text: "Two letters overlap. Tap the one that looks stronger." },
    depth: { title: "Find the ring that floats", text: "One of four rings looks nearer. Tap it." },
    fusionCheck: { title: "One ring, two dots?", text: "Check that each eye sees its dot." },
    fusionSplit: { title: "Press when it splits", text: "Keep it as one ring for as long as you can." },
    fusionJoin: { title: "Press when it joins", text: "The rings come back together." },
    dots: { title: "Count the dots", text: "Say how many dots you see, and their colours." },
    pen: { title: "Hold a pen at arm's length", text: "A helper moves it slowly toward your nose." },
    double: { title: "Say when it doubles", text: "The helper measures the distance with a ruler." },
    typeIt: { title: "Type the three tries", text: "In centimetres, from the bridge of the nose." },
    questions: { title: "Answer fifteen questions", text: "About reading and close work. No right answers." },
    saved: { title: "It is saved", text: "Set beside your first result." },
  },

  /** The clip library and one clip. */
  clips: [
    { title: "Pick a set or a clip", text: "A set runs several clips in a row." },
    { title: "Follow each step", text: "Short, guided, one thing at a time." },
    { title: "It is kept", text: "On this screen, or in your results." },
  ],
  clip: {
    need: "Get ready",
    run: { title: "Press Start", text: "Follow the steps in the box below." },
    kept: { title: "It is kept", text: "Your answer is saved for this screen or your results." },
  },
  clipSet: [
    { title: "Press Start", text: "The clips play one after another." },
    { title: "Answer each one", text: "Each clip checks one thing." },
    { title: "Stop at any point", text: "What you finished is saved." },
  ],

  /** Setup and Settings: the steps before two-eye games. */
  setup: {
    flow: "Your setup steps",
  },

  /** The pages of Settings. */
  screen: [
    { title: "Measure the screen", text: "Hold a bank card against it." },
    { title: "Tune each lens", text: "Make each colour vanish through the wrong lens." },
    { title: "Three short checks", text: "Brightness, leak and ink balance." },
  ],
  lens: [
    { title: "Glasses on", text: "Look through one lens at a time." },
    { title: "Pick the weaker eye's colour", text: "Cyan is usual. Red if it leaks less here." },
    { title: "Save", text: "Games draw the inks the new way." },
  ],
  triage: [
    { title: "Answer for each eye", text: "Four short questions." },
    { title: "Any yes?", text: "An eye doctor comes before training." },
    { title: "All no?", text: "Pick a programme and start." },
  ],
  profile: [
    { title: "Type a name", text: "A first name or a nickname is enough." },
    { title: "Add the birth year", text: "It decides what is safe at that age." },
    { title: "Switch to them", text: "Each person has their own record." },
  ],

  /** The lists of games and exercises, and the cinema. */
  games: [
    { title: "Pick a game", text: "Strongest evidence comes first." },
    { title: "Glasses on, press Play", text: "The clock runs only while you play." },
    { title: "See your numbers", text: "Each game shows what it measured." },
  ],
  exercises: [
    { title: "Pick a routine", text: "Each says what to have ready." },
    { title: "Follow the steps", text: "One action at a time." },
    { title: "Save your numbers", text: "Your record grows with each session." },
  ],
  cinema: [
    { title: "Choose a film", text: "From this device, or the test reel." },
    { title: "Glasses on", text: "Both eyes see it; the stronger eye sees it fainter." },
    { title: "Rest at each break", text: "Look far away for 20 seconds." },
  ],
}));
