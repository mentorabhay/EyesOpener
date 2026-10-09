/**
 * Words for the screen colour checks (Settings, "This screen's colours").
 * Three measurements a grown-up makes by eye: the brightness curve, the colour leak and the ink balance; then the inks
 * can be tuned for the glasses, one setting for each lens (src/engine/tune.ts).
 * Figures quoted as "for comparison" come from the sources named beside them; the maths is in src/engine/calibrate.ts.
 */
import type { LeakLevel } from "@/engine";
import { texts } from "@/i18n/texts";

const pct = (share: number) => (share > 0 && share < 0.005 ? "under 1%" : `${Math.round(share * 100)}%`);
const times = (n: number) => (n >= 9.5 ? String(Math.round(n)) : n.toFixed(1));
/** "Aarav", "Aarav and Dadi", "Aarav, Dadi and Priya". */
const names = (list: string[]) => (list.length < 2 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}`);

export const screen = texts("copy/screen", "screen", () => ({
  title: "This screen's colours",
  crumb: "Settings",
  sub: "Three short checks for a grown-up, and a setting for each lens of your red-cyan glasses. They make contrast on this screen match the eye settings, and keep the two eyes' pictures apart as well as these glasses allow.",
  pct,

  /** The three checks, in the order they are done. */
  steps: {
    gamma: { name: "Brightness curve", what: "How this screen turns a number into light. Every contrast the app draws uses it.", glasses: "No glasses" },
    leak: { name: "Colour leak", what: "How much of one eye's picture slips through the other eye's lens.", glasses: "Glasses, one eye at a time" },
    ink: { name: "Ink balance", what: "How bright the red pictures look next to the cyan ones through these glasses.", glasses: "Glasses, both eyes" },
    tune: { name: "Tune the inks for these glasses", what: "Changes the two inks so that less of each one shows through the wrong lens.", glasses: "Glasses, one eye at a time" },
  },

  noScreen: {
    title: "Measure the size of this screen first",
    body: "Onboarding measures the screen with a bank card and asks how far you sit from it. The colour checks come after that.",
    cta: "Go to onboarding",
  },
  lookOnly: "You can see what was measured. A guardian does the measuring, and not in child mode.",
  /** For pages that show two-eye scenes, when the leak is too high for the active profile. The page's name follows as a link. */
  warning: "On this screen with these glasses, the stronger eye can see the weaker eye's pictures as well as its own. Two-eye games will not work as intended. See what helps:",

  home: {
    title: "Measure this screen",
    body: "Each check is a match. You make two patches look equally bright, then say so. Each match is made twice. Nothing flashes and nothing is timed.",
    readyTitle: "Before you start",
    ready: (cm: number) => [
      "Dim the room. No lamp or window should shine on the screen.",
      "Set the screen's brightness the way you use it for games, and leave it there.",
      "Turn off night light, reading mode and any vivid or dynamic picture mode.",
      `Sit at your usual distance, about ${cm} cm.`,
      "Have the red-cyan glasses ready for steps 2, 3 and 4.",
    ],
    all: "Measure all four",
    allTime: "About 6 minutes",
    one: "Measure",
    again: "Measure again",
    measured: (date: string) => `Measured on ${date}`,
    usual: "Usual value in use",
    usualTune: "Usual inks in use",
    tuned: (date: string) => `Tuned on ${date}`,
    again2: "Tune again",
    forget: { ask: "Go back to the usual value", warn: "The measurement is removed. Nothing is made up in its place: the usual value is used again.", yes: "Remove the measurement" },
  },

  match: {
    ask: "Which side looks brighter?",
    left: "Left is brighter",
    right: "Right is brighter",
    same: "They look the same",
    group: "Say which side looks brighter",
    nth: (n: number) => `Match ${n} of 2`,
    keys: "With keys or a remote: the left and right arrows say which side is brighter. Up and down move between the buttons. OK presses.",
    hold: "Keep a button pressed to move faster.",
    end: "That is as far as this side goes.",
    skip: "Skip: use the usual value",
    skipKept: "Skip: keep the last measurement",
    back: "Back to the list",
    saving: "Saving.",
    retry: "Match again",
    next: (name: string) => `Next: ${name}`,
    done: "Done",
  },

  refused: {
    apart: "Your two matches did not agree, so nothing was saved. That is common the first time. Take your time and match again.",
    range: "This reading is outside what a screen and glasses can give, so nothing was saved.",
    invalid: "That could not be read, so nothing was saved.",
    seat: "A guardian does the measuring.",
    no_screen: "The size of this screen has not been measured yet. Run onboarding first.",
    failed: "It could not be saved. Nothing was changed.",
  },

  gamma: {
    title: "1. Brightness curve",
    why: "A screen does not get brighter in even steps. This check finds how this screen does it, so that 15% contrast really is 15% of the light.",
    todo: [
      "Take the red-cyan glasses off.",
      "The left half is made of very fine black and white lines. Sit back, or half close your eyes, until the lines melt into one flat grey.",
      "Say which half looks brighter until the two halves look the same.",
    ],
    second: "Once more. This time the plain half starts too bright.",
    scene: "Left half: very fine black and white lines. Right half: plain grey.",
    result: (gamma: number) => `This screen's brightness curve is ${gamma.toFixed(2)}. The usual value is 2.2.`,
    spread: (spread: number) => `Your two matches were ${spread.toFixed(2)} apart.`,
    means: {
      steeper: "Dim pictures come out darker on this screen than on most. The red ink is now drawn a little brighter, so it gives the contrast the eye settings ask for.",
      flatter: "Dim pictures come out brighter on this screen than on most. The red ink is now drawn a little darker, so it gives the contrast the eye settings ask for.",
      usual: "That is the usual value, so nothing looks different. It is now measured, not assumed.",
    },
    range: "The usual cause is a screen that blurs very fine lines, such as a TV that stretches its picture. The usual value of 2.2 stays in use.",
  },

  leak: {
    title: "2. Colour leak",
    why: "The red lens should hide the cyan (blue-green) pictures, and the cyan lens should hide the red ones. No glasses do it fully. This check finds how much slips through each lens.",
    who: "Any grown-up eye will do. This measures the glasses and the screen, not a person.",
    lens: {
      red: {
        head: "Through the red lens",
        todo: [
          "Look through the red lens with one eye. Close the other eye, or cover it with your hand.",
          "The left square is cyan ink at full strength. The right square is red ink.",
          "Say which square looks brighter until the two look the same.",
        ],
        scene: "Left square: cyan ink at full strength. Right square: red ink.",
        picture: "Glasses: look through the red lens, with the other eye closed.",
      },
      cyan: {
        head: "Through the cyan lens",
        todo: [
          "Now look through the cyan lens with one eye. Close the other eye, or cover it.",
          "The left square is red ink at full strength. The right square is cyan ink.",
          "The squares may differ a little in colour. Match how bright they are, not their colour.",
        ],
        scene: "Left square: red ink at full strength. Right square: cyan ink.",
        picture: "Glasses: look through the cyan lens, with the other eye closed.",
      },
    },
    unseen: "I cannot see the left square at all",
    second: "Once more. This time the right square starts too bright.",
    result: {
      red: (share: number) => (share > 0 ? `Through the red lens, ${pct(share)} of the cyan ink gets through.` : "Through the red lens, the cyan ink cannot be seen."),
      cyan: (share: number) => (share > 0 ? `Through the cyan lens, ${pct(share)} of the red ink gets through.` : "Through the cyan lens, the red ink cannot be seen."),
    },
    /* Woods and Harris, Proc. SPIE 7524, 75240Q (2010), https://doi.org/10.1117/12.840835: red-cyan glasses on LCD monitors. */
    compare: "For comparison: red-cyan glasses measured on flat screens let 8% to 24% through the red lens and up to 8% through the cyan lens.",
    suspect: "That is more than red-cyan glasses usually let through. Check that you looked through the lens named in the step, and that the glasses are red and cyan.",
    means: {
      clean: "Almost nothing slips through. Each eye sees only its own picture.",
      ghost: "Each eye also sees a faint copy of the other eye's picture. Games still work. Joining and depth tasks are a little less exact.",
      high: "For at least one person here, the copy is as bright as the stronger eye's own picture. See the list of people on this page.",
    } satisfies Record<LeakLevel, string>,
    refusedLens: { red: "This was the red lens.", cyan: "This was the cyan lens." },
  },

  ink: {
    title: "3. Ink balance",
    why: "Through the glasses, the red pictures and the cyan pictures are not equally bright, even at full strength. This check finds the difference, so the balance check-up can tell the glasses apart from the eyes.",
    who: "This check needs a grown-up whose two eyes see about equally well. If one of your eyes is weaker, ask another grown-up or skip it. The person in training does not do this check.",
    todo: [
      "Put the red-cyan glasses on, over your own glasses if you wear them. Keep both eyes open.",
      "Look at the white frame. One eye sees the red square and the other eye sees the cyan square.",
      "Say which square looks brighter until both look equally bright. They differ in colour: match how bright they are.",
    ],
    scene: "A white frame with a red square on the left and a cyan square on the right.",
    turn: {
      title: "Now turn the glasses round",
      body: "Put the red lens over your other eye, then match once more. Doing it both ways cancels a small difference between your own two eyes.",
      turned: "The glasses are turned round",
      cannot: "These glasses cannot be turned round",
    },
    second: { turned: "Once more, with the glasses turned round.", same: "Once more, the same way round." },
    picture: { first: "Glasses worn the usual way.", turned: "Glasses turned round: the red lens is over the other eye." },
    result: (balance: number) => {
      const n = Math.pow(10, Math.abs(balance));
      return Math.abs(balance) < 0.05 ? "Through these glasses the red pictures and the cyan pictures look equally bright."
        : balance > 0 ? `Through these glasses the cyan pictures look about ${times(n)} times as bright as the red ones.`
          : `Through these glasses the red pictures look about ${times(n)} times as bright as the cyan ones.`;
    },
    short: (balance: number) => (Math.abs(balance) < 0.05 ? "Equal" : `${balance > 0 ? "Cyan" : "Red"} ${times(Math.pow(10, Math.abs(balance)))} times as bright`),
    /** The same thing in a few characters, for the top of the page: the figure, then which ink is the brighter. */
    stat: (balance: number) => (Math.abs(balance) < 0.05 ? "Equal" : `${times(Math.pow(10, Math.abs(balance)))} times`),
    statLabel: (balance: number | null) => (balance === null || Math.abs(balance) < 0.05 ? "Ink balance" : `Ink balance · ${balance > 0 ? "cyan" : "red"} brighter`),
    means: "That comes from the screen and the glasses, not from anyone's eyes. From the next balance check-up on, the app takes it out before it decides which eye is weaker.",
    notTurned: "The glasses were not turned round, so a difference between your own two eyes may be part of this number.",
    /* IEC 61966-2-1 (sRGB): green and blue together carry 0.7874 of white's light and red 0.2126, a ratio of 3.7. */
    compare: "For comparison: on a standard screen, before any lens, cyan ink carries about 3.7 times the light of red ink.",
  },

  /** The fourth step. Each lens has its own setting; nothing here flashes or moves by itself. */
  tune: {
    title: "Tune the inks for these glasses",
    why: "Through the red lens the cyan shapes should vanish, and through the cyan lens the red ones. If something still shows, these two settings change the inks so that less of it does. Each lens has its own setting.",
    lens: {
      red: {
        head: "Red lens: take green out of the cyan",
        picture: "The glasses with only the red lens open",
        todo: [
          "Close the eye behind the cyan lens, or cover the cyan lens with your hand.",
          "Look at the cyan shapes through the red lens.",
          "Press Fainter until the shapes are gone, or as faint as they get. Then press This is the best.",
        ],
        scene: "Cyan shapes on black, seen through the red lens",
        fainter: "Fainter",
        back: "Back a step",
        done: "This is the best",
        nothing: "Nothing shows: keep the cyan as it is",
        noHelp: "If the shapes do not get fainter at all, the leak is in the blue part of the cyan, and taking green out cannot help. Choose Back a step until you are at the start, then keep the cyan as it is.",
      },
      cyan: {
        head: "Cyan lens: a ceiling for the red ink",
        picture: "The glasses with only the cyan lens open",
        todo: [
          "Close the eye behind the red lens, or cover the red lens with your hand.",
          "Look at the red shapes through the cyan lens.",
          "Press Fainter until their shadow is gone. Then press This is the best.",
        ],
        scene: "Red shapes on black, seen through the cyan lens",
        fainter: "Fainter",
        back: "Back a step",
        done: "This is the best",
        nothing: "Nothing shows: no ceiling",
      },
    },
    nth: (n: number) => `Lens ${n} of 2`,
    keys: "With keys or a remote: the left arrow is Fainter and the right arrow is Back a step. Up and down move between the buttons. OK presses.",
    end: "That is as far as this setting goes.",
    keeps: (share: number) => `The weaker eye's pictures keep about ${pct(share)} of their brightness.`,
    dimWarn: "That is a big loss of light for the weaker eye. If the shapes were only a little fainter at this point, go back to where they first got hard to see.",
    result: {
      green: (share: number) => (share >= 0.995 ? "Cyan ink: as usual." : `Cyan ink: ${pct(share)} of its green light, so less of it shows through the red lens.`),
      red: (share: number) => (share >= 0.995 ? "Red ink: no ceiling." : `Red ink: never brighter than ${pct(share)} in games and films.`),
    },
    after: "Now measure the colour leak and the ink balance again, so they are read with the new inks. Then each person with eye settings takes the balance check-up again.",
    redOnly: "The ceiling is used in games and films only. Check-ups and these checks draw the red ink without it, so what they measure is the eye and not the ceiling.",
  },

  record: {
    title: "On record for this screen",
    rows: { gamma: "Brightness curve", leakRed: "Leak through the red lens", leakCyan: "Leak through the cyan lens", ink: "Ink balance", green: "Cyan ink", redTop: "Red ink ceiling", size: "Size and distance" },
    stat: { gamma: "Brightness curve", leak: "Most that leaks through a lens" },
    notMeasured: "Not measured yet",
    usual: "Usual value, not measured",
    from: {
      gamma: "Used for every contrast the app draws",
      leakRed: "The stronger eye's lens. This is cyan ink it should not see",
      leakCyan: "The weaker eye's lens. This is red ink it should not see",
      ink: "Read by the balance check-up",
      inkNotTurned: "Read by the balance check-up. The glasses were not turned round for the second match",
      green: "Less green means less shows through the red lens",
      redTop: "Used in games and films only",
    },
    greenValue: (share: number) => `${pct(share)} of its green`,
    redTopValue: (share: number) => `At most ${pct(share)}`,
    untuned: "As usual",
    stale: "Matched before the inks were last tuned. Measure it again.",
    none: "too little to see",
    statNone: "None seen",
    size: (ppc: number, cm: number, date: string) => `${ppc.toFixed(1)} px per cm, viewed from ${cm} cm. Measured on ${date}`,
    sizeFrom: "From onboarding",
    moved: "The size of this screen was measured again after these colours, and it came out different. If this is another screen, measure the colours again.",
    oneScreen: "These values belong to the screen and the glasses they were measured with. Measure again when you change the screen, its picture settings or the glasses.",
  },

  people: {
    title: "What it means for each person",
    none: { title: "The leak is not measured yet", body: "Once it is, this list says how much of the other eye's picture each person's stronger eye can see." },
    contrast: (share: number) => `Stronger eye shown at ${pct(share)}`,
    noEye: "No eye settings yet",
    chip: { clean: "Clean", ghost: "Faint copy", high: "Too much leak" } satisfies Record<LeakLevel, string>,
    line: {
      clean: "Each eye sees only its own picture.",
      ghost: (share: number) => `The stronger eye also sees the weaker eye's pictures, about ${pct(share)} as bright as its own.`,
      high: "Through the red lens, the weaker eye's pictures look at least as bright as the stronger eye's own. The stronger eye can then see everything by itself, so two-eye games will not work as intended on this screen with these glasses.",
    },
    helpTitle: "What helps when there is too much leak",
    help: [
      "Try another pair of red-cyan glasses. Lenses differ a lot from pair to pair.",
      "Turn off vivid or dynamic picture modes, and dim the room.",
      "Tell your counsellor or eye doctor what this page shows.",
    ],
    noFix: "The app never raises the contrast to hide a leak, and it keeps the black field. What it can do is tune the inks for these glasses: step 4 above.",
    capped: (top: number) => `In games and films the red ink is held at ${pct(top)}, under this person's own setting, because of the ceiling for the cyan lens.`,
    balanceAgain: (list: string[]) => `Take the balance check-up again for ${names(list)}. The contrast was set before this screen was measured, so it does not use the new values yet.`,
    balanceLink: "Balance check-up",
    balanceSwitch: "It runs for the active profile. Switch profile in Settings for anyone else.",
  },

  limits: {
    title: "How far to trust these numbers",
    body: [
      "They are estimates made by eye, at home. A lab would use a light meter.",
      "A careful person repeats a match to within about a tenth. Red against cyan is harder to match than two patches of one colour.",
      "That is good enough to draw contrast more truly than a guess, and to show when a pair of glasses lets too much through.",
      "It is not a test of anyone's eyes, and it does not replace an eye examination.",
    ],
  },
}));
