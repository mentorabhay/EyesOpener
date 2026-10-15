/**
 * Words for Class Mission: the child who wears a patch leads a five-minute game for the whole class.
 * The kit says what a patch is for in words a class understands, and says nothing about the child's own eyes.
 * It is a game, not an eye test: no line here scores, compares or judges anyone, and none promises a result.
 */
import type { MissionRefusal, MissionState, StepKey } from "@/lib/class-mission";
import { texts } from "@/i18n/texts";

const seconds = (n: number) => (n % 60 === 0 ? `${n / 60} min` : n > 60 ? `${Math.floor(n / 60)} min ${n % 60} s` : `${n} s`);

export const classMission = texts("copy/class-mission", "classMission", () => ({
  stats: { length: "Minutes, start to finish", state: "Where it stands" },
  state: { none: "Not given", given: "Given, not run yet", done: "Run" } satisfies Record<MissionState, string>,
  seconds,

  what: {
    title: "The mission in five minutes",
    lead: "Everyone covers one eye with a hand and tries two easy things. For once the whole class does what the leader does every day.",
    steps: {
      hello: { name: "Hello", what: "The leader says what the mission is. The grown-up reads what a patch is for." },
      cover: { name: "Patch on", what: "Everyone makes a cup with one hand and covers one eye. No pressing. Practise changing hands." },
      fingers: { name: "Finger landing", what: "In pairs. One holds a finger up at arm's length. The other lands a fingertip on it from above: three tries with both eyes, three with one eye covered. Then they change places." },
      follow: { name: "Follow the comet", what: "One eye covered, head still. The class follows the comet with the open eye. Half way through, everyone changes hands." },
      secret: { name: "The secret", what: "Hands down. The leader asks which was harder, and tells the secret: one eye on its own has to practise." },
    } satisfies Record<StepKey, { name: string; what: string }>,
    noGear: "Nothing to wear and nothing to hand round. A screen helps for one step and is not needed.",
    safe: "It is safe for children whose eyes work well together: a hand over one eye for under a minute changes nothing.",
  },

  screen: {
    title: "The screen step",
    with: (game: string) => `With a screen: the leader plays ${game}, a two-minute game from the library for anyone from age 5, with no glasses. The class watches and follows the comet.`,
    tip: "Open the game before you connect the big screen, so the class sees the game and not your family's pages.",
    record: "It is the leader's own play, so it is kept in their record like any other game. Nothing about the class is kept.",
    open: (game: string) => `Open ${game}`,
    without: "Without a screen: the leader holds up the paper comet from the kit and walks it slowly in a figure of eight.",
    off: "The screen game is not offered at the moment. Use the paper comet from the kit.",
  },

  decide: {
    title: "Before you say yes",
    points: [
      "Ask your child first. Leading the class is a big step, and no is a fine answer.",
      "Talk to the teacher and give them the note from the kit. The teacher chooses the day.",
      "The note says what a patch is for. It says nothing about your child's eyes, and the teacher is asked not to either.",
      "Your child's patch or glasses stay exactly as the eye doctor set them. The mission never moves a patch.",
    ],
  },

  kept: {
    title: "What Eyes Opener keeps",
    points: [
      "That you gave your child the mission, and the day you say it was run.",
      "Nothing about the class: no school, no teacher, no classmate, no number of children, and no note of how it went.",
      "A mission you take back before it is run is deleted.",
    ],
  },

  child: {
    given: (name: string) => `${name} has the mission`,
    givenOn: (day: string) => `Given on ${day}. Not run yet.`,
    doneOn: (day: string) => `Run on ${day}.`,
    none: (name: string) => `${name} has no mission.`,
    needsConsent: (name: string) => `A parent or guardian's consent for ${name} is not in place, so no mission can be given.`,
    give: (name: string) => `Give ${name} the mission`,
    giveAgain: (name: string) => `Give ${name} the mission again`,
    given_ok: (name: string) => `${name} has the mission. Print the kit and talk to the teacher.`,
    kit: "Open the kit to print",
    done: {
      title: "After the mission",
      field: "The day it was run",
      submit: "Mark as run",
      saved: (name: string) => `Saved. Well done, ${name}.`,
    },
    back: {
      open: "Take the mission back",
      warn: "The mission is deleted. Nothing of it is kept. You can give it again later.",
      submit: "Take it back",
      saved: "The mission was taken back and deleted.",
    },
    earlier: "Earlier missions",
    lookOnly: "Only a parent or guardian can give a mission, mark it as run or take it back.",
    noChildren: { title: "No child profile", body: "A class mission is for a child of the household. Add a child on the Family page first." },
  },

  /** What a child sees on a device in child mode. */
  mine: {
    title: "Your class mission",
    lead: "You lead the game. A grown-up helps you. Here is what you say.",
    none: { title: "Nothing here yet", body: "Ask a grown-up at home about this page." },
    done: "You led the mission. Well done.",
  },

  refused: {
    not_allowed: "Only a parent or guardian can do this.",
    not_child: "A class mission is for a child of the household.",
    needs_consent: "A parent or guardian's consent for this child is not in place.",
    already: "That was done already.",
    not_found: "That mission is not there any more.",
    bad_day: "Choose a day between the day the mission was given and today.",
  } satisfies Record<MissionRefusal, string>,

  /* ───────────── the kit, on paper ───────────── */
  kit: {
    title: "Class Mission kit",
    sub: "Three sheets: a note for the teacher, the plan, and the leader's cards.",
    crumb: "Class Mission",
    print: "Print the kit",
    printHint: "Use A4 paper. Colour is not needed.",

    note: {
      title: "Class Mission: a note for the grown-up in the room",
      what: {
        title: "What this is",
        lines: (minutes: number) => [
          `A ${minutes}-minute game that one child in your class leads, with you beside them.`,
          "Everyone covers one eye with a hand and tries two easy things. There is nothing to wear and nothing to hand round.",
          "A screen helps for one step. It is not needed.",
        ],
      },
      why: {
        title: "Why",
        lines: [
          "Some children wear an eye patch, or special glasses, for part of the day. In a class that can make a child feel like the odd one out.",
          "In this game the whole class does what that child does every day, and that child is the one who knows how.",
        ],
      },
      words: {
        title: "What a patch is for, in words for the class",
        say: "Our two eyes work as a team. Sometimes one eye needs extra practice to keep up with the other. A patch covers one eye for a while, so the eye that needs practice does the looking. It does not hurt, and you cannot catch it. An eye doctor decides when it is worn.",
        note: "Read this out, or say it your own way. Please add nothing about this child's eyes.",
      },
      not: {
        title: "Please do not",
        lines: [
          "Do not tell the class anything about the leader's eyes, and do not ask the leader to.",
          "Do not ask anyone to take off or move a patch or glasses. A child who wears a patch keeps it on and does not cover the other eye: they are already on the mission.",
          "Do not keep score, compare children or name who found it hard.",
          "Do not write down or photograph anything about a child.",
        ],
      },
      test: {
        title: "This is a game, not an eye test",
        lines: [
          "It cannot show whether anyone's eyes are fine or not. The one-eye part is harder for everyone: that is the point of the game.",
          "If you are ever worried about a child's sight, tell that child's parents, as you would on any other day.",
        ],
      },
      safe: {
        title: "Keeping it safe",
        lines: (cover: number) => [
          "A cupped hand over the eye, never pressing on it.",
          `Nobody keeps an eye covered for longer than ${cover} seconds at a time. The plan changes hands before that.`,
          "Fingers only. No pencils, rulers or pointers near faces.",
          "A child who does not want to cover an eye watches instead.",
          "If anyone feels dizzy or unwell, they stop and sit down. Stop the game if several do.",
          "With a screen: children sit well back. Nothing in the game flashes.",
        ],
      },
      kept: "Eyes Opener keeps nothing about your class. The family's app records only that the mission was run, and the day.",
      foot: "Eyes Opener is not a medical device. This game does not check, treat or change anyone's eyes.",
    },

    plan: {
      title: "The plan",
      sub: "For the grown-up to read from. The leader has the cards.",
      cols: { at: "At", what: "What happens" },
      grownUp: {
        hello: "You: read \"What a patch is for\" from the note.",
        cover: "You: check that hands are cupped and nobody presses. Call \"change hands\" once.",
        fingers: "You: call \"both eyes\", then \"one eye\", then \"change places\". Each one-eye turn is under a minute.",
        follow: "You: call \"change hands\" half way. With no screen, the leader walks the paper comet slowly.",
        secret: "You: thank the leader. Put the class sheet on the wall.",
      } satisfies Record<StepKey, string>,
      total: (minutes: number) => `${minutes} minutes in all.`,
    },

    cards: {
      title: "The leader's cards",
      sub: "Cut along the dashed lines. The leader reads one card at each step, or you whisper it to them.",
      n: (i: number) => `Card ${i}`,
      list: [
        { say: "My mission today: everyone tries what I do every day.", doing: "Hold up your hand like a cup." },
        { say: "Make a cup with your hand. Cover one eye. Do not press.", doing: "Show them. Then say: change hands." },
        { say: "Land your finger on your partner's finger. First with two eyes. Then with one.", doing: "Do it with your partner so they can see." },
        { say: "Follow the comet with your open eye. Keep your head still.", doing: "Play the comet game, or walk the paper comet slowly." },
        { say: "Which was harder: two eyes or one?", doing: "Let them call out." },
        { say: "Two eyes are a team. One eye on its own has to practise. That is what my patch is for.", doing: "If you wear glasses or play eye games instead, say: that is what my eye practice is for." },
      ],
    },

    comet: {
      title: "The paper comet",
      sub: "For a room with no screen. Cut it out. The leader holds it up high and walks it slowly in a figure of eight, as wide as the room allows.",
      label: "A comet: a star with a tail",
    },

    sheet: {
      title: "Our class did the One-Eye Mission",
      line: "We covered one eye and found out that one eye on its own has to practise.",
      ledBy: "Led by",
      ledNote: "A first name, if the leader and their family agree.",
      date: "Date",
      noNames: "No other names go on this sheet.",
    },
  },
}));
