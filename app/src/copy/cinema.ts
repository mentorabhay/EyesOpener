/**
 * Words for the two-eye cinema: the player's own controls, chapters and eye breaks, and the list of the member's films.
 * The page title and the words older screens already use stay in `train.ts` (`train.cinema`).
 */
import type { Labels } from "@/components/play/results";
import { texts } from "@/i18n/texts";

type Side = "L" | "R";
const side = (e: Side) => (e === "L" ? "left" : "right");
const other = (e: Side) => (e === "L" ? "right" : "left");
const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
/** 600 seconds reads "10 minutes"; 20 seconds reads "20 seconds". */
const span = (seconds: number) => (seconds >= 60 && seconds % 60 === 0 ? count(seconds / 60, "minute") : count(seconds, "second"));

export const cinema = texts("copy/cinema", "cinema", () => ({
  glasses: {
    title: "Put the red-cyan glasses on.",
    way: (cyan: Side) => `Cyan (blue-green) lens over your ${side(cyan)} eye, red lens over your ${other(cyan)} eye.`,
    unknown: "The cyan (blue-green) lens goes over the weaker eye, or over the stronger eye when the colours are swapped. Setup finds which eye that is.",
    own: "Keep your own glasses on underneath if an eye doctor prescribed them.",
    short: (cyan: Side) => `Cyan lens over your ${side(cyan)} eye`,
    shortUnknown: "Cyan lens over the weaker eye",
    picture: (cyan: Side) => `Red-cyan glasses seen from the front as in a mirror: the cyan lens is over the ${side(cyan)} eye and the red lens over the ${other(cyan)} eye`,
  },

  how: {
    title: "How a session goes",
    lines: (chapterSeconds: number, breakSeconds: number) => [
      "The clock runs only while the film plays.",
      `After every ${span(chapterSeconds)} of watching, the film pauses for an eye break of at least ${span(breakSeconds)}. That is one chapter.`,
      "A break does not count as watching.",
      "The film stops by itself when today's minutes are used.",
    ],
    test: (chapterSeconds: number, breakSeconds: number, usual: { chapterSeconds: number; breakSeconds: number }) =>
      `Staff test: on this page a chapter is ${span(chapterSeconds)} and a break ${span(breakSeconds)}. A family always gets a chapter of ${span(usual.chapterSeconds)} and a break of ${span(usual.breakSeconds)}.`,
  },

  player: {
    region: "Two-eye film player",
    picture: "Your film, shown as a two-eye picture. OK or Space plays and pauses. Left and right move 10 seconds.",
    controls: "Film controls",
    play: "Play",
    pause: "Pause",
    back: "Back 10 seconds",
    forward: "Forward 10 seconds",
    place: "Place in the film",
    placeText: (now: string, all: string) => `${now} of ${all}`,
    filmLeft: (left: string) => `${left} left`,
    filmLeftLabel: "Time left in the film",
    filmNowLabel: "Time into the film",
    soundOff: "Turn the sound off",
    soundOn: "Turn the sound on",
    quieter: "Quieter",
    louder: "Louder",
    level: (tenths: number) => `Sound ${tenths} of 10`,
    full: "Full screen",
    leaveFull: "Leave full screen",
    keys: "With a keyboard or a remote: OK or Space plays and pauses, left and right move 10 seconds, and the arrows move between the buttons. M turns the sound off and F fills the screen.",
    none: "No film chosen yet.",
    add: "Choose films from this device",
    nowPlaying: (name: string) => `On screen: ${name}`,
  },

  session: {
    watched: "watched this session",
    chapter: (n: number) => `Chapter ${n}`,
    toBreak: (left: string) => `eye break in ${left}`,
    left: "left in this session",
    leftLabel: "Time left in this session",
  },

  ready: {
    play: "Play",
    stoppedAt: (at: string) => `Last time this film stopped at ${at}.`,
    carryOn: (at: string) => `Carry on from ${at}`,
    fromStart: "Start from the beginning",
    paused: "Paused",
  },

  rest: {
    title: "Eye break",
    finished: (n: number) => `Chapter ${n} is finished.`,
    look: (metres: number) => `Take the glasses off. Look at something far away, ${metres} metres or more: out of a window, or across the room.`,
    countdown: "Break time left",
    seconds: (n: number) => count(n, "second"),
    wait: "The film waits until the countdown ends.",
    over: "The break is over.",
    back: (lens: string) => `Put the glasses back on: ${lens.charAt(0).toLowerCase()}${lens.slice(1)}. Carry on when you are ready, or rest for longer.`,
    carryOn: "Carry on watching",
    end: "End the session here",
  },

  used: {
    title: "Today's minutes are used.",
    at: (at: string) => `The film stopped at ${at}. Next time it will offer to carry on from there.`,
    tomorrow: "Come back tomorrow.",
  },
  stopped: { title: "Stopped", body: "The film stays paused. Rest your eyes, and say below what you felt." },

  cannot: {
    title: "This browser cannot play this film.",
    body: "Choose another film, or open this one in another browser. Most browsers play films saved as MP4 or WebM, but not every kind of each.",
    inList: "Cannot be played in this browser",
  },

  list: {
    title: "Your films",
    sub: "Line up the films you want to watch. When one ends, the next one starts.",
    onDevice: "Films stay on this device. Eyes Opener keeps only their names, their lengths and your place in each one, in this browser. Nothing about them is sent anywhere.",
    add: "Add films from this device",
    picker: "Video files",
    hidden: "Choose video files",
    empty: "No film in the list yet.",
    reelName: "Eyes Opener's test reel",
    films: (n: number) => count(n, "film"),
    place: (i: number, n: number) => `${i} of ${n}`,
    notStarted: "Not started",
    watched: (now: string, all: string) => `${now} of ${all} watched`,
    watchedSoFar: (now: string) => `${now} watched`,
    done: "Watched to the end",
    lengthUnknown: "Length not read yet",
    onScreen: "On screen",
    play: "Play",
    playName: (name: string) => `Play ${name}`,
    up: "Up",
    upName: (name: string) => `Move ${name} up the list`,
    down: "Down",
    downName: (name: string) => `Move ${name} down the list`,
    remove: "Remove",
    removeName: (name: string) => `Remove ${name} from the list`,
    removeNote: "Removing a film from the list also forgets your place in it. The file itself is not touched.",
    needsFile: "Needs its file again",
    pickAgain: "Pick this file again",
    pickAgainName: (name: string) => `Pick the file for ${name} again`,
    needsOk: "Waiting for your OK",
    gone: "The file is no longer where it was",
    kept: "This browser keeps access to the films you choose, so they are ready on your next visit.",
    notKept: "The list remembers the names of your films and your place in each one. Where the browser cannot keep access to a file between visits, pick that file again to watch it.",
    needsPick: "The list remembers this film and your place in it, but this browser no longer has its file. Pick the file again to watch.",
    ask: "Open my films again",
    askNote: "Your browser asks for your OK before it opens the films you chose last time.",
    notVideo: (n: number) => `${count(n, "file")} left out: not a video.`,
    full: (max: number, n: number) => `The list holds ${max} films. ${count(n, "film")} did not fit.`,
    again: (name: string) => `${name} is ready again, at the place you stopped.`,
    added: (n: number) => `${count(n, "film")} added.`,
    next: (name: string) => `Next: ${name}`,
  },

  /** What a film session measured, as the results table names it. */
  labels: {
    chapters: { label: "Chapters finished", unit: "" },
    films: { label: "Films finished", unit: "" },
  } satisfies Labels,
}));
