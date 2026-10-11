// Eyes Opener: Words of the workday monitor (/today/monitor). Plain words, one idea in a sentence.
/**
 * Words of the workday monitor (/today/monitor). Plain words, one idea in a sentence.
 * The monitor coaches habits. It does not test eyes, and nothing here says a person's eyes are fine or not fine.
 * Numbers in these words come from src/lib/monitor-rules.ts, where each one names its source.
 */
import { RULE } from "@/lib/monitor-rules";
import { texts } from "@/i18n/texts";

const mins = (n: number) => (n === 1 ? "1 minute" : `${n} minutes`);
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

export const monitor = texts("copy/monitor", "monitor", () => ({
  title: "Workday monitor",
  sub: "Your computer's camera times your screen work and reminds you to look away. Everything it sees stays on this computer.",
  crumb: "Today",

  does: {
    title: "What it does",
    list: [
      "Times how long you have been at the screen since your last break.",
      "Measures how far your eyes are from the screen.",
      "Counts your blinks.",
      "Notices a head that is tilted, or leaning in.",
      `Reminds you quietly to look far away for ${RULE.breakSeconds} seconds after ${RULE.breakEveryMin} minutes of screen work.`,
    ],
  },
  doesNot: {
    title: "What it does not do",
    list: [
      "It does not record. Each camera picture is looked at on this computer and dropped at once. No picture ever leaves it.",
      "It does not read stress, mood or tiredness.",
      "It does not test your eyes, and it never says your eyes are fine.",
      "It does not see where you look. It can only tell that you turned your head or left the seat.",
      "It is not for an employer. A sponsor, a counsellor and IOpener's staff cannot see these numbers.",
    ],
  },
  stored: {
    title: "What is kept",
    body: `Once a minute, a few numbers are saved to your household's account: distance, blinks, head position, minutes since a break and how long a face was in view. They are kept for ${RULE.keepDays} days, then removed. Day totals stay. You can delete the numbers at any time.`,
    notMeasured: "A minute the monitor could not watch properly is not saved at all.",
  },

  evidence: {
    title: "What the research says",
    lines: [
      "In one study, 29 people with screen strain got break reminders checked by a camera. Their strain and dry-eye scores eased within two weeks. The gain was gone a week after the reminders stopped.",
      "In a laboratory study of 30 adults, 20-second breaks made no difference over a 40-minute task. So this is a habit that may help while you keep it up, not a treatment.",
      "People blink less at a screen. In one study of 51 healthy adults it was about 5 times a minute, against about 16 in conversation. No number is agreed as the right one, so the blink reminder only compares you with that screen average.",
    ],
    sources: [
      { label: "Talens-Estarelles and others, 2023, Contact Lens and Anterior Eye: testing the 20-20-20 rule with camera-checked reminders", url: "https://pubmed.ncbi.nlm.nih.gov/35963776/" },
      { label: "Johnson and Rosenfield, 2023, Optometry and Vision Science: 20-20-20 rule, are these numbers justified?", url: "https://pubmed.ncbi.nlm.nih.gov/36473088/" },
      { label: "Occupational Safety and Health Administration (United States): computer workstations, monitors", url: "https://www.osha.gov/etools/computer-workstations/components/monitors" },
      { label: "Freudenthaler and others, 2003, Graefe's Archive: blinking during screen use in 51 healthy adults", url: "https://link.springer.com/article/10.1007/s00417-003-0786-6" },
      { label: "Google Research, 2020: MediaPipe Iris, distance from the width of the iris", url: "https://research.google/blog/mediapipe-iris-real-time-iris-tracking-depth-estimation/" },
    ],
  },

  sure: {
    title: "How sure the numbers are",
    list: [
      "Distance: within about 5 percent once you have set it for this camera. That is 2 to 3 cm at 50 cm.",
      "Blinks: the count is fairly sure in good light, on a computer that can read ten pictures a second. On a slower one the monitor gives no blink number at all.",
      "Half blinks are counted and kept with your numbers, but not shown here. A laptop camera takes too many full blinks for half ones, and nobody has checked that count yet.",
      "Glasses that reflect the screen, and a dim room, make every number less sure.",
      "Nobody has yet checked these numbers against the instruments of an eye clinic.",
    ],
  },

  /* ───────────── who may use it ───────────── */
  child: {
    title: "For grown-ups only",
    body: (name: string) => `${name}'s profile is a child's profile. The workday monitor watches a person at a desk for hours, so it is not offered for children.`,
    switchTo: "Switch to a grown-up's profile:",
    none: "This household has no grown-up's profile yet. A guardian can add one in Settings.",
  },
  lookOnly: "You can look at the numbers here. Starting the monitor is for a guardian.",
  phone: {
    title: "Made for a laptop or a desk computer",
    body: "The monitor times work at a desk screen. On a phone or a tablet you can look at your numbers here, and start it on your computer.",
  },

  consent: {
    title: "Camera consent",
    ask: (name: string) => `The monitor uses this computer's camera for ${name}. A guardian decides.`,
    tick: (name: string) => `I agree that IOpener may use the camera on this computer for ${name}'s workday monitor. Pictures stay on the computer. Only the numbers listed here are saved.`,
    give: "Allow the camera",
    given: (who: string | null, when: string) => (who ? `Camera allowed by ${who} on ${when}.` : `Camera allowed on ${when}.`),
    withdraw: "Withdraw consent",
    withdrawNote: "Withdrawing stops the monitor. The numbers already saved stay until you delete them.",
    needGuardian: "A guardian or co-guardian of this household can allow the camera.",
  },

  /* ───────────── the monitor itself ───────────── */
  panel: {
    title: "Monitor",
    idle: "The camera is off. Nothing is being watched.",
    start: "Start the monitor",
    starting: "Starting",
    stop: "Stop",
    checking: "Checking that this computer can run the monitor.",
    cameraOn: "Camera is on",
    cameraOff: "Camera is off",
    hide: "Hide the picture",
    show: "Show the picture",
    previewAlt: "The picture from your camera, as a mirror",
    previewNote: "Only you see this picture. It is not saved and not sent.",
    hidden: "The picture is hidden. The camera is still on.",
  },
  step: {
    model: "Loading the face finder from this site.",
    server: "Checking consent.",
    camera: "Asking the browser for the camera.",
  },
  watch: {
    yes: "Watching now.",
    nobody: "Watching. Nobody is in view.",
    turned: "Watching. Your head is turned away from the screen.",
    no: "Not watching: no pictures are arriving from the camera. Nothing is saved for this time.",
  },
  live: {
    distance: "Distance to the screen",
    cm: (v: number) => `${Math.round(v)} cm`,
    distanceNotSet: "Not set for this camera yet",
    distanceNone: "Look straight at the screen",
    guide: `${RULE.closeCm} cm or more is the usual advice`,
    since: "Screen work since your last break",
    sinceValue: clock,
    dueIn: (seconds: number) => `A break falls due in ${clock(Math.max(0, RULE.breakEveryMin * 60 - seconds))}`,
    dueNow: "A break is due",
    away: (seconds: number) => `Looking away: ${Math.min(seconds, RULE.breakSeconds)} of ${RULE.breakSeconds} seconds`,
    blinks: "Blinks a minute",
    blinksLast: "in the last full minute",
    blinksNow: (n: number) => `${n} so far this minute`,
    blinksWait: "The first number comes after one full minute",
    blinksBlind: "Blinks cannot be counted: the pictures come too slowly on this computer or in this window.",
    head: "Head",
    level: "Level",
    tilted: (deg: number) => `Tilted about ${Math.round(Math.abs(deg))} degrees`,
    noHead: "Not in view",
  },
  setUp: {
    title: "Set the distance once",
    body: "Sit the way you work. Measure from the corner of your eye to the camera with a tape or a ruler. Type the distance, look straight at the camera and hold still.",
    label: "Distance in centimetres",
    go: "Set",
    again: "Set the distance again",
    from: (cm: number) => `Setup measured ${cm} cm for this household's screen. Use that number only if you are sitting at that distance now.`,
    setAt: (cm: number) => `Set at ${cm} cm for this camera.`,
    working: "Hold still.",
    result: {
      ok: "Set. The monitor now reads your distance.",
      too_few: "The camera could not see your eyes well enough. Look straight at it, hold still and press Set again.",
      moving: "You moved while it was reading. Hold still for two seconds and press Set again.",
      distance: "That distance does not fit what the camera sees. Measure again and type the number in centimetres.",
    },
  },
  prompt: {
    region: "Reminders",
    break: {
      title: `Look far away for ${RULE.breakSeconds} seconds`,
      body: (seconds: number) => `${mins(Math.floor(seconds / 60))} at the screen without a break. Look at something 6 metres away or more. Turn your head, or press the button and look past the screen.`,
      start: `Start ${RULE.breakSeconds} seconds`,
      later: `Later, in ${RULE.laterMin} minutes`,
      timed: (left: number) => `Keep looking far away. ${left} seconds left.`,
      cancel: "Stop the count",
      seen: (seconds: number) => `Looking away: ${Math.min(seconds, RULE.breakSeconds)} of ${RULE.breakSeconds} seconds.`,
    },
    close: {
      title: "Sit back a little",
      body: (cm: number | null) => `${cm === null ? "You have been close to the screen" : `You have been about ${Math.round(cm)} cm from the screen`} for ${RULE.closeMinutes} minutes. ${RULE.closeCm} cm or more is the usual advice. If the words are too small, make them bigger.`,
    },
    blink: {
      title: "Blink slowly and fully",
      body: `Fewer than ${RULE.lowBlinks} blinks a minute for ${RULE.lowBlinkMinutes} minutes. Close your eyes gently, pause, then open them. Do it a few times.`,
      link: "Open the full-blink routine",
    },
    tilt: {
      title: "Level your head",
      body: `Your head has been tilted to one side for ${RULE.tiltMinutes} minutes. Sit square to the screen, or move the screen in front of you.`,
    },
    notNow: "Not now",
    taken: "Break taken. Your 20 minutes start again.",
    takenEarned: "Break taken. It goes towards today's Rest ring, unless the ring already has one from the last 20 minutes.",
  },
  stopped: {
    ended: "The monitor was started somewhere else for this profile, so it stopped here.",
    consent: "Camera consent is no longer in place. The monitor stopped.",
    not_allowed: "The monitor cannot run for this profile.",
    camera: "The camera stopped giving pictures, so the monitor stopped.",
    model: "The face finder stopped working, so the monitor stopped.",
    saveFailed: "The last minute could not be saved. The monitor keeps going and will try again.",
  },
  problem: {
    no_model: "The workday monitor is not available on this server. The file it needs to find a face is missing.",
    no_runtime: "The workday monitor is not available on this server. The files it needs to run are missing.",
    no_graphics: "This browser cannot run the monitor. It needs WebGL, and WebGL is switched off here.",
    failed: "The monitor could not start on this computer.",
    unsupported: "This browser does not let a web page use the camera.",
    denied: "The camera is blocked for this site. Allow it next to the address at the top of the browser, then press Start again.",
    none: "No camera was found on this computer.",
    busy: "Another program is using the camera. Close it, then press Start again.",
    noPicture: "The camera opened but gave no picture. Check that its cover is open, then press Start again.",
  },

  /* ───────────── running while you work ───────────── */
  work: {
    title: "While you work",
    whenTitle: "When it watches, and when it does not",
    when: [
      "It watches while the camera is on and this page is getting pictures from it. The line beside \"Camera is on\" says which, second by second.",
      "Behind another tab or window, a browser may slow this page or stop the pictures. The monitor then says \"Not watching\" and saves nothing for that time. It never fills a gap in.",
      "It stops when you press Stop, leave or close this page, or the computer goes to sleep.",
    ],
    settings: "Reminders, sound and a second screen",
    pipBody: "Keep a small window on top of your work. It shows your reminders, and the monitor keeps its full pace while it is open.",
    pipOpen: "Open the small window",
    pipClose: "Close the small window",
    pipTitle: "IOpener monitor",
    pipIdle: "The monitor is not running.",
    noPip: "This browser has no small on-top window. Keep this page in a window of its own at the side of your screen, where it stays in view.",
    tested: "Tried in Chrome on a desk computer: the monitor kept watching behind another tab. Other browsers were not tried.",
    notices: "Show a reminder as a system notice when this page is out of view",
    noticesBlocked: "System notices are blocked for this site in the browser.",
    noticesNone: "This browser has no system notices for web pages.",
    sound: "Play a soft sound with a reminder",
    sideScreen: "I also work on a second screen to the side. Count a turned head as screen work, not as a break.",
    which: "Reminders to show",
    kinds: { break: "Look-away breaks", close: "Sit back", blink: "Blink fully", tilt: "Head tilt" },
    limit: `No reminder of one kind comes twice within ${RULE.sameKindMin} minutes, and only one shows at a time. Nothing flashes.`,
  },

  /* ───────────── afterwards ───────────── */
  after: {
    today: "Today",
    stat: { measured: "measured today", breaks: "breaks taken of those due" },
    measured: (minutes: number) => (minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} h ${minutes % 60} min`),
    ofDue: (taken: number, due: number) => `${taken} of ${due}`,
    rows: {
      measured: "Time measured",
      distance: "Usual distance",
      close: "Minutes closer than 50 cm",
      blinks: "Blinks a minute",
      posture: "Head level and sitting back",
      due: "Breaks that fell due",
      taken: "Of those, taken",
      early: "Breaks taken early",
      ring: "Rest ring today",
    },
    closeOf: (close: number, all: number) => `${close} of ${all}`,
    share: (v: number) => `${Math.round(v * 100)}%`,
    ring: (rest: number, goal: number) => `${rest} of ${goal} breaks`,
    ringNote: `The monitor adds one break to the Rest ring for every ${RULE.breakEveryMin} minutes of screen work that end in a look-away. It never adds more than one in ${RULE.ringEveryMin} minutes. A break you also logged in a care companion is counted once.`,
    charts: {
      title: "Today, in ten-minute steps",
      titleFor: (day: string) => `${day}, in ten-minute steps`,
      distance: "Distance to the screen, cm",
      blinks: "Blinks a minute",
      breaks: "Breaks",
      guide: "50 cm",
      due: "fell due",
      taken: "taken",
      hatch: "Hatching: nothing was measured.",
      hint: "Move over the chart, or use the left and right arrow keys, to read a ten-minute step.",
      alt: "Three small charts of one day: distance to the screen, blinks a minute, and breaks, in ten-minute steps. The same numbers are in the table below.",
      tip: {
        none: "Nothing measured",
        measured: (n: number) => `${mins(n)} measured`,
        distance: (v: number | null) => (v === null ? "Distance: not measured" : `Distance: ${Math.round(v)} cm`),
        blinks: (v: number | null) => (v === null ? "Blinks: not measured" : `Blinks: ${Math.round(v)} a minute`),
        breaks: (due: number, taken: number) => (due || taken ? `Breaks: ${due} fell due, ${taken} taken` : ""),
      },
      table: "Show this day as a table",
      cols: { hour: "Hour", measured: "Minutes measured", distance: "Distance, cm", blinks: "Blinks a minute", due: "Breaks due", taken: "Breaks taken" },
    },
    week: {
      title: "The last 7 days",
      measured: "Time measured, minutes",
      distance: "Usual distance, cm",
      blinks: "Blinks a minute",
      breaks: "Breaks taken of those due",
      none: "not measured",
      note: "Each number is your own. Hatching is a day with nothing measured.",
    },
    empty: { title: "Nothing measured yet", today: "Nothing measured today yet", thatDay: "Nothing was measured that day", body: "Start the monitor and work for a few minutes. Your numbers appear here." },
  },
  data: {
    title: "Your numbers",
    who: (name: string) => `These are ${name}'s numbers. Only the grown-ups of this household can open this page.`,
    forget: "Delete the monitor's numbers",
    forgetNote: (name: string) => `This deletes every one-minute number and every run of the monitor for ${name}. Breaks already on the Rest ring stay.`,
    confirm: "Yes, delete them",
    forgotten: (n: number) => (n === 1 ? "1 one-minute number was deleted." : `${n} one-minute numbers were deleted.`),
    failed: "The numbers could not be deleted.",
  },
}));
