/**
 * The plan of every programme: how many weeks it runs, what a practice day holds, which check-up is due in which
 * week, and when it asks for an eye-test visit.
 *
 * Data only. The rules that read it are in src/lib/programme-rules.ts (pure, unit-tested). The words a member
 * reads are in src/copy/programme.ts, under the same keys.
 *
 * What a plan does NOT hold: the minutes a day and the days a week. Those are the programme's dose
 * (src/data/index.ts) or, for a counsellor-led programme, what the linked counsellor set. A plan only says how a
 * day's minutes are shared out, so no plan can ask for more than the dose.
 *
 * Where the plans come from: IOpener's evidence framework (its table of default protocols, its therapy modules
 * and its safeguards), the concept document (the weekly eye check, the safeguards of a level 1 programme) and the
 * trials those name. The guides in src/data/guides say which drill came early and which came late in the therapy
 * the trials used; the stages of the convergence plan follow those lines.
 *
 * Where the documents give no figure, the cautious option was taken. Each such place is marked "Choice:" with its
 * reason. Every choice is a decision for the owner and, for a level 2 plan, for the counsellor.
 */
import type { Source } from "./guides/types";

/**
 * What a part of a day may be done with. A slug names one item. `games` names a method and a programme tag and
 * resolves to every game of that method the edition holds, so an edition with more games offers more choice
 * with no change here.
 */
export type Pick =
  | { film: true }
  | { game: string }
  | { exercise: string }
  | { games: string; tag: string };

export interface PartPlan {
  /** Key of this part's words in src/copy/programme.ts. Unique inside a chapter. */
  key: string;
  /**
   * "train" uses the day's training minutes. "care" is a routine away from the screen (breaks, daylight, a patch
   * or glasses an eye doctor prescribed): it is kept as a record and never uses training minutes.
   */
  kind: "train" | "care";
  /** A training part's share of the day, in minutes at the dose the plan was written for. 0 for care. */
  minutes: number;
  /** What the part suggests. One of these is offered first, a different one on different days. */
  picks: Pick[];
  /** Other things that fit the part. Offered as a choice, and used when nothing in `picks` is there for this member. */
  also?: Pick[];
  /** A care part that fills one of the day's rings: it is done when that ring is closed. */
  ring?: "rest" | "light";
}

/** One day's guided set. */
export interface ChapterPlan { key: string; parts: PartPlan[] }

/** From week `from` until the next stage begins, the days take these chapters in turn. */
export interface StagePlan { from: number; chapters: string[] }

/** A check-up (a key of `tests` in src/data) due in week 1, then every `everyWeeks` weeks, and in the last week. */
export interface CheckPlan { test: string; everyWeeks: number }

export interface ProgrammePlan {
  /** The programme's slug in src/data. */
  slug: string;
  /** Weeks the course runs. null for a habit programme, which has no end. */
  weeks: number | null;
  stages: StagePlan[];
  chapters: ChapterPlan[];
  checks: CheckPlan[];
  /** Weeks in which the plan asks for an eye-test visit, besides the end. */
  visits: number[];
  /** What the end of the course asks for. null when the programme has no end. */
  end: "eye_test" | "counsellor" | null;
  /** A routine that replaces the day's chapter for a member whose own therapist sets the list. */
  instead?: Pick;
  /** The published work the length and the shape of this plan rest on. */
  sources: Source[];
}

/* ───────────── sources (labels and addresses as the guides in src/data/guides carry them) ───────────── */

const XIAO: Source = {
  label: "Xiao and others, 2022, Ophthalmology: randomised trial of two-eye video for lazy eye in children aged 4 to 7",
  url: "https://www.sciencedirect.com/science/article/pii/S0161642021006825",
};
/** As the evidence page (src/copy/site.ts) carries it: most of the gain from patching came in the first 6 weeks. */
const MOTAS: Source = {
  label: "MOTAS dose-response study: children whose patching hours were measured by a sensor in the patch",
  url: "https://pubmed.ncbi.nlm.nih.gov/15326120/",
};
const CITT: Source = {
  label: "Convergence Insufficiency Treatment Trial Study Group, 2008, Archives of Ophthalmology: four treatments compared in 221 children aged 9 to 17",
  url: "https://pubmed.ncbi.nlm.nih.gov/18852411/",
};
const KINETICS: Source = {
  label: "Scheiman and others for the same trial group, 2010, Optometry and Vision Science: the home practice the trial set, and what it counted as normal",
  url: "https://pubmed.ncbi.nlm.nih.gov/20543758/",
};
const MANUAL: Source = {
  label: "CITT-ART Investigator Group, 2015, manual of procedures, chapter 7: the therapy drills used in the trial, step by step, in the office and at home",
  url: "https://bpb-us-w2.wpmucdn.com/u.osu.edu/dist/2/74958/files/2019/04/CITT-ART_MOP_Chapter07-2ltr2n8.pdf",
};
const DEPTH_REVIEW: Source = {
  label: "Tsirlin and others, 2015, Investigative Ophthalmology and Visual Science: pooled studies of visual training for adults with lazy eye",
  url: "https://iovs.arvojournals.org/article.aspx?articleid=2363050",
};
const SQUINT_TRIAL: Source = {
  label: "Ma and others, 2024, Ophthalmic and Physiological Optics: randomised trial of clinic vergence and anti-suppression therapy for intermittent exotropia",
  url: "https://pubmed.ncbi.nlm.nih.gov/38146812/",
};
const CONCUSS: Source = {
  label: "Alvarez and others, 2025, British Journal of Sports Medicine: CONCUSS randomised clinical trial of vergence and accommodative therapy with movement for concussion-related convergence insufficiency",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12591301/",
};
const EYE_SEARCH: Source = {
  label: "Ong and others, 2015, Annals of Clinical and Translational Neurology: Eye-Search, a web-based therapy that improves visual search in hemianopia",
  url: "https://pubmed.ncbi.nlm.nih.gov/25642437/",
};
const BREAKS_STUDY: Source = {
  label: "Talens-Estarelles and others, 2023, Contact Lens and Anterior Eye: the effects of breaks on digital eye strain, dry eye and binocular vision, testing the 20-20-20 rule",
  url: "https://pubmed.ncbi.nlm.nih.gov/35963776/",
};
const GUANGZHOU: Source = {
  label: "He and others, 2015, JAMA: cluster randomised trial of one added 40-minute outdoor class a day in 12 primary schools in Guangzhou",
  url: "https://pubmed.ncbi.nlm.nih.gov/26372583/",
};

/* ───────────── parts shared by several chapters ───────────── */

/** One sitting in the two-eye cinema. An edition with films that carry a task offers those as a choice. */
const sitting = (key: string): PartPlan => ({ key, kind: "train", minutes: 20, picks: [{ film: true }], also: [{ games: "dvid", tag: "lazy" }] });

/**
 * Care an eye doctor prescribed. IOpener never sets or changes it: these parts only lead to the family's own log.
 * The framework's rule "glasses first" is why the glasses log sits in every lazy-eye day.
 */
const GLASSES: PartPlan = { key: "glasses", kind: "care", minutes: 0, picks: [{ exercise: "glasses-check-in" }] };
const PATCH: PartPlan = { key: "patch", kind: "care", minutes: 0, picks: [{ exercise: "patch-wear-timer" }] };

/** Look-away breaks and full blinks: both fill the Rest ring. */
const BREAKS: PartPlan = {
  key: "breaks", kind: "care", minutes: 0, ring: "rest",
  picks: [{ game: "far-window" }, { game: "blink-garden" }], also: [{ exercise: "look-away-break" }, { exercise: "full-blink-drill" }],
};
/** Daylight outside fills the Light ring. The catalogue offers these to children aged 5 to 15, so an adult's day has no such part. */
const OUTSIDE: PartPlan = {
  key: "outside", kind: "care", minutes: 0, ring: "light",
  picks: [{ game: "sky-spotter" }, { games: "light", tag: "myopia" }],
  also: [{ exercise: "outdoor-light-time" }, { exercise: "walk-to-school-log" }, { exercise: "weekend-outdoor-block" }],
};

const five = (key: string, picks: Pick[], also?: Pick[]): PartPlan => ({ key, kind: "train", minutes: 5, picks, also });
const VERGENCE_GAMES: Pick = { games: "verg", tag: "conv" };

/* ───────────── the plans ───────────── */

export const programmePlans: ProgrammePlan[] = [
  /* ── level 1: a named condition, at the dose a trial used ── */
  {
    /**
     * Framework, default protocols: "Cinema, standard: 1 h/day, 6 days/week, 12 weeks; may be split across the day".
     * The lazy-eye guide splits the hour into three sittings of about 20 minutes.
     *
     * Choice: games take at most one sitting in three, on every other day. Two-eye video is what matched standard
     * care in the trials; two-eye games are graded lower (their trials were mixed). So at least two thirds of every
     * day stay with film, and the third sitting can always be film too. The one trial of a single game failed on
     * boredom, which is why play is offered at all.
     *
     * Choice: an eye-test visit is asked for in week 6. The framework names one review point, six weeks (most of the
     * gain from patching came in the first six weeks), and a child may start this programme on a caregiver's word
     * with no counsellor. A visit at the halfway point is the cautious reading.
     *
     * Check-ups: letter size in each eye every week (the safeguard for a level 1 programme is a check of both eyes,
     * and a drop in the stronger eye must be caught), the balance point every week (it sets the film's contrast),
     * depth and the suppression check every four weeks (their own interval in src/data is 30 days).
     */
    slug: "lazy-eye",
    weeks: 12,
    stages: [{ from: 1, chapters: ["film-day", "film-and-play"] }],
    chapters: [
      { key: "film-day", parts: [sitting("film-1"), sitting("film-2"), sitting("film-3"), GLASSES, PATCH] },
      {
        key: "film-and-play",
        parts: [
          sitting("film-1"), sitting("film-2"),
          {
            key: "balanced-play", kind: "train", minutes: 20,
            picks: [{ games: "dgame", tag: "lazy" }],
            /* Practice at threshold is in the catalogue for teens and adults only; the age line keeps it from a child. */
            also: [{ exercise: "contrast-ladder" }, { exercise: "crowding-drill" }, { exercise: "line-up-drill" }, { games: "pl", tag: "lazy" }, { film: true }, { games: "dvid", tag: "lazy" }],
          },
          GLASSES, PATCH,
        ],
      },
    ],
    checks: [{ test: "acuity", everyWeeks: 1 }, { test: "balance", everyWeeks: 1 }, { test: "stereo", everyWeeks: 4 }, { test: "suppression", everyWeeks: 4 }],
    visits: [6],
    end: "eye_test",
    sources: [XIAO, MOTAS],
  },
  {
    /**
     * Framework, default protocols: "Vergence home practice: 15 min/day, 5 days/week for 12 weeks, beside a weekly
     * 60-minute supervised session". Home practice alone did no better than placebo, and the screen says so.
     *
     * The order of the stages is the order the guides give for the therapy the trials used: the string, the near
     * letter and the three-dot card were the first home drills; ring cards came "once the first drills had become
     * easy"; turning out was trained "once turning in had improved"; sudden jumps and joining side-by-side pictures
     * were "a later stage"; the therapy "ended with fast switches".
     *
     * Choice: each stage lasts four weeks, an even split of the 12. In the trial a therapist moved a child on when
     * a drill had become easy; the app cannot see that, so it moves on by the calendar and no faster. A member with
     * a therapist does the therapist's list instead (`instead`).
     *
     * Check-ups: near point and fusion range every week (both have a 7-day interval in src/data, and they are the
     * signs the trial followed), the symptom survey every four weeks.
     */
    slug: "convergence",
    weeks: 12,
    stages: [{ from: 1, chapters: ["first-drills"] }, { from: 5, chapters: ["wider-range"] }, { from: 9, chapters: ["quick-changes"] }],
    chapters: [
      {
        key: "first-drills",
        parts: [
          five("string", [{ exercise: "brock-string" }, { exercise: "bead-slide" }]),
          five("near-letter", [{ exercise: "target-push-ups" }, { exercise: "barrel-card" }, { exercise: "dot-card" }]),
          five("smooth-pull", [{ exercise: "screen-vergence-ramp" }], [VERGENCE_GAMES]),
        ],
      },
      {
        key: "wider-range",
        parts: [
          five("card", [{ exercise: "lifesaver-card" }, { exercise: "barrel-card" }], [{ exercise: "dot-card" }, { exercise: "brock-string" }]),
          five("both-ways", [{ exercise: "screen-vergence-ramp" }, { exercise: "screen-diverge-ramp" }]),
          five("vergence-play", [VERGENCE_GAMES], [{ exercise: "target-push-ups" }]),
        ],
      },
      {
        key: "quick-changes",
        parts: [
          five("jumps", [{ exercise: "near-far-jumps" }], [{ exercise: "brock-string" }]),
          five("quick-switch", [{ exercise: "screen-vergence-steps" }, { exercise: "flip-switch" }]),
          five("join-pairs", [{ exercise: "stereogram-pairs" }], [VERGENCE_GAMES, { exercise: "lifesaver-card" }]),
        ],
      },
    ],
    checks: [{ test: "near_point", everyWeeks: 1 }, { test: "fusion_break", everyWeeks: 1 }, { test: "symptoms", everyWeeks: 4 }],
    visits: [],
    end: "eye_test",
    instead: { exercise: "therapy-homework-plan" },
    sources: [CITT, KINETICS, MANUAL],
  },
  {
    /**
     * Framework: depth training is graded B, "short daily sessions", and the catalogue gives depth play in sets of
     * five minutes. No document gives a course length.
     *
     * Choice: six weeks, the shortest course of screen training the framework cites for any condition, and then an
     * eye test. With limited evidence the cautious course is the short one.
     */
    slug: "depth",
    weeks: 6,
    stages: [{ from: 1, chapters: ["depth-sets"] }],
    chapters: [{
      key: "depth-sets",
      parts: [five("depth-1", [{ games: "stereo", tag: "depth" }]), five("depth-2", [{ games: "stereo", tag: "depth" }]), five("depth-3", [{ games: "stereo", tag: "depth" }])],
    }],
    checks: [{ test: "stereo", everyWeeks: 4 }, { test: "suppression", everyWeeks: 4 }],
    visits: [],
    end: "eye_test",
    sources: [DEPTH_REVIEW],
  },

  /* ── level 2: a suggestion. The linked counsellor sets the minutes and the days, and sees this plan ── */
  {
    /**
     * Framework: fusion and anti-suppression tasks for an intermittent squint, under a clinician's prescription;
     * anti-suppression work can cause lasting double vision. The trial was done in a clinic; no document gives a
     * length for home practice.
     *
     * Choice: a block of six weeks (the length of the one supervised course the framework gives in weeks, for
     * recovery after concussion), then the block ends and the counsellor decides. Starting the next block sets the
     * minutes back to "not set", so the counsellor must look again before training reopens.
     *
     * Choice: the suppression check every week, because that is the harm the framework warns of.
     * The shares follow the catalogue: 3 minutes, 5 minutes, and sets of 5 minutes of play.
     */
    slug: "squint",
    weeks: 6,
    stages: [{ from: 1, chapters: ["both-eyes-on"] }],
    chapters: [{
      key: "both-eyes-on",
      parts: [
        { key: "both-lights", kind: "train", minutes: 3, picks: [{ exercise: "see-both-lights" }] },
        { key: "far-hold", kind: "train", minutes: 5, picks: [{ exercise: "distance-fusion-hold" }] },
        { key: "squint-play", kind: "train", minutes: 5, picks: [{ games: "anti", tag: "squint" }] },
      ],
    }],
    checks: [{ test: "suppression", everyWeeks: 1 }, { test: "fusion_break", everyWeeks: 4 }, { test: "acuity", everyWeeks: 4 }],
    visits: [],
    end: "counsellor",
    sources: [SQUINT_TRIAL],
  },
  {
    /**
     * Framework: after concussion, 79% improved with six weeks of office therapy against 13% waiting (CONCUSS).
     * So a block is six weeks. The shares follow the catalogue: 5 walks, 3 sets of 1 minute, 2 minutes, 3-minute sets.
     * Check-ups: near point every week, the symptom survey every four weeks: the two things that trial followed.
     */
    slug: "after-concussion",
    weeks: 6,
    stages: [{ from: 1, chapters: ["steady-with-movement"] }],
    chapters: [{
      key: "steady-with-movement",
      parts: [
        { key: "walk-in", kind: "train", minutes: 3, picks: [{ exercise: "walk-in-target" }] },
        { key: "head-turn", kind: "train", minutes: 3, picks: [{ exercise: "head-turn-letter-hold" }] },
        { key: "near-far-move", kind: "train", minutes: 2, picks: [{ exercise: "near-far-with-movement" }] },
        { key: "recovery-play", kind: "train", minutes: 3, picks: [{ games: "recov", tag: "conc" }] },
      ],
    }],
    checks: [{ test: "near_point", everyWeeks: 1 }, { test: "symptoms", everyWeeks: 4 }],
    visits: [],
    end: "counsellor",
    sources: [CONCUSS],
  },
  {
    /**
     * Concept document: search training after a stroke was tested as 800 searches over 11 days. Eleven days of
     * practice is two weeks, so a block is two weeks.
     *
     * Choice: the block is not made longer for the reading practice, whose study ran for 20 hours in all. The
     * shorter figure is the cautious one; the counsellor starts a further block when it is wanted.
     * The home kit has no check-up for side vision. The clinic measures that. Letter size is checked at the start
     * and the end, so a change in central sight is not missed.
     */
    slug: "after-stroke",
    weeks: 2,
    stages: [{ from: 1, chapters: ["search-and-read"] }],
    chapters: [{
      key: "search-and-read",
      parts: [
        { key: "search", kind: "train", minutes: 20, picks: [{ exercise: "blind-side-sweeps" }, { games: "scan", tag: "stroke" }] },
        { key: "line-reading", kind: "train", minutes: 20, picks: [{ exercise: "guided-line-reading" }] },
      ],
    }],
    checks: [{ test: "acuity", everyWeeks: 4 }],
    visits: [],
    end: "counsellor",
    sources: [EYE_SEARCH],
  },

  /* ── level 0: habits. No training minutes, no end. A day is the rings; check-ups come round every four weeks ── */
  {
    /**
     * Concept document: people with no condition use the Rest and Light rings only, and take a short eye check on
     * a schedule. Letter size has a 7-day interval in src/data; faint letters and the symptom survey 30 days.
     * Warm-up games with no trial behind them are left out of the plan on purpose.
     */
    slug: "eye-fitness",
    weeks: null,
    stages: [{ from: 1, chapters: ["eye-day"] }],
    chapters: [{ key: "eye-day", parts: [BREAKS, OUTSIDE] }],
    checks: [{ test: "acuity", everyWeeks: 1 }, { test: "contrast", everyWeeks: 4 }, { test: "symptoms", everyWeeks: 4 }],
    visits: [],
    end: null,
    sources: [BREAKS_STUDY, GUANGZHOU],
  },
  {
    /**
     * Framework, workday monitor: break prompts, viewing distance, and a monthly self-check of the symptom survey,
     * letter size in each eye and fusion range. The desk check is "3 minutes, once" in the catalogue, so it sits in
     * the first week only. The gain from break reminders was gone a week after they stopped, so there is no end.
     */
    slug: "screen-strain",
    weeks: null,
    stages: [{ from: 1, chapters: ["desk-week"] }, { from: 2, chapters: ["work-day"] }],
    chapters: [
      {
        key: "desk-week",
        parts: [{ key: "desk", kind: "care", minutes: 0, picks: [{ exercise: "desk-set-up-check" }] }, BREAKS, { key: "distance", kind: "care", minutes: 0, picks: [{ exercise: "distance-reset" }] }],
      },
      { key: "work-day", parts: [BREAKS, { key: "distance", kind: "care", minutes: 0, picks: [{ exercise: "distance-reset" }] }] },
    ],
    checks: [{ test: "symptoms", everyWeeks: 4 }, { test: "acuity", everyWeeks: 4 }, { test: "fusion_break", everyWeeks: 4 }],
    visits: [],
    end: null,
    sources: [BREAKS_STUDY],
  },
  {
    /**
     * Framework, Myopia Habits: an outdoor-time goal, viewing-distance and break coaching, and a check of letter
     * size in each eye. The school trial ran for three years, so there is no end.
     */
    slug: "child-myopia",
    weeks: null,
    stages: [{ from: 1, chapters: ["outside-day"] }],
    chapters: [{ key: "outside-day", parts: [OUTSIDE, { key: "reading-distance", kind: "care", minutes: 0, picks: [{ exercise: "arm-s-length-reading" }] }] }],
    checks: [{ test: "acuity", everyWeeks: 4 }],
    visits: [],
    end: null,
    sources: [GUANGZHOU],
  },
];

export const programmePlanFor = (slug: string): ProgrammePlan | undefined => programmePlans.find((p) => p.slug === slug);
