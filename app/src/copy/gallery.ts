/** Words for the Locked Gallery. Plain words; no promise that anything will change. */
const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
const side = (eye: "left" | "right") => eye;
const otherSide = (eye: "left" | "right") => (eye === "left" ? "right" : "left");
/** A depth step without stray decimal places. */
const step = (arcsec: number) => String(Math.round(arcsec * 10) / 10);
/** The contrast a faint step stands for, as a percentage. */
export const faintPercent = (logCs: number) => `${(100 * Math.pow(10, -logCs)).toFixed(1)}%`;

export const gallery = {
  stats: { pictures: "Pictures reached", days: "Practice days", of: (n: number, all: number) => `${n} of ${all}` },

  how: {
    title: "How the gallery works",
    points: [
      "Every picture here is drawn truly, all the time. Nothing is covered up and nothing is switched on later.",
      "A depth picture is a field of dots. Its shape is there only as a step in depth, so one eye alone sees dots and nothing else.",
      "A faint picture is a shape only a little darker than the grey around it.",
      "A picture is marked as reached by your own check-up results. Nothing you press can mark one.",
      "A mark is never taken away. A later check-up that comes out worse leaves the gallery as it was.",
    ],
    honest: "The gallery does not say that your eyes will reach a picture. It shows where your own check-ups stand today, and it keeps what you did by showing up.",
  },

  reached: (date: string) => `Reached on ${date}`,
  notReached: "Not reached yet",
  showsWhat: "What it shows",

  depth: {
    title: "Depth pictures",
    intro: "Put on the red-cyan glasses and sit where you sit for the Depth check-up. Each picture hides one shape that floats in front of the dots.",
    latest: {
      none: "No Depth check-up taken yet.",
      found: (arcsec: number, date: string) => `Your last Depth check-up, on ${date}, found depth at ${step(arcsec)} arc seconds.`,
      notFound: (date: string) => `Your last Depth check-up, on ${date}, found no depth.`,
    },
    take: "Take the Depth check-up",
    locked: (arcsec: number) => `A picture at ${arcsec} arc seconds`,
    rule: (arcsec: number) => `Reached when a Depth check-up finds depth at ${arcsec} arc seconds or finer.`,
    drawn: (pixels: number, arcsec: number) => `Drawn ${many(pixels, "pixel", "pixels")} apart on this screen: ${step(arcsec)} arc seconds.`,
    cannot: (finest: number) => `This screen cannot show a step this fine. Its finest step is ${step(finest)} arc seconds. A screen that is farther away, or has smaller dots, can.`,
    seeIt: "If you can see a shape here already, the next Depth check-up may find it too.",
    noGlasses: "Without the glasses every dot has a red and a cyan edge. That is how the screen sends a different picture to each eye.",
    noScreen: { title: "This screen has not been measured", body: "A depth step is an angle. It can be drawn truly only on a screen whose size and distance are known.", cta: "Measure this screen" },
    alt: {
      reached: (name: string, arcsec: number) => `${name}, drawn in dots at ${arcsec} arc seconds. It shows through red-cyan glasses.`,
      hidden: (arcsec: number) => `A field of red and cyan dots. A shape is drawn in it at ${arcsec} arc seconds of depth.`,
    },
  },

  faint: {
    title: "Faint pictures",
    weaker: (eye: "left" | "right") => `These are for your weaker eye. Cover your ${otherSide(eye)} eye with your palm and look with your ${side(eye)} eye, as in the Faint letters check-up. No glasses.`,
    both: "Look with one eye at a time, as in the Faint letters check-up. No glasses. A picture is reached when both eyes have reached it.",
    latest: {
      none: (eye: "left" | "right") => `No Faint letters check-up for the ${side(eye)} eye yet.`,
      found: (eye: "left" | "right", logCs: number) => `Your ${side(eye)} eye last read letters at ${faintPercent(logCs)} contrast.`,
    },
    take: "Take the Faint letters check-up",
    locked: (logCs: number) => `A picture at ${faintPercent(logCs)} contrast`,
    rule: (logCs: number) => `Reached when the Faint letters check-up reads ${faintPercent(logCs)} contrast.`,
    drawn: (logCs: number) => `Drawn at ${faintPercent(logCs)} contrast, with the same greys as the check-up.`,
    alt: {
      reached: (name: string, logCs: number) => `${name}, a little darker than the grey around it: ${faintPercent(logCs)} contrast.`,
      hidden: (logCs: number) => `A grey field. A shape is drawn on it at ${faintPercent(logCs)} contrast.`,
    },
  },

  effort: {
    title: "Effort trophies",
    intro: "These come from showing up. A day counts once, however long it was. Nothing here counts points, speed or extra minutes.",
    rule: "A practice day is a day on which the day's practice was done. Days do not have to follow one another, and a day without practice takes nothing away.",
    days: (n: number) => (n === 1 ? "First practice day" : `${n} practice days`),
    weeks: (n: number) => `Practice in ${n} different weeks`,
    progress: (done: number, of: number) => `${done} of ${of}`,
    alt: {
      days: (n: number, got: boolean) => `${got ? "" : "Not reached yet: "}a plant that has grown for ${many(n, "practice day", "practice days")}.`,
      weeks: (n: number, got: boolean) => `${got ? "" : "Not reached yet: "}${n} lanterns on a string, one for each week with practice.`,
    },
  },

  names: {
    kite: "The kite", fish: "The fish", boat: "The boat", bird: "The bird", star: "The star",
    balloon: "The balloon", tree: "The tree", house: "The house", moon: "The moon",
  },
};
