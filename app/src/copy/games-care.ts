/**
 * Words for the care companions. A care companion is a log the family keeps about care away from the screen.
 * Plain words. No cure claims, no diagnosis words.
 */

/** One line per companion that says how to use it. */
import { texts } from "@/i18n/texts";

export const help: Record<string, string> = texts("copy/games-care", "help", () => ({
  "sky-spotter": "Go outside in daylight. Tick the far-off things you found, type the minutes outside and press Save the hunt.",
  "blink-garden": "Press Begin and follow the words: close, keep closed, squeeze, open. Ten blinks grow one leaf.",
  "far-window": "Press Begin, look at something far away and count slowly to twenty. Then tick three things you found.",
}));

export const minutesText = (n: number) => `${Math.round(n)} ${Math.round(n) === 1 ? "minute" : "minutes"}`;
/** "1 break", "3 breaks". */
export const times = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const care = texts("copy/games-care", "care", () => ({
  lookOnly: "You can look here. Logging is for the child and the guardians.",
  camera: {
    title: "Camera check: not built yet",
    "blink-garden": "Counting blinks with the camera is not built yet. For now, follow the words and the bar.",
    "far-window": "Checking with the camera that the eyes left the screen is not built yet. For now, tick what you found.",
  } as Record<string, string>,

  /* ───────────── outdoor time ───────────── */
  outdoor: {
    minutes: "Minutes outside",
    minutesHint: "From 5 to 180 for one visit.",
    sun: "Never look straight at the sun.",
    todayTotal: (n: number) => `${minutesText(n)} outside logged today.`,
    result: {
      saved: (n: number) => `Saved. ${minutesText(n)} added to the Light ring.`,
      partly: (n: number) => `Saved. Only ${minutesText(n)} fitted, because a day holds 10 hours of outdoor time.`,
      foundOnly: "Saved what you found. Today's outdoor time is already full at 10 hours, so no minutes were added.",
      day_full: "Today's outdoor time is already full at 10 hours.",
      badMinutes: "Type the minutes outside: from 5 to 180 for one visit.",
      not_allowed: "Logging is for the child and the guardians.",
    },
  },
  sky: {
    title: "Today's hunt",
    alt: (found: number) => `A wide sky over far hills and rooftops. ${found} of 10 lights are on.`,
    intro: "Ten far-off things. Go outside in daylight and find what you can. The list changes every day.",
    found: (n: number) => `${n} of 10 found today.`,
    legend: "Tick what you found",
    foundMark: "found",
    save: "Save the hunt",
    /** Far-off things to find in daylight. Ten are picked for each day. */
    things: [
      { id: "bird-wire", label: "A bird on a wire" },
      { id: "far-roof", label: "The farthest rooftop you can see" },
      { id: "cloud-shape", label: "A cloud that looks like an animal" },
      { id: "kite", label: "A kite in the sky" },
      { id: "aeroplane", label: "An aeroplane high up" },
      { id: "water-tank", label: "A water tank on a roof" },
      { id: "tower-top", label: "The top of a tower or temple" },
      { id: "tree-top", label: "The very top of a tall tree" },
      { id: "flag", label: "A flag on a pole" },
      { id: "day-moon", label: "The moon in the daytime" },
      { id: "hill", label: "A hill or the farthest building" },
      { id: "crane", label: "A crane at a building site" },
      { id: "phone-mast", label: "A mobile phone mast" },
      { id: "flock", label: "A flock of birds flying together" },
      { id: "balcony", label: "A balcony with plants, far away" },
      { id: "signboard", label: "A signboard far down the road" },
      { id: "street-light", label: "The farthest street light" },
      { id: "bus", label: "A bus far down the road" },
      { id: "red-roof", label: "A red roof" },
      { id: "palm", label: "A palm or coconut tree" },
      { id: "bridge", label: "A bridge or flyover far away" },
      { id: "pylon", label: "An electricity pylon" },
      { id: "washing", label: "Clothes drying on a far roof" },
      { id: "soaring", label: "A bird gliding without flapping" },
      { id: "bicycle", label: "A bicycle far down the road" },
      { id: "dog", label: "A dog far away" },
      { id: "window", label: "A window that shines in the light" },
      { id: "train", label: "A train or a railway line" },
      { id: "smoke", label: "Smoke or steam rising far away" },
      { id: "balloon", label: "A balloon or something floating" },
    ],
  },

  /* ───────────── breaks ───────────── */
  breaks: {
    today: (n: number) => `${times(n, "break", "breaks")} logged today. Up to 12 a day count.`,
    result: {
      counted: "Done. One break added to your Rest ring.",
      full: "Done. Today already has 12 breaks, so the ring stays where it is. Your eyes have had a good day.",
      too_soon: "That was too quick to count. Begin again and follow it to the end.",
      already: "That break is already logged.",
      not_allowed: "Breaks are logged by the child and the guardians.",
      failed: "That did not save. Please try again.",
    },
  },
  blink: {
    gardenTitle: "The garden",
    gardenAlt: (leaves: number) => `A plant in a pot with ${times(leaves, "leaf", "leaves")}.`,
    leaves: (n: number) => `${times(n, "leaf", "leaves")} this week. One for each set of ten blinks.`,
    routineTitle: "Ten full blinks",
    intro: "A full blink closes the eye all the way. Each blink has four parts: close, keep closed, squeeze, open. It takes one minute. A phone that can buzz gives a short buzz when it is time to open.",
    begin: "Begin",
    stop: "Stop",
    again: "Begin another set",
    count: (n: number, all: number) => `Blink ${n} of ${all}`,
    parts: { close: "Close your eyes gently", pause: "Keep them closed", squeeze: "Squeeze softly", open: "Open and relax" },
    barLabel: "This part of the blink",
    saving: "Saving your set",
  },
  far: {
    windowTitle: "The far window",
    windowAlt: "A window that looks out on far hills, a tall tree, rooftops and a cloud.",
    routineTitle: "A 20-second look far away",
    intro: "Look at something 6 metres away or more: out of a window, down a corridor, across the road. A phone that can buzz gives a short buzz when the 20 seconds are over.",
    begin: "Begin",
    stop: "Stop",
    looking: "Keep looking far away. Count slowly to twenty.",
    seconds: (n: number) => `${n} seconds left`,
    pickTitle: "Which far-off things did you find? Tick three.",
    picked: (n: number) => `${n} of 3 ticked`,
    finish: "Finish the break",
    again: "Begin another break",
    saving: "Saving your break",
    farToday: (n: number) => `${times(n, "far look", "far looks")} today.`,
    things: [
      { id: "tree", label: "A tree" },
      { id: "roof", label: "A rooftop" },
      { id: "cloud", label: "A cloud" },
      { id: "window", label: "A far window" },
      { id: "building", label: "A tall building or a hill" },
      { id: "light", label: "A street light" },
      { id: "bird", label: "A bird" },
      { id: "wall", label: "The far end of a room or corridor" },
      { id: "other", label: "Something else far away" },
    ],
  },
}));
