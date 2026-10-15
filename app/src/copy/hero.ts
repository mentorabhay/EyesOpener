/**
 * Words for Draw Your Hero.
 * A hero is a shape and nothing more: no name, no writing. Nothing here may ask a child to type anything,
 * and nothing may say the hero treats or improves anything: it is what the child plays as.
 */
import type { StarterKey } from "@/games/hero";
import type { TraceFail } from "@/lib/hero/trace";
import { texts } from "@/i18n/texts";

const heroes = (n: number) => (n === 1 ? "1 hero" : `${n} heroes`);

export const hero = texts("copy/hero", "hero", () => ({
  sub: "Draw a hero. It becomes your character in the game, in the weaker eye's colour.",
  stats: { kept: "Heroes kept", games: "Games it plays in" },

  make: {
    title: "Make a hero",
    ways: { paper: "Draw on paper", screen: "Draw on the screen", starter: "Pick a ready-made one" },
    waysLabel: "How to make the hero",
    paper: {
      steps: [
        "Draw one hero on plain white paper with a dark, thick pen.",
        "Make it big: let it fill most of the page.",
        "Put the page in good light, with no shadow across it.",
        "Hold it up to the camera, or pick a photo of it.",
      ],
      camera: "Use the camera",
      photo: "Pick a photo",
      photoLabel: "Pick a photo of the drawing",
      take: "Take the picture",
      close: "Close the camera",
      guide: "Hold the drawing so it fills the square.",
      cameraView: "What the camera sees",
      noCamera: "The camera did not open. Check that this page may use it, or pick a photo, or draw on the screen.",
      noPhoto: "That file could not be opened as a picture. Try another photo.",
    },
    screen: {
      hint: "Draw with a finger or the mouse. Lift off, and the hero appears beside it.",
      pad: "Drawing sheet. Draw your hero here with a finger or the mouse.",
      clear: "Start again",
      keys: "With a keyboard only, pick a ready-made hero instead.",
    },
    starter: {
      hint: "No pen and no camera? Pick one of these.",
      names: { walker: "Walker", cat: "Cat", robot: "Robot", rocket: "Rocket", star: "Star" } as Record<StarterKey, string>,
      pick: (name: string) => `Pick the ${name.toLowerCase()}`,
    },
    working: "Looking for the drawing.",
    /** One plain sentence, whatever went wrong, then one hint. */
    notSeen: "We could not see a drawing.",
    hints: {
      dark: "The picture is too dark. Move to brighter light and try again.",
      empty: "Use a dark, thick pen on plain white paper, and make the drawing big.",
      busy: "There is too much in the picture. Use plain paper with one drawing, and let the paper fill the picture.",
    } as Record<TraceFail, string>,
  },

  preview: {
    title: "How it will look",
    note: "This is the weaker eye's colour on the black field, as the game draws it. Thin lines are made bolder so they are easy to see.",
    label: "The hero as a game draws it: a cyan shape on a black field",
    style: { label: "How to draw it", drawn: "As drawn", filled: "Filled in" },
    keep: "Keep this hero",
    keeping: "Keeping it.",
    kept: "Kept. This hero now plays in the game.",
    again: "Try again",
    nothing: "Your hero shows here once it is drawn.",
  },

  /** Why a hero was not kept, in one sentence each. One entry for every reason in src/lib/hero-rules.ts. */
  blocked: {
    guardian: "Making a hero needs a parent or guardian. Ask a grown-up to do it with you.",
    consent: (name: string) => `${name} needs a guardian's consent first. A guardian can give it under Family.`,
    camera: "A guardian has not allowed the camera yet. Pick a photo or draw on the screen, or allow the camera first.",
    shape: "That shape could not be kept. Draw it again, a little bigger.",
    full: (most: number) => `${heroes(most)} are kept already. Delete one to make room.`,
  },

  mine: {
    title: (name: string) => `${name}'s heroes`,
    none: "No hero yet. Until there is one, games use their own character.",
    current: "In the game now",
    use: "Use this one",
    useLabel: (n: number) => `Use hero ${n}`,
    remove: "Delete",
    removeLabel: (n: number) => `Delete hero ${n}`,
    removeAsk: "Delete this hero? It cannot be brought back.",
    removeYes: "Yes, delete it",
    picture: (n: number, current: boolean) => (current ? `Hero ${n}, in the game now` : `Hero ${n}`),
    own: "Use the game's own character",
    ownOn: "Games are using their own character.",
    count: (n: number, most: number) => `${heroes(n)} kept, of ${most} at most.`,
    child: "To make a new hero or delete one, ask a grown-up.",
    guardianOnly: "Only a parent or guardian can make or delete a hero.",
  },

  inGame: {
    title: "Where the hero plays",
    line: (games: string) => `Your hero is the runner in ${games}.`,
    /** One line for a game a fuller build adds. `as` comes from that build's own words and finishes the sentence. */
    also: (game: string, as: string) => `In ${game} your hero is ${as}.`,
    none: "No game that uses a hero is open right now.",
    play: (game: string) => `Play ${game}`,
    scene: "A game scene: the hero in cyan carries a lantern along a white street, with a cyan coin above and a red crate ahead",
    sceneEmpty: "A game scene: a dashed outline on a white street shows where the hero will stand, with a cyan coin above and a red crate ahead",
    rule: "The hero takes the place of the game's own character, in the same colour. What the weaker eye must find stays in the weaker eye's colour. The game's rules stay the same.",
  },

  privacy: {
    title: "What is kept",
    points: [
      "The photo and the camera picture stay on this device. They are not sent and not saved.",
      "Only the shape is kept: a small grid of squares, 48 by 48 at most.",
      "A hero has no name and no writing.",
      "Only your family sees it. It is never shared with other families.",
      "Delete a hero here at any time.",
    ],
  },

  camera: {
    title: "The camera",
    ask: "The camera reads the drawing on this device and is then switched off. No picture leaves the device.",
    agree: (name: string) => `I am a parent or guardian, and I allow the camera to be used to read a drawing for ${name}.`,
    allow: "Allow the camera",
    allowed: (by: string | null, date: string) => `Camera allowed by ${by ?? "a guardian"} on ${date}.`,
    withdraw: "Stop allowing the camera",
    guardianOnly: "Only a parent or guardian can allow the camera.",
    notTicked: "Tick the box to allow the camera.",
  },
}));
