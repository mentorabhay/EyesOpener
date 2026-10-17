/**
 * Words of child mode's own screens (src/app/(app)/kids/). Short, for a child of about six to read with help or
 * to hear: one idea per line, no numbers but the count of the eye break. `say` is what the Listen page speaks for
 * each tile, built into the "kids" voice scripts (src/voice/scripts.ts), so a child who cannot read yet can hear it.
 */
import { texts } from "@/i18n/texts";

export const kids = texts("copy/kids", "kids", () => ({
  title: "Your eyes today",
  hi: (name: string) => `Hi, ${name}!`,
  lead: "Pick what you want to do.",
  back: "Back to my tiles",
  menu: "My tiles",
  home: "My tiles",

  tiles: {
    play: { name: "Play", text: "Your game for today.", say: "Put your glasses on. Then play your game for today. When the clock says you are done, you are done." },
    break: { name: "Eye break", text: "Look far away for a little while.", say: "Look at something far away, like a tree or the wall across the room. Keep looking while the count goes down to zero." },
    outside: { name: "Go outside", text: "Play outside with a grown-up.", say: "Ask a grown-up to take you outside. Playing in daylight is good for growing eyes." },
    listen: { name: "Listen", text: "Hear what to do.", say: "" },
    stop: { name: "Stop", text: "My eyes feel funny.", say: "Stop. Take your glasses off. Close your eyes. Then tell a grown-up how you feel." },
  },

  play: {
    rest: "All done for today. Well done!",
    restText: "Your eyes have had their play. Come back tomorrow.",
    held: "Ask a grown-up first.",
    heldText: "A grown-up needs to finish getting things ready before you play.",
    young: "Games are for big kids.",
    youngText: "Games on a screen start when you are four. Go outside and play instead.",
  },

  break: {
    title: "Eye break",
    lead: "Find something far away. A tree, a window, the wall across the room.",
    start: "Start the count",
    again: "Do it again",
    left: (n: number) => `${n} left`,
    count: "Seconds left",
    look: "Keep looking far away…",
    done: "Well done! Your eyes had a rest.",
    steps: [
      { title: "Look up", text: "Look away from the screen." },
      { title: "Look far", text: "Find something far away." },
      { title: "Keep looking", text: "Keep looking until the count ends." },
    ],
  },

  outside: {
    title: "Go outside",
    lead: "Playing outside in daylight is good for growing eyes.",
    steps: [
      { title: "Ask a grown-up", text: "A grown-up comes with you." },
      { title: "Go outside", text: "Daylight, even on a cloudy day." },
      { title: "Play", text: "Run, climb, kick a ball, look around." },
      { title: "Tell your grown-up", text: "Say how long you played, so they can write it down." },
    ],
    sun: "Wear a hat when the sun is strong. Never look straight at the sun.",
  },

  listen: {
    title: "Listen",
    lead: "Press a button to hear what to do.",
    none: "There is nothing to listen to yet.",
  },

  stop: {
    title: "Stop",
    lead: "Stopping is always OK. You did the right thing.",
    steps: [
      { title: "Glasses off", text: "Take your glasses off." },
      { title: "Close your eyes", text: "Rest them for a little while." },
      { title: "Tell a grown-up", text: "Say how your eyes feel." },
    ],
    now: "Tell a grown-up straight away if",
    signs: ["your head hurts", "you see two of things", "your eyes hurt or water a lot", "you feel sick or dizzy"],
  },
}));

