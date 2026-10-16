// Eyes Opener: Guides for the lazy-eye group: the two-eye cinema, the routines that go with a prescribed patch, glasses or.
/**
 * Guides for the lazy-eye group: the two-eye cinema, the routines that go with a prescribed patch, glasses or
 * atropine drops, and the three one-eye drills.
 * A patch, glasses and drops are prescribed by an eye doctor. Every guide here says so, and none sets hours, days or a dose.
 */
import type { Guide, Measure, Source } from "./types";
import { textsEach } from "@/i18n/texts";
import { GUIDE_WORDS } from "./words";

/* ── sources (each opened or confirmed when this file was written) ── */

const XIAO: Source = {
  label: "Xiao and others, 2022, Ophthalmology: randomised trial of two-eye video for lazy eye in children aged 4 to 7",
  url: "https://www.sciencedirect.com/science/article/pii/S0161642021006825",
};
const WYGNANSKI: Source = {
  label: "Wygnanski-Jaffe and others, 2023, Ophthalmology: two-eye home video with coloured glasses compared with patching",
  url: "https://www.sciencedirect.com/science/article/pii/S0161642022008351",
};
const PATCH_HOURS: Source = {
  label: "Pediatric Eye Disease Investigator Group, 2003, Archives of Ophthalmology: two hours of daily patching compared with six",
  url: "https://pubmed.ncbi.nlm.nih.gov/12742836/",
};
const NEAR_OR_FAR: Source = {
  label: "Pediatric Eye Disease Investigator Group, 2008, Ophthalmology: near compared with distance activities while patching",
  url: "https://www.sciencedirect.com/science/article/abs/pii/S016164200800643X",
};
const GLASSES_ALONE: Source = {
  label: "Cotter and the Pediatric Eye Disease Investigator Group, 2006, Ophthalmology: glasses alone for lazy eye from unequal focus",
  url: "https://www.sciencedirect.com/science/article/abs/pii/S016164200600385X",
};
const ATROPINE_OR_PATCH: Source = {
  label: "Pediatric Eye Disease Investigator Group, 2002, Archives of Ophthalmology: atropine drops compared with patching",
  url: "https://pubmed.ncbi.nlm.nih.gov/11879129/",
};
const ATROPINE_DAYS: Source = {
  label: "Pediatric Eye Disease Investigator Group, 2004, Ophthalmology: weekend atropine compared with daily atropine",
  url: "https://www.sciencedirect.com/science/article/abs/pii/S0161642004009303",
};
const HOW_TO_DROPS: Source = {
  label: "American Academy of Ophthalmology: How to put in eye drops",
  url: "https://www.aao.org/eye-health/treatments/how-to-put-in-eye-drops",
};
const ADULT_TRAINING: Source = {
  label: "Tsirlin and others, 2015, Investigative Ophthalmology and Visual Science: pooled studies of visual training for adults with lazy eye",
  url: "https://iovs.arvojournals.org/article.aspx?articleid=2363050",
};
const LEARNING_REVIEW: Source = {
  label: "Levi and Li, 2009, Vision Research: review of practice on visual tasks (perceptual learning) as a treatment for lazy eye",
  url: "https://www.sciencedirect.com/science/article/pii/S0042698909000546",
};
const CROWDING: Source = {
  label: "Hussain and others, 2012, Journal of Neuroscience: practice reduces crowding in adults with lazy eye",
  url: "https://www.jneurosci.org/content/32/2/474",
};

/* ── shared lines ── */

/** Every guide stops for these. */
const STOP = ["Double vision that stays after a short rest", "A headache", "Eye pain", "Feeling dizzy or sick"];
const SKIN = "The skin under the patch is sore, red or broken. Leave the patch off and tell the eye doctor.";
const UPSET = "The child is very upset by the patch. Stop for now and tell the eye doctor. Do not force it.";
const ONE_EYE_SHUT = "Closing or covering one eye again and again to watch";
const GLASSES_HURT = "The glasses pinch, rub a sore place or sit crooked. Have them adjusted where they were made.";

const PATCH_NEED = "The patch the eye doctor prescribed. It goes on the stronger eye.";
const PATCH_ON = "Put the patch on the stronger eye as the eye doctor showed, with any prescribed glasses on as well.";
const PATCH_PART = "This is part of the patch time the eye doctor prescribed, not extra time. Eyes Opener never sets or changes the patch hours.";
const WRONG_EYE = "Patching the weaker eye. The patch goes on the stronger eye.";
const LENS = "Put the red-cyan glasses on with the cyan (blue-green) lens over the weaker eye. Your eye settings say which eye that is.";
const DRILL_NEED = [
  "A patch, or a clean cover, for the stronger eye.",
  "Your own prescribed glasses, if you have them. No red-cyan glasses for this drill.",
  "This screen, with a keyboard, a remote or a touch screen.",
  "A room with soft, even light and nothing reflected in the screen.",
];
const DRILL_SETUP = [
  "Cover the stronger eye with the patch. Keep your own glasses on.",
  "Sit at the distance this screen was set up for (about 60 cm for a laptop, 40 cm for a phone) and stay there.",
  "Turn the screen so that no lamp or window is reflected in it.",
];
const DRILL_STOP = [...STOP, "The picture swims or shimmers and does not settle after a rest"];
const SAME_SEAT = "Your head stays at the same distance from the screen from start to finish.";
const COVERED = "The stronger eye stays fully covered the whole time.";
const LEAN_IN = "Leaning closer when it gets hard. That makes the task easier and the number wrong.";
const PEEK = "Peeking with the stronger eye round the edge of the patch.";

const typed = (key: string, label: string, unit: string, how: string, max: number, step: number, better: Measure["better"]): Measure =>
  ({ key, label, unit, how, from: "typed", min: 0, max, step, better });
const auto = (key: string, label: string, unit: string, how: string, max: number, step: number, better: Measure["better"]): Measure =>
  ({ key, label, unit, how, from: "auto", min: 0, max, step, better });

const hoursOfGlasses = typed(
  "hours_worn", "Hours the glasses were worn today", "hours",
  "Count the hours awake today, then take away any time the glasses were off. Half an hour counts as 0.5.",
  18, 0.5, "higher",
);

export const guides: Guide[] = textsEach("data/guides/lazy-eye", () => [
  /* ── the two-eye cinema ── */
  {
    slug: "cinema-session",
    what: "Watching a film in Eyes Opener's two-eye cinema through red-cyan glasses. Both eyes see the picture, but the stronger eye sees it fainter, so the weaker eye has to join in. This is the main daily practice for lazy eye.",
    need: [
      "Red-cyan glasses. Wear them over your own glasses if an eye doctor prescribed any.",
      "A TV, or the largest screen in the house that can open Eyes Opener.",
      "A film or a show saved as a file on that device. The cinema plays files from the device, not streaming sites.",
      "A room where no lamp or window shines on the screen.",
    ],
    setup: [
      "Open the two-eye cinema and choose the film from this device.",
      "Sit facing the middle of the screen at the distance it was set up for: about 2 metres from a TV, about 60 cm from a laptop.",
      LENS,
      "Look at the stronger-eye contrast shown beside the film: how faint the picture is for the stronger eye. It comes from your eye settings.",
    ],
    steps: [
      "Press play on the film. The session clock starts, and it runs only while the film plays.",
      "Watch with both eyes open. After every 10 minutes of watching the cinema pauses the film for an eye break. Those 10 minutes are one chapter.",
      "Keep the glasses on for the whole chapter. No looking over or under them.",
      "In the break, take the glasses off and look at something far away, 6 metres or more, until the countdown ends. It lasts at least 20 seconds. Rest for longer if you like.",
      "Press \"Carry on watching\" for the next chapter, or \"End the session here\" and come back later in the day. Six chapters make the daily hour.",
      "Press \"Finish now\" when you stop. The time watched is saved. The film stops by itself when today's minutes are used.",
      "Do this six days a week and take one day off.",
    ],
    right: [
      "With both eyes open you see one whole picture. Its colours look washed out: that is normal through these glasses.",
      "The time watched climbs while the film plays and stands still when it is paused and during an eye break.",
      "The child can tell you what is happening in the story.",
    ],
    measures: [],
    stop: [...STOP, ONE_EYE_SHUT],
    mistakes: [
      "Glasses the wrong way round. The cyan lens belongs over the weaker eye.",
      "Counting ordinary TV as practice. Only time in the two-eye cinema with the glasses on counts.",
      "One long sitting with a young child. Sittings of about 20 minutes, two chapters, are easier to keep up for weeks.",
      "Sitting much closer or further away than the distance this screen was set up for.",
    ],
    tool: { kind: "cinema" },
    evidence: "A trial of two-eye video (one hour a day, six days a week, 12 weeks) found a gain of about 1.8 lines on the letter chart, against 0.8 with glasses alone. It used a headset. Red-cyan glasses at a TV follow the same idea; this cinema itself is untested.",
    sources: [XIAO, WYGNANSKI],
  },
  {
    slug: "three-chapter-cinema-plan",
    what: "A way to fit the daily cinema hour into a school day: three sittings of 20 minutes, after school, before dinner and before bed. Each sitting is done exactly like a Cinema Session.",
    need: [
      "Red-cyan glasses, kept beside the screen.",
      "A TV, or the largest screen in the house that can open Eyes Opener.",
      "A long film or a series saved as files on that device, so there is always a next part to watch.",
      "Three times in the day that the family can keep.",
    ],
    setup: [
      "Pick the three times: after school, before dinner and before bed work for most school days.",
      "Leave the glasses beside the screen so nobody has to hunt for them.",
      "Choose the film beforehand, and note where each sitting stops so the next one can start there.",
    ],
    steps: [
      "After school, open the two-eye cinema and put the glasses on, cyan (blue-green) lens over the weaker eye.",
      "Press play and watch for 20 minutes with both eyes open. The cinema pauses the film once, after 10 minutes, for a short eye break.",
      "Press \"Finish now\". The page shows the time watched in that sitting.",
      "Before dinner, watch the second 20 minutes the same way.",
      "Before bed, watch the third 20 minutes the same way.",
      "Look at the Train ring on the Today page: the three sittings should add up to about 60 minutes.",
      "Make up a missed sitting later the same day. Minutes cannot be carried over to tomorrow.",
      "Keep to six days a week, with one day off.",
    ],
    right: [
      "Each sitting starts at about the same time every day.",
      "The Train ring on the Today page shows about 60 minutes at the end of the day.",
      "The child knows which part of the story comes next.",
    ],
    measures: [],
    stop: [...STOP, ONE_EYE_SHUT],
    mistakes: [
      "Leaving all three sittings for the evening, when the child is tired.",
      "Skipping the glasses for a short sitting. Without them the film is ordinary TV.",
      "Running one sitting long to finish the story and then dropping the next one.",
    ],
    tool: { kind: "cinema" },
    evidence: "The trial behind this gave one hour a day, six days a week. No trial compared one sitting with three. Splitting the hour is a practical way to fit it into the day, not a tested dose.",
    sources: [XIAO],
  },

  /* ── with a prescribed patch ── */
  {
    slug: "patch-time-detail-tasks",
    what: "Close, careful tasks for the time the patch is on: tracing, dot-to-dot and bead threading. They give the child something to do with the weaker eye and help the patch stay on. The eye doctor sets the patch hours.",
    need: [
      PATCH_NEED,
      "Tracing and dot-to-dot sheets with a pencil, or a drawing app on a tablet. Under age 4 use paper, not a screen.",
      "Large beads and a lace with a stiff end.",
      "A table and a bright light.",
    ],
    setup: [
      PATCH_ON,
      "Check there is no gap beside the nose that the child can look through.",
      "Lay out three or four tasks so the next one is ready. The work sits about 30 to 40 cm from the child's eyes.",
      "Press \"Start timer\". Time the tasks only. The whole patch time goes in the Patch Wear Timer.",
    ],
    steps: [
      "Trace one picture. The pencil follows the line from its start to its end.",
      "Join one dot-to-dot picture in number order.",
      "Thread ten beads onto the lace.",
      "Change to a new task when the child tires of one, about every 5 to 10 minutes.",
      "Praise the patch staying on, not how neat the work is.",
      "When the child has had enough, press \"Stop timer\". The patch stays on for the rest of the prescribed time.",
      "Type how many tasks were finished and press \"Save this routine\".",
    ],
    right: [
      "The patch stays flat on the skin and the child does not look round it.",
      "The child looks at the work with the head straight, not turned to find a gap.",
      "The tasks need care but are not so hard that the child gives up.",
    ],
    measures: [
      typed(
        "tasks_done", "Tasks finished with the patch on", "",
        "Count each finished tracing sheet, each dot-to-dot picture and each string of ten beads as one task. Type the total for this sitting.",
        60, 1, "none",
      ),
    ],
    stop: [...STOP, SKIN, UPSET],
    mistakes: [
      WRONG_EYE,
      "Letting the child lift a corner of the patch for the hard parts.",
      "Changing the patch hours because a day went well or badly. Only the eye doctor changes them.",
      "Treating the tasks as the treatment. The patch is the treatment; the tasks help it stay on.",
    ],
    tool: { kind: "timer" },
    evidence: "Early patching trials asked for an hour of close work with the patch on. A later trial of 425 children tested that, and near tasks gave no more gain than distance ones. These tasks keep the patch on and the child busy. They are not shown to add benefit.",
    sources: [NEAR_OR_FAR, PATCH_HOURS],
  },
  {
    slug: "patch-wear-timer",
    what: "A count of the hours the patch is really worn each day, with a sticker chart that shows the child the hours adding up. The eye doctor prescribes the hours. This routine only records them.",
    need: [
      PATCH_NEED,
      "A clock, and this page on a phone.",
      "A sticker chart on the wall: one row for each day and one box for each prescribed hour.",
      "Stickers the child likes.",
    ],
    setup: [
      "Write the prescribed hours at the top of the chart. They come from the eye doctor. Eyes Opener never sets or changes them.",
      PATCH_ON,
      "Patch time is hours long, so this page has no stopwatch. Go by the clock on the wall and note the times on the chart.",
    ],
    steps: [
      "The moment the patch goes on, write the clock time on the chart.",
      "Let the child get on with the day: play, drawing, meals, a film. The patch works during anything done awake.",
      "Each time a full hour has passed, the child puts one sticker on the chart.",
      "If the patch comes off, write down the time. Write the time again when it goes back on.",
      "When today's prescribed hours are done, take the patch off gently and note the time.",
      "Add up the time the patch was really on. Leave out any time it was off.",
      "Press \"Fill in today's log\", type the hours worn today and press \"Save today's log\".",
    ],
    right: [
      "The hours typed match the clock, not the plan. A day with one hour is written as 1.",
      "The hours never go above what the eye doctor prescribed.",
      "The child puts the stickers on and can say how many are left today.",
    ],
    measures: [
      typed(
        "hours_worn", "Hours the patch was worn today", "hours",
        "Take the clock time the patch came off minus the time it went on, less any time it was off in between. Half an hour counts as 0.5.",
        16, 0.25, "none",
      ),
    ],
    stop: [
      ...STOP, SKIN, UPSET,
      "The stronger eye seems to see worse after the patch comes off. Tell the eye doctor before the next patch day.",
    ],
    mistakes: [
      "Writing down the prescribed hours instead of the hours really worn.",
      "Patching for extra hours to catch up. More is not better: ask the eye doctor.",
      "Counting time when the patch was pushed up or looked round.",
      WRONG_EYE,
    ],
    tool: { kind: "log" },
    evidence: "Patching is standard care for lazy eye. In a trial of 189 children under 7 with moderate lazy eye, two hours a day worked as well as six. No trial tested this timer or the sticker chart.",
    sources: [PATCH_HOURS],
  },
  {
    slug: "bead-threading",
    what: "Threading beads onto a string while the patch is on. It is close, careful work that keeps a young child busy and looking with the weaker eye during patch time.",
    need: [
      PATCH_NEED,
      "Beads with a hole the child can manage: about 1 cm across for ages 3 to 5, smaller for ages 6 to 8.",
      "A lace or string with a stiff end, and a knot at the other end.",
      "A tray or bowl so the beads do not roll away, and a bright light.",
    ],
    setup: [
      PATCH_ON,
      PATCH_PART,
      "Sit the child at a table with the tray about 30 cm from the eyes. Stay beside the child: small beads are a choking risk.",
      "Press \"Start timer\".",
    ],
    steps: [
      "The child picks up one bead with finger and thumb.",
      "The child finds the hole and pushes the stiff end of the string through it.",
      "The child slides the bead down to the knot and picks up the next one.",
      "Carry on for 15 to 20 minutes. Make it a game: a colour pattern, or a necklace for someone.",
      "If it is too easy, change to smaller beads. If it is too hard, change to bigger ones.",
      "Press \"Stop timer\" and count the beads on the string together.",
      "Type the number of beads and press \"Save this routine\".",
    ],
    right: [
      "The child looks at the hole while threading, not away from it.",
      "The patch stays flat on the skin, with no looking round it.",
      "The same size of bead is used from day to day, so the counts can be compared.",
    ],
    measures: [
      typed(
        "beads", "Beads threaded", "",
        "Count the beads on the string at the end of the sitting. Use the same size of bead each day so the numbers can be compared.",
        500, 1, "higher",
      ),
    ],
    stop: [...STOP, SKIN, UPSET, "The child puts beads in the mouth, nose or ears. Stop and choose another task."],
    mistakes: [
      "Beads so big that no careful looking is needed, or so small that the child gives up.",
      "Letting the child lift the patch to find the hole.",
      "Leaving a young child alone with small beads.",
    ],
    tool: { kind: "timer" },
    evidence: "No trial tested bead threading on its own. A trial of 425 children found that near tasks while patching gave no more gain than distance ones. Threading keeps the patch on and the child busy. It is not shown to add benefit.",
    sources: [NEAR_OR_FAR, PATCH_HOURS],
  },
  {
    slug: "patch-on-ball-play",
    what: "Rolling, bouncing and catching a soft ball while the patch is on. It keeps patch time active and gives the child something moving to follow with the weaker eye.",
    need: [
      PATCH_NEED,
      "A soft, light ball about 15 to 20 cm across, such as a foam ball or a beach ball.",
      "A clear space about 3 metres long with nothing to trip over.",
      "An adult or an older child to play with.",
    ],
    setup: [
      PATCH_ON,
      PATCH_PART,
      "Clear the floor. With one eye covered the child sees less to that side and judges distance less well.",
      "Stand 2 metres apart (1 metre for a 3-year-old) and press \"Start timer\".",
    ],
    steps: [
      "Roll the ball along the floor to each other ten times.",
      "Bounce it once on the floor to each other ten times.",
      "Throw it gently underarm for the child to catch with two hands. Do a few for practice.",
      "Now the count: throw 20 times from the same spot and count the catches out loud together.",
      "Play on freely until 10 minutes are up.",
      "Press \"Stop timer\", type the catches out of 20 and press \"Save this routine\".",
    ],
    right: [
      "The child watches the ball all the way into the hands.",
      "The throws are slow and gentle, from the same distance every day.",
      "The patch stays on and flat during the play.",
    ],
    measures: [
      typed(
        "catches", "Catches out of 20 throws", "of 20",
        "Throw the ball 20 times from the same distance each day. Count every throw the child catches and holds.",
        20, 1, "higher",
      ),
    ],
    stop: [...STOP, SKIN, UPSET, "The child trips or bumps into things. Stop, clear more space or play sitting down."],
    mistakes: [
      "A hard or small ball. With one eye covered a ball is harder to judge, so use a soft one.",
      "Playing near stairs, a road, water or furniture with sharp corners.",
      "Changing the throwing distance from day to day. The count then means nothing.",
    ],
    tool: { kind: "timer" },
    evidence: "No trial tested ball play with a patch. The trial of activities while patching found distance activities did as well as near ones. Ball play keeps patch time active. It is not shown to add benefit.",
    sources: [NEAR_OR_FAR, PATCH_HOURS],
  },

  /* ── with prescribed glasses ── */
  {
    slug: "glasses-first-log",
    what: "New glasses worn all day, with the hours written down each evening and the letter size checked every five weeks. For many children glasses alone improve a lazy eye, so they come before any patch or training.",
    need: [
      "The glasses the eye doctor prescribed, fitted so they do not slide down the nose.",
      "A strap or curved ear pieces, if a young child keeps pulling them off.",
      "This page, once a day, in the evening.",
    ],
    setup: [
      "Ask the eye doctor how many hours a day the glasses are to be worn. For a lazy eye it is usually all waking hours. Eyes Opener never sets or changes this.",
      "Note today's date as the start. The log runs for 18 to 30 weeks, until the eye doctor says the gain has levelled off.",
      "Keep the glasses beside the bed so they go on first thing.",
    ],
    steps: [
      "Put the glasses on as soon as the child wakes.",
      "Keep them on all day: school, play, meals, screens. They come off only for sleep and washing, or as the eye doctor said.",
      "In the evening work out the hours worn: the hours awake, less any time the glasses were off.",
      "Type the hours on this page and save.",
      "Every five weeks do the Letter size check-up, one eye at a time, with the glasses on.",
      "Take the log and the check-up results to each visit. The eye doctor decides what comes next.",
    ],
    right: [
      "The hours in the log are close to the hours the child is awake.",
      "The glasses sit straight and high on the nose, and the child looks through the lenses, not over the top.",
      "The Letter size check-up is done on the same screen, from the same distance, every time.",
    ],
    measures: [hoursOfGlasses],
    stop: [
      ...STOP,
      "Things still look blurred, tilted or double through the new glasses after two weeks. Go back to the eye doctor.",
      GLASSES_HURT,
    ],
    mistakes: [
      "Wearing the glasses only for school or reading when they were prescribed for all waking hours.",
      "Looking over the top of glasses that have slipped down.",
      "Judging after two or three weeks. In the study the gain went on for up to 30 weeks.",
      "Starting a patch or training early. The eye doctor says when glasses have done their part.",
    ],
    tool: { kind: "log" },
    evidence: "In a study of 84 children aged 3 to 6 with a lazy eye from unequal focus, glasses alone improved sight by two lines or more in 77%, and 27% no longer had a lazy eye. Sight was checked every five weeks, and the gain took up to 30 weeks.",
    sources: [GLASSES_ALONE],
  },
  {
    slug: "glasses-check-in",
    what: "A ten-second look each day to see that the glasses are on, and a note of the hours worn, which gives a wear score for the week. It supports wearing the glasses for the hours the eye doctor prescribed.",
    need: [
      "The glasses the eye doctor prescribed.",
      "This page on a phone.",
      "A fixed time for the check, such as breakfast.",
    ],
    setup: [
      "Find out the prescribed hours from the eye doctor. Eyes Opener never sets or changes them.",
      "Pick one time of day for the check and keep to it.",
      "The camera check is not built yet. Do the check by looking, and type the hours by hand.",
    ],
    steps: [
      "At check time, look at the child. Are the glasses on?",
      "See that they sit straight and high on the nose, with the eyes behind the middle of the lenses.",
      "Wipe the lenses if they are smeared.",
      "In the evening work out today's hours: the hours awake, less any time the glasses were off.",
      "Type the hours on this page and save.",
      "Once a week add up the seven days and divide by the prescribed hours for the week. That is the wear score.",
      "An example, not a target: 63 hours worn out of 84 prescribed is a score of 75 out of 100.",
    ],
    right: [
      "The check takes about ten seconds and happens at the same time every day.",
      "The hours typed are the hours really worn, even on a bad day.",
      "The weekly score is talked over kindly with the child. It is not a telling-off.",
    ],
    measures: [hoursOfGlasses],
    stop: [
      ...STOP,
      "The child says things look blurred or double through the glasses. Go back to the eye doctor.",
      GLASSES_HURT,
    ],
    mistakes: [
      "Seeing the glasses on at check time and forgetting the rest of the day. The hours are the record.",
      "Guessing the hours at the end of the week instead of noting them each evening.",
      "Leaving bent or scratched glasses unmended, so the child stops wearing them.",
    ],
    tool: { kind: "log" },
    evidence: "No trial tested a daily check-in. It supports the glasses the eye doctor prescribed: in a study of 84 children, glasses alone improved a lazy eye by two lines or more in 77%.",
    sources: [GLASSES_ALONE],
  },

  /* ── with prescribed atropine drops ── */
  {
    slug: "atropine-day-companion",
    what: "An alarm and a quick record for the days the eye doctor prescribed an atropine drop. The drop blurs close things for the stronger eye, so the weaker eye takes over for close work. Eyes Opener never sets or changes the drop days or the dose.",
    need: [
      "The atropine drops, and the eye doctor's written plan: which eye, which days, what time.",
      "A phone alarm for drop time. Eyes Opener does not send reminders yet.",
      "Clean hands and a tissue.",
      "Things for close work afterwards: books, drawing, puzzles, beads.",
    ],
    setup: [
      "Read the eye doctor's plan: which eye (the stronger one), which days, what time.",
      "Set a phone alarm for that time on every drop day.",
      "Keep the bottle as the label says, out of the child's reach. Atropine is harmful if swallowed.",
    ],
    steps: [
      "On a drop day, when the alarm goes, wash your hands.",
      "Check the label and the eye. The drop goes in the stronger eye only.",
      "Give the drop the way the eye doctor or nurse showed: head tilted back, lower lid pulled down gently, the drop into the pocket, the tip touching nothing.",
      "The child closes the eye gently while you press lightly on its inner corner, by the nose, for a minute. Then wash your hands again.",
      "On this page type 1 for a drop given, or 0 for a drop day that was missed, and save.",
      "Offer close work with any prescribed glasses on: reading, drawing, puzzles.",
      "Outdoors, give the child a hat or sunglasses. The drop keeps the pupil wide, so bright light is uncomfortable.",
    ],
    right: [
      "The log shows a 1 on every drop day in the plan, and nothing on the other days.",
      "The pupil of the stronger eye looks larger than the other one. That is the drop at work.",
      "The child still manages close work, now with the weaker eye doing it.",
    ],
    measures: [
      typed(
        "drops_given", "Drop given today: 1 for given, 0 for missed", "",
        "Type 1 if today's prescribed drop went in. Type 0 if today was a drop day and it was missed. Log nothing on a day with no drop in the plan.",
        1, 1, "none",
      ),
    ],
    stop: [
      ...STOP,
      "After a drop: a hot red face, a fever, a very dry mouth, a racing heart or unusual restlessness. Give no more drops and get medical help the same day.",
      "A red, sore or swollen eye or eyelid after the drop. Tell the eye doctor before the next drop.",
    ],
    mistakes: [
      "Putting the drop in the weaker eye. It goes in the stronger eye.",
      "Giving an extra drop to make up for a missed day. Keep to the plan and ask the eye doctor about missed days.",
      "Changing the drop days because sight seems better or worse. Only the eye doctor changes the plan.",
      "Leaving the bottle where a child can reach it.",
    ],
    tool: { kind: "log" },
    evidence: "In a trial of 419 children under 7 with moderate lazy eye, a daily atropine drop worked about as well as patching over six months. A later trial found weekend drops did as well as daily ones. No trial tested an alarm or a log for atropine.",
    sources: [ATROPINE_OR_PATCH, ATROPINE_DAYS, HOW_TO_DROPS],
  },

  /* ── one-eye drills for teens and adults ── */
  {
    slug: "contrast-ladder",
    what: "A drill for the weaker eye alone. A round patch of stripes leans left or right, and the stripes get fainter each time you answer right. It practises seeing faint detail, which is called contrast sensitivity.",
    need: DRILL_NEED,
    setup: [...DRILL_SETUP, "Press Start."],
    steps: [
      "Look at the round patch of stripes in the middle of the grey screen.",
      "Decide which way the stripes lean: to the left or to the right.",
      "Press Left or Right, or tap the left or right half of the screen.",
      "Watch what happens: after a right answer the stripes get fainter, after a wrong one they get stronger.",
      "Guess when you cannot tell. A guess keeps the ladder moving.",
      "Take your time and blink as usual. No answer is timed.",
      "After 10 minutes press \"Finish now\". The screen saves the faintest stripes you still answered right.",
    ],
    right: [
      "Near the end the stripes are so faint that you are right only some of the time. That is your limit, and it is where the practice is.",
      SAME_SEAT,
      COVERED,
    ],
    measures: [
      auto(
        "contrast_pct", "Faintest stripes still answered right", "%",
        "The screen measures this. Contrast is how much the stripes stand out from the grey, in percent. The number is the lowest contrast you still answered right. Lower is better.",
        100, 0.1, "lower",
      ),
    ],
    stop: DRILL_STOP,
    mistakes: [LEAN_IN, PEEK, "Stopping when it gets hard. The faint levels are the practice.", "A bright room, or a window reflected in the screen."],
    tool: { kind: "drill" },
    evidence: "Pooled studies of adults with lazy eye who did visual training found a gain of about 1.7 lines on the letter chart on average, and about a third gained two lines or more. Gains are strongest on the task practised. This screen drill itself is untested.",
    sources: [ADULT_TRAINING, LEARNING_REVIEW],
  },
  {
    slug: "crowding-drill",
    what: "A drill for the weaker eye alone. A letter E sits in the middle with four other Es close around it, and you say which way the middle one points as the others close in. A lazy eye finds a letter hard to read when others crowd it.",
    need: DRILL_NEED,
    setup: [...DRILL_SETUP, "Press Start."],
    steps: [
      "Look at the E in the middle. Take no notice of the four around it.",
      "See which way its three arms point: up, down, left or right.",
      "Press that arrow, or tap that side of the screen.",
      "Watch what happens: after a right answer the four neighbours move closer, after a wrong one they move away.",
      "Guess when you cannot tell.",
      "Take your time and blink as usual. No answer is timed.",
      "After 10 minutes press \"Finish now\". The screen saves the smallest gap you still read right.",
    ],
    right: [
      "Near the end the neighbours are so close that the middle E is hard to pick out. That is your limit, and it is where the practice is.",
      SAME_SEAT,
      COVERED,
    ],
    measures: [
      auto(
        "gap_x", "Smallest gap still read right", "letter widths",
        "The screen measures this. It is the closest the four neighbours came, counted in widths of the letter, with the middle E still answered right. Lower is better.",
        10, 0.1, "lower",
      ),
    ],
    stop: DRILL_STOP,
    mistakes: [LEAN_IN, PEEK, "Looking at a neighbour by mistake. Keep your eye on the middle E.", "Stopping when it gets hard. The close levels are the practice."],
    tool: { kind: "drill" },
    evidence: "In a small laboratory study, adults with lazy eye who practised crowded letters came to read letters packed closer together, and their chart sight improved as well. This screen drill itself is untested.",
    sources: [CROWDING, ADULT_TRAINING],
  },
  {
    slug: "line-up-drill",
    what: "A drill for the weaker eye alone. One short line sits above another, and you nudge the lower one until it is exactly under the upper one. It practises fine position sense, which a lazy eye is poor at.",
    need: DRILL_NEED,
    setup: [...DRILL_SETUP, "Press Start."],
    steps: [
      "Look at the two short lines, one above and one below.",
      "Press Left or Right, or tap the left or right half of the screen, to nudge the lower line.",
      "Stop when the lower line sits exactly under the upper one, so the two look like one line with a gap in it.",
      "Press OK. Then do the next pair the same way.",
      "Take your time. Care counts here, not speed.",
      "After 10 minutes press \"Finish now\". The screen saves your average miss.",
    ],
    right: [
      "When you press OK the two lines look like one straight line to you.",
      "You make smaller and smaller nudges as the lines come together.",
      SAME_SEAT,
      COVERED,
    ],
    measures: [
      auto(
        "error_arcsec", "Average miss", "seconds of arc",
        "The screen measures this. It is how far the lower line was from the right place when you pressed OK, averaged over the session. One second of arc is 1/3600 of a degree. Lower is better.",
        3600, 1, "lower",
      ),
    ],
    stop: DRILL_STOP,
    mistakes: [LEAN_IN, PEEK, "Pressing OK quickly to get through more pairs."],
    tool: { kind: "drill" },
    evidence: "Lining-up tasks were among the first shown to improve with practice in adults with lazy eye, sometimes with a gain on the letter chart too. The studies were small and gains were strongest on the task practised. This screen drill itself is untested.",
    sources: [LEARNING_REVIEW, ADULT_TRAINING],
  },
], GUIDE_WORDS);
