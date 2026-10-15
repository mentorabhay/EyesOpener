import { describe, expect, it } from "vitest";
import { programme as words } from "@/copy/programme";
import { catalogue, exerciseBySlug, gameBySlug, programmeBySlug, programmes, testByKey } from "@/data";
import { programmePlanFor, programmePlans, type Pick, type ProgrammePlan } from "@/data/programme-plans";
import { MAX_DAILY_MINUTES } from "@/engine";
import {
  addDays, advance, ageRange, chapterFor, chapterPlanFor, checkInWeek, checksFor, dayOn, daysBetween, daysOfWeek, doseOf, FILM_SLUG, fitsAge, isLastWeek,
  itemKey, itemsFor, nextWeek, practisedDays, progress, ranItsCourse, resolve, shareOut, stageFor, visitIn, weekOn, weekView,
  type DayDone, type DayRecord, type Fit,
} from "./programme-rules";

const plan = (slug: string) => programmePlanFor(slug)!;
const everything = (age: number | null): Fit => ({ age, usable: () => true });
const picksOf = (p: ProgrammePlan): Pick[] => [...p.chapters.flatMap((c) => c.parts.flatMap((part) => [...part.picks, ...(part.also ?? [])])), ...(p.instead ? [p.instead] : [])];
const day = (train: number, trainGoal = 60): DayRecord => ({ train, trainGoal, rest: 0, restGoal: 6, light: 0, lightGoal: 90 });
const nothing: DayDone = { minutes: {}, train: 0, logged: [], rest: { done: 0, goal: 6 }, light: { done: 0, goal: 90 } };
const film = itemKey({ kind: "film", slug: FILM_SLUG });

/** Words a plan must never use: promises the copy rules rule out. */
const BANNED = /\b(cure[sd]?|curing|guarantee[sd]?|miracle|heals?|fix(es)? your (eyes|vision)|diagnos\w*)\b/i;

describe("the plans", () => {
  it("has one plan for every programme, and no plan without a programme", () => {
    expect(programmePlans.map((p) => p.slug).sort()).toEqual(programmes.map((p) => p.slug).sort());
  });

  for (const p of programmePlans) {
    describe(p.slug, () => {
      const pr = programmeBySlug(p.slug)!;

      it("has stages that start at week 1, in order, inside the course, and name chapters that exist", () => {
        expect(p.stages[0].from).toBe(1);
        p.stages.forEach((s, i) => {
          if (i > 0) expect(s.from).toBeGreaterThan(p.stages[i - 1].from);
          if (p.weeks !== null) expect(s.from).toBeLessThanOrEqual(p.weeks);
          expect(s.chapters.length).toBeGreaterThan(0);
          for (const key of s.chapters) expect(p.chapters.some((c) => c.key === key), key).toBe(true);
        });
        for (const c of p.chapters) expect(p.stages.some((s) => s.chapters.includes(c.key)), c.key).toBe(true);
      });

      it("has parts with their own keys; training parts carry minutes and care parts carry none", () => {
        for (const c of p.chapters) {
          expect(new Set(c.parts.map((x) => x.key)).size).toBe(c.parts.length);
          for (const part of c.parts) {
            expect(part.picks.length).toBeGreaterThan(0);
            if (part.kind === "train") expect(part.minutes).toBeGreaterThan(0);
            else expect(part.minutes).toBe(0);
            if (part.ring) expect(part.kind).toBe("care");
          }
        }
      });

      it("names only items, methods and tags the catalogue has", () => {
        for (const pick of picksOf(p)) {
          if ("exercise" in pick) expect(exerciseBySlug(pick.exercise), pick.exercise).toBeDefined();
          else if ("game" in pick) expect(gameBySlug(pick.game), pick.game).toBeDefined();
          else if ("games" in pick) {
            expect(catalogue.mechanisms.some((m) => m.key === pick.games), pick.games).toBe(true);
            expect(catalogue.gameTags.some((t) => t.key === pick.tag), pick.tag).toBe(true);
          }
        }
      });

      it("keeps to the programme's own tag and level, so no plan reaches into a counsellor-led library", () => {
        for (const pick of picksOf(p)) {
          if ("games" in pick && pr.level < 2) expect(["squint", "conc", "stroke"]).not.toContain(pick.tag);
          if ("exercise" in pick && pr.level < 2) expect(exerciseBySlug(pick.exercise)!.for).not.toMatch(/level 2/);
        }
      });

      it("has training parts only when the programme has training minutes or a counsellor sets them", () => {
        const trains = p.chapters.some((c) => c.parts.some((x) => x.kind === "train"));
        expect(trains).toBe(pr.dailyMinutes > 0 || pr.level === 2);
      });

      it("sets check-ups this app can run, at a whole number of weeks", () => {
        expect(new Set(p.checks.map((c) => c.test)).size).toBe(p.checks.length);
        for (const c of p.checks) {
          expect(testByKey(c.test)?.built, c.test).toBe(true);
          expect(c.test).not.toBe("fusion_recovery");
          expect(Number.isInteger(c.everyWeeks) && c.everyWeeks >= 1).toBe(true);
        }
      });

      it("ends in a way that fits its level", () => {
        if (pr.level === 0) expect([p.weeks, p.end]).toEqual([null, null]);
        else {
          expect(p.weeks).toBeGreaterThan(0);
          expect(p.end).toBe(pr.level === 2 ? "counsellor" : "eye_test");
        }
        for (const w of p.visits) expect(w >= 1 && w < (p.weeks ?? 0)).toBe(true);
      });

      it("has words for every chapter and part, a line on where it comes from, and sources with an address", () => {
        for (const c of p.chapters) {
          expect(words.chapters[c.key]?.name, c.key).toBeTruthy();
          expect(words.chapters[c.key]?.about, c.key).toBeTruthy();
          for (const part of c.parts) expect(words.parts[part.key]?.name, part.key).toBeTruthy();
        }
        expect(words.basis.text[p.slug]?.length).toBeGreaterThan(0);
        expect(p.sources.length).toBeGreaterThan(0);
        for (const s of p.sources) expect(s.url).toMatch(/^https:\/\//);
      });
    });
  }

  it("matches the course lengths the evidence framework gives", () => {
    expect(plan("lazy-eye").weeks).toBe(12);
    expect(plan("convergence").weeks).toBe(12);
    expect(plan("after-concussion").weeks).toBe(6);
    expect(plan("after-stroke").weeks).toBe(2);
  });

  it("is written at the trial dose: the training parts of a level 1 day add up to the programme's minutes", () => {
    for (const p of programmePlans) {
      const pr = programmeBySlug(p.slug)!;
      if (pr.level !== 1) continue;
      for (const c of p.chapters) expect(c.parts.reduce((s, x) => s + x.minutes, 0), `${p.slug} ${c.key}`).toBe(pr.dailyMinutes);
    }
  });

  it("keeps film as at least two thirds of every lazy-eye day", () => {
    for (const c of plan("lazy-eye").chapters) {
      const train = c.parts.filter((x) => x.kind === "train");
      const filmOnly = train.filter((x) => x.picks.every((k) => "film" in k)).reduce((s, x) => s + x.minutes, 0);
      expect(filmOnly / train.reduce((s, x) => s + x.minutes, 0)).toBeGreaterThanOrEqual(2 / 3);
    }
  });
});

describe("the words", () => {
  it("promise nothing and name no condition as found", () => {
    const lines: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === "string") lines.push(v);
      else if (typeof v === "function") {
        /* most take numbers and a name; a few take only words */
        const f = v as (...a: unknown[]) => unknown;
        try { walk(f(3, 6, "x")); } catch { walk(f("x", "y", "z")); }
      }
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(words);
    expect(lines.length).toBeGreaterThan(150);
    for (const line of lines) expect(BANNED.test(line), line).toBe(false);
  });
  it("has no words left over for a chapter or a part no plan uses", () => {
    const chapters = new Set(programmePlans.flatMap((p) => p.chapters.map((c) => c.key)));
    const parts = new Set(programmePlans.flatMap((p) => p.chapters.flatMap((c) => c.parts.map((x) => x.key))));
    expect(Object.keys(words.chapters).filter((k) => !chapters.has(k))).toEqual([]);
    expect(Object.keys(words.parts).filter((k) => !parts.has(k))).toEqual([]);
  });
});

describe("weeks on the calendar", () => {
  it("counts days 1 to 7 from the start as week 1", () => {
    expect(weekOn("2026-08-27", "2026-08-27")).toBe(1);
    expect(weekOn("2026-08-27", "2026-09-02")).toBe(1);
    expect(weekOn("2026-08-27", "2026-09-03")).toBe(2);
    expect(weekOn("2026-08-27", "2026-10-05")).toBe(6);
    expect(dayOn("2026-08-27", "2026-10-05")).toBe(5);
  });
  it("never gives a week before the first, even when the clock runs behind the start", () => {
    expect(weekOn("2026-08-27", "2026-08-20")).toBe(1);
    expect(dayOn("2026-08-27", "2026-08-20")).toBe(1);
  });
  it("does not depend on what was practised: a week with nothing done still passes", () => {
    /* the rule takes two days and nothing else, so there is nothing a missed day could change */
    expect(weekOn.length).toBe(2);
  });
  it("works across a month end and a leap day", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(daysBetween("2026-01-31", "2026-03-01")).toBe(29);
  });
  it("lists the seven days of a week, starting on the weekday the programme started", () => {
    expect(daysOfWeek("2026-08-27", 6)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05", "2026-10-06", "2026-10-07"]);
  });
});

describe("moving on and ending", () => {
  it("moves a course on one week every seven days", () => {
    expect(advance({ weeks: 12 }, "2026-08-27", "2026-08-27")).toEqual({ week: 1, finished: false });
    expect(advance({ weeks: 12 }, "2026-08-27", "2026-10-05")).toEqual({ week: 6, finished: false });
  });
  it("keeps a course open through the last day of its last week, and ends it the day after", () => {
    const start = "2026-08-27", lastDay = addDays(start, 12 * 7 - 1);
    expect(advance({ weeks: 12 }, start, lastDay)).toEqual({ week: 12, finished: false });
    expect(advance({ weeks: 12 }, start, addDays(lastDay, 1))).toEqual({ week: 12, finished: true });
    expect(advance({ weeks: 12 }, start, addDays(lastDay, 400))).toEqual({ week: 12, finished: true });
  });
  it("never ends a habit programme", () => {
    expect(advance({ weeks: null }, "2024-01-01", "2026-10-05")).toEqual({ week: 145, finished: false });
  });
  it("tells a course that ran its weeks from one that was left early", () => {
    expect(ranItsCourse({ weeks: 12 }, "2026-01-01", "2026-03-26")).toBe(true);
    expect(ranItsCourse({ weeks: 12 }, "2026-01-01", "2026-03-25")).toBe(false);
    expect(ranItsCourse({ weeks: null }, "2026-01-01", "2028-01-01")).toBe(false);
  });
  it("knows the last week", () => {
    expect(isLastWeek({ weeks: 12 }, 11)).toBe(false);
    expect(isLastWeek({ weeks: 12 }, 12)).toBe(true);
    expect(isLastWeek({ weeks: null }, 500)).toBe(false);
  });
});

describe("the chapter of a day", () => {
  it("takes the lazy-eye chapters in turn, across weeks too", () => {
    const p = plan("lazy-eye");
    const keys = [1, 2, 3, 4, 5, 6, 7].map((d) => chapterPlanFor(p, 1, d).key);
    expect(keys).toEqual(["film-day", "film-and-play", "film-day", "film-and-play", "film-day", "film-and-play", "film-day"]);
    expect(chapterPlanFor(p, 2, 1).key).toBe("film-and-play");
  });
  it("moves the convergence plan through its three stages", () => {
    const p = plan("convergence");
    expect(chapterPlanFor(p, 1, 1).key).toBe("first-drills");
    expect(chapterPlanFor(p, 4, 7).key).toBe("first-drills");
    expect(chapterPlanFor(p, 5, 1).key).toBe("wider-range");
    expect(chapterPlanFor(p, 9, 1).key).toBe("quick-changes");
    expect(chapterPlanFor(p, 12, 7).key).toBe("quick-changes");
    expect(stageFor(p, 8).from).toBe(5);
  });
  it("does the desk check in the first week of the screen-strain plan only", () => {
    const p = plan("screen-strain");
    expect(chapterPlanFor(p, 1, 3).key).toBe("desk-week");
    expect(chapterPlanFor(p, 2, 1).key).toBe("work-day");
    expect(chapterPlanFor(p, 60, 4).key).toBe("work-day");
  });
});

describe("who an item is for", () => {
  it("reads the ages a catalogue line gives", () => {
    expect(ageRange("Lazy eye · ages 6+ · level 1")).toEqual({ min: 6, max: null });
    expect(ageRange("Lazy eye · ages 4 to 7 · level 1")).toEqual({ min: 4, max: 7 });
    expect(ageRange("Children 5 to 15 · level 0")).toEqual({ min: 5, max: 15 });
    expect(ageRange("Lazy eye · teens and adults")).toEqual({ min: 13, max: null });
    expect(ageRange("Half-field loss · adults · level 2")).toEqual({ min: 18, max: null });
    expect(ageRange("Lazy eye · ages 10+ and adults")).toEqual({ min: 10, max: null });
    expect(ageRange("Intermittent squint · level 2, counsellor plan")).toEqual({ min: null, max: null });
    expect(ageRange("Anyone at a screen")).toEqual({ min: null, max: null });
  });
  it("keeps a child out of an older item, and an adult out of a children's item", () => {
    expect(fitsAge("Lazy eye · ages 6+ · level 1", 6)).toBe(true);
    expect(fitsAge("Lazy eye · ages 6+ · level 1", 5)).toBe(false);
    expect(fitsAge("Lazy eye · ages 4 to 7 · level 1", 8)).toBe(false);
    expect(fitsAge("Lazy eye · teens and adults", 12)).toBe(false);
    expect(fitsAge("Lazy eye · teens and adults", null)).toBe(true);
    expect(fitsAge("Children 5 to 15 · level 0", null)).toBe(false);
    expect(fitsAge("Children 5 to 15 · level 0", 68)).toBe(false);
    expect(fitsAge("Anyone at a screen", null)).toBe(true);
  });
  it("finds every game of a method and tag that the edition holds, and none the member cannot use", () => {
    const all = resolve({ games: "dgame", tag: "lazy" }, everything(6));
    expect(all.length).toBeGreaterThanOrEqual(3);
    for (const it of all) expect(gameBySlug(it.slug)!.mechanism).toBe("dgame");
    /* The full product holds more games than this repository, so the test names one and checks the rest by rule. */
    const forFour = resolve({ games: "dgame", tag: "lazy" }, everything(4));
    expect(forFour.map((it) => it.slug)).toContain("firefly-catch");
    expect(forFour.some((it) => it.slug === "lantern-run")).toBe(false);
    for (const it of forFour) expect(fitsAge(gameBySlug(it.slug)!.for, 4)).toBe(true);
    expect(resolve({ games: "dgame", tag: "lazy" }, { age: 6, usable: (_, slug) => slug !== "lantern-run" }).some((it) => it.slug === "lantern-run")).toBe(false);
    expect(resolve({ games: "dgame", tag: "lazy" }, { age: 6, usable: () => false })).toEqual([]);
    expect(resolve({ film: true }, { age: 6, usable: () => false })).toEqual([]);
    expect(resolve({ game: "not-a-game" }, everything(6))).toEqual([]);
  });
  it("puts a different suggestion first on different days, and falls back to the other choices", () => {
    const part = plan("convergence").chapters[0].parts[0];
    expect(itemsFor(part, everything(9), 0).map((it) => it.slug)).toEqual(["brock-string", "bead-slide"]);
    expect(itemsFor(part, everything(9), 1).map((it) => it.slug)).toEqual(["bead-slide", "brock-string"]);
    const play = plan("lazy-eye").chapters[1].parts[2];
    /* no game for this member: the film is offered for the third sitting */
    const noGames: Fit = { age: 6, usable: (kind) => kind !== "game" };
    expect(itemsFor(play, noGames, 0).map((it) => it.kind)).toEqual(["film"]);
    /* an adult gets the games first and practice at threshold as a choice; a child never sees that practice */
    expect(itemsFor(play, everything(null), 0).some((it) => it.slug === "contrast-ladder")).toBe(true);
    expect(itemsFor(play, everything(6), 0).some((it) => it.slug === "contrast-ladder")).toBe(false);
    expect(itemsFor(play, everything(6), 0)[0].kind).toBe("game");
  });
});

describe("sharing out the day's minutes", () => {
  it("gives whole minutes that add up exactly", () => {
    expect(shareOut([20, 20, 20], 60)).toEqual([20, 20, 20]);
    expect(shareOut([3, 5, 5], 15)).toEqual([3, 6, 6]);
    expect(shareOut([5, 5, 5], 10)).toEqual([4, 3, 3]);
    expect(shareOut([5, 5, 5], 2)).toEqual([1, 1, 0]);
    expect(shareOut([5, 5], 0)).toEqual([0, 0]);
    expect(shareOut([], 30)).toEqual([]);
    for (let total = 0; total <= 90; total++) expect(shareOut([3, 3, 2, 3], total).reduce((a, b) => a + b, 0)).toBe(total);
  });
  it("never lets the day's minutes pass the daily limit", () => {
    expect(doseOf(60)).toBe(60);
    expect(doseOf(500)).toBe(MAX_DAILY_MINUTES);
    expect(doseOf(-5)).toBe(0);
    expect(doseOf(Number.NaN)).toBe(0);
    expect(doseOf(14.9)).toBe(14);
  });
});

describe("a chapter fitted to a member", () => {
  it("gives a child of 6 on the lazy-eye programme three sittings of 20 minutes", () => {
    const c = chapterFor(plan("lazy-eye"), 6, 4, 60, everything(6));
    expect(c.key).toBe("film-day");
    expect(c.minutes).toBe(60);
    expect(c.parts.filter((p) => p.kind === "train").map((p) => [p.key, p.minutes, p.items[0].kind])).toEqual([["film-1", 20, "film"], ["film-2", 20, "film"], ["film-3", 20, "film"]]);
    expect(c.parts.filter((p) => p.kind === "care").map((p) => p.key)).toEqual(["glasses", "patch"]);
  });

  it("gives the next day two sittings and a game that fits a six-year-old, with the film as a choice", () => {
    const c = chapterFor(plan("lazy-eye"), 6, 5, 60, everything(6));
    expect(c.key).toBe("film-and-play");
    const play = c.parts[2];
    expect([play.key, play.minutes, play.items[0].kind]).toEqual(["balanced-play", 20, "game"]);
    expect(play.items.some((it) => it.kind === "film")).toBe(true);
    for (const it of play.items) if (it.kind === "game") expect(fitsAge(gameBySlug(it.slug)!.for, 6)).toBe(true);
  });

  it("never asks for more than the enrolment's minutes or the daily limit, on any day of any plan", () => {
    const ages = [null, 3, 4, 6, 8, 9, 13, 30, 70];
    const doses = [0, 1, 2, 5, 14, 15, 20, 45, 60, 61, 90, 91, 120, 500];
    /* every case is checked; only the ones that break a rule are kept, so the test stays quick */
    const broken: string[] = [];
    let cases = 0;
    for (const p of programmePlans) {
      const last = p.weeks ?? 9;
      for (let week = 1; week <= last; week++) for (let d = 1; d <= 7; d++) for (const age of ages) for (const dose of doses) {
        const c = chapterFor(p, week, d, dose, everything(age));
        const train = c.parts.filter((x) => x.kind === "train");
        const sum = train.reduce((s, x) => s + x.minutes, 0);
        const cap = Math.min(dose, MAX_DAILY_MINUTES);
        const where = `${p.slug} week ${week} day ${d} age ${age} dose ${dose}`;
        cases += 1;
        if (sum > cap) broken.push(`${where}: asks for ${sum} of ${cap}`);
        if (c.minutes !== sum) broken.push(`${where}: total ${c.minutes} is not the sum ${sum}`);
        /* when there is something to train with, the day's minutes are used in full, not rounded away */
        if (train.length && dose > 0 && sum !== cap) broken.push(`${where}: uses ${sum} of ${cap}`);
        for (const part of c.parts) {
          if (!Number.isInteger(part.minutes) || part.minutes < 0) broken.push(`${where}: ${part.key} has ${part.minutes} minutes`);
          if (part.kind === "care" && part.minutes !== 0) broken.push(`${where}: care part ${part.key} has minutes`);
          if (!part.items.length) broken.push(`${where}: ${part.key} offers nothing`);
        }
      }
    }
    expect(cases).toBeGreaterThan(50_000);
    expect(broken.slice(0, 5)).toEqual([]);
  });

  it("gives care routines away from the screen no training minutes, whatever the dose", () => {
    for (const p of programmePlans) for (const dose of [0, 15, 60, 90, 500]) for (let d = 1; d <= 7; d++) {
      for (const part of chapterFor(p, 1, d, dose, everything(8)).parts) if (part.kind === "care") expect(part.minutes).toBe(0);
    }
  });

  it("leaves every training part out under age 4, and keeps the care parts", () => {
    const c = chapterFor(plan("lazy-eye"), 1, 1, 60, everything(3));
    expect(c.minutes).toBe(0);
    expect(c.parts.every((p) => p.kind === "care")).toBe(true);
    expect(c.parts.length).toBeGreaterThan(0);
  });

  it("gives the minutes of a part nobody can do to the parts that are left", () => {
    /* at 7 the on-screen drills (ages 9+) are not offered: the two hands-on parts take the 15 minutes */
    const c = chapterFor(plan("convergence"), 1, 1, 15, everything(7));
    expect(c.parts.map((p) => [p.key, p.minutes])).toEqual([["string", 8], ["near-letter", 7]]);
  });

  it("lists a counsellor-led day as a suggestion with no minutes until the counsellor sets them, then shares them out", () => {
    const waiting = chapterFor(plan("squint"), 1, 1, 0, everything(8));
    expect(waiting.minutes).toBe(0);
    expect(waiting.parts.map((p) => p.minutes)).toEqual(waiting.parts.map(() => 0));
    expect(waiting.parts.length).toBeGreaterThan(0);
    const set = chapterFor(plan("squint"), 1, 1, 12, everything(8));
    expect(set.minutes).toBe(12);
  });

  it("drops parts a tiny dose cannot reach, and still adds up", () => {
    const c = chapterFor(plan("lazy-eye"), 1, 1, 2, everything(6));
    expect(c.parts.filter((p) => p.kind === "train").map((p) => p.minutes)).toEqual([1, 1]);
  });

  it("gives a habit programme a day with no training parts at all", () => {
    for (const slug of ["eye-fitness", "screen-strain", "child-myopia"]) {
      const c = chapterFor(plan(slug), 3, 2, 0, everything(8));
      expect(c.minutes).toBe(0);
      expect(c.parts.every((p) => p.kind === "care")).toBe(true);
    }
    /* an adult's eye day has breaks only: the outdoor items are for children */
    expect(chapterFor(plan("eye-fitness"), 1, 1, 0, everything(null)).parts.map((p) => p.key)).toEqual(["breaks"]);
    expect(chapterFor(plan("eye-fitness"), 1, 1, 0, everything(8)).parts.map((p) => p.key)).toEqual(["breaks", "outside"]);
  });
});

describe("what is done today", () => {
  const chapter = chapterFor(plan("lazy-eye"), 6, 4, 60, everything(6));

  it("starts with nothing done and the first sitting next", () => {
    const p = progress(chapter, nothing);
    expect(p.parts.slice(0, 3).map((x) => x.state)).toEqual(["todo", "todo", "todo"]);
    expect([p.minutes, p.goal, p.finished, p.next]).toEqual([0, 60, false, 0]);
  });

  it("counts film minutes for the sittings in order", () => {
    const p = progress(chapter, { ...nothing, minutes: { [film]: 28 }, train: 28 });
    expect(p.parts.slice(0, 3).map((x) => [x.state, x.done])).toEqual([["done", 20], ["part", 8], ["todo", 0]]);
    expect(p.next).toBe(1);
  });

  it("lets other practice fill what is left, so a chapter is done exactly when the day's minutes are", () => {
    /* 28 minutes of film and 17 of a game that is not in today's chapter */
    const part = progress(chapter, { ...nothing, minutes: { [film]: 28, "game:firefly-catch": 17 }, train: 45 });
    expect(part.parts.slice(0, 3).map((x) => x.done)).toEqual([20, 20, 5]);
    expect([part.minutes, part.finished, part.next]).toEqual([45, false, 2]);
    const all = progress(chapter, { ...nothing, minutes: { "game:something-else": 60 }, train: 60 });
    expect(all.finished).toBe(true);
    expect(all.next).toBeNull();
    expect(all.minutes).toBe(60);
  });

  it("counts a game for the play part on a day that has one", () => {
    /* Aarav's seeded day: 28 minutes of film, 17 of Firefly Catch */
    const playDay = chapterFor(plan("lazy-eye"), 6, 5, 60, everything(6));
    const p = progress(playDay, { ...nothing, minutes: { [film]: 28, "game:firefly-catch": 17 }, train: 45 });
    expect(p.parts.slice(0, 3).map((x) => [x.state, x.done])).toEqual([["done", 20], ["part", 8], ["part", 17]]);
    expect(p.next).toBe(1);
  });

  it("never counts more than the day's minutes, however long the sessions were", () => {
    const p = progress(chapter, { ...nothing, minutes: { [film]: 500 }, train: 90 });
    expect(p.minutes).toBe(60);
    expect(p.parts.slice(0, 3).map((x) => x.done)).toEqual([20, 20, 20]);
  });

  it("reads half a minute short as done, as the ring does", () => {
    expect(progress(chapter, { ...nothing, minutes: { [film]: 59.6 }, train: 59.6 }).finished).toBe(true);
    expect(progress(chapter, { ...nothing, minutes: { [film]: 59 }, train: 59 }).finished).toBe(false);
  });

  it("does not let a care log stand in for training, or training for a care log", () => {
    const logged = progress(chapter, { ...nothing, logged: ["exercise:glasses-check-in"] });
    expect(logged.parts.find((x) => x.key === "glasses")!.state).toBe("done");
    expect(logged.minutes).toBe(0);
    expect(logged.finished).toBe(false);
    const trained = progress(chapter, { ...nothing, minutes: { [film]: 60 }, train: 60 });
    expect(trained.finished).toBe(true);
    expect(trained.parts.find((x) => x.key === "glasses")!.state).toBe("todo");
  });

  it("finishes a habit day when its rings are closed", () => {
    const c = chapterFor(plan("eye-fitness"), 1, 1, 0, everything(8));
    expect(progress(c, nothing).finished).toBe(false);
    const half = progress(c, { ...nothing, rest: { done: 6, goal: 6 }, light: { done: 30, goal: 90 } });
    expect(half.parts.map((x) => x.state)).toEqual(["done", "part"]);
    expect([half.finished, half.next]).toEqual([false, 1]);
    expect(progress(c, { ...nothing, rest: { done: 6, goal: 6 }, light: { done: 95, goal: 90 } }).finished).toBe(true);
  });

  it("has nothing to start while a counsellor has not set the minutes", () => {
    const p = progress(chapterFor(plan("squint"), 1, 1, 0, everything(8)), nothing);
    expect([p.finished, p.next, p.goal]).toEqual([false, null, 0]);
  });
});

describe("the week, day by day", () => {
  const base = { startDay: "2026-08-27", week: 6, dailyMinutes: 60, daysPerWeek: 6, rings: [] as ("rest" | "light")[] };
  const states = (today: string, records: Record<string, DayRecord>) => weekView({ ...base, today }, records).map((d) => d.state);

  it("shows Aarav's sixth week: a day off became the rest day, today is open, two days are coming up", () => {
    const records = { "2026-10-01": day(60), "2026-10-02": day(0), "2026-10-03": day(60), "2026-10-04": day(60), "2026-10-05": day(48.7) };
    const days = weekView({ ...base, today: "2026-10-05" }, records);
    expect(days.map((d) => d.state)).toEqual(["done", "rest", "done", "done", "open", "ahead", "ahead"]);
    expect(days[4].today).toBe(true);
    expect(Math.round(days[4].share * 100)).toBe(81);
    expect(practisedDays(days)).toBe(4);
  });

  it("puts the rest day at the end of the week when every day so far had practice", () => {
    expect(states("2026-10-01", {})).toEqual(["open", "ahead", "ahead", "ahead", "ahead", "ahead", "rest_ahead"]);
    const six = Object.fromEntries(daysOfWeek(base.startDay, 6).slice(0, 6).map((k) => [k, day(60)]));
    expect(states("2026-10-07", six)).toEqual(["done", "done", "done", "done", "done", "done", "rest"]);
  });

  it("shows a second day with no practice as a day with none, and asks for nothing extra afterwards", () => {
    const s = states("2026-10-04", { "2026-10-01": day(60) });
    expect(s).toEqual(["done", "rest", "none", "open", "ahead", "ahead", "ahead"]);
    /* five practice days are all this week can still hold; no day is added and no minutes are owed */
    const days = weekView({ ...base, today: "2026-10-04" }, { "2026-10-01": day(60) });
    for (const d of days) expect(d.goal).toBeLessThanOrEqual(60);
  });

  it("never raises a day's minutes to make up for a missed one", () => {
    const records = { "2026-10-01": day(0), "2026-10-02": day(0), "2026-10-03": day(10) };
    const days = weekView({ ...base, today: "2026-10-04" }, records);
    expect(days.filter((d) => d.key >= "2026-10-04").every((d) => d.goal === 60)).toBe(true);
    expect(days[2].state).toBe("part");
  });

  it("gives a five-day programme two rest days", () => {
    const five = { ...base, dailyMinutes: 15, daysPerWeek: 5 };
    expect(weekView({ ...five, today: "2026-10-01" }, {}).map((d) => d.state)).toEqual(["open", "ahead", "ahead", "ahead", "ahead", "rest_ahead", "rest_ahead"]);
    const r = { "2026-10-01": day(0, 15), "2026-10-02": day(15, 15), "2026-10-03": day(0, 15), "2026-10-04": day(0, 15) };
    expect(weekView({ ...five, today: "2026-10-05" }, r).map((d) => d.state)).toEqual(["rest", "done", "rest", "none", "open", "ahead", "ahead"]);
  });

  it("keeps the minutes a past day was set, when the dose has changed since", () => {
    const days = weekView({ ...base, dailyMinutes: 30, today: "2026-10-03" }, { "2026-10-01": day(60, 60), "2026-10-02": day(30, 60) });
    expect(days.slice(0, 2).map((d) => [d.state, d.goal])).toEqual([["done", 60], ["part", 60]]);
    expect(days[2].goal).toBe(30);
  });

  it("makes a habit programme's day from its rings, with no rest days", () => {
    const habit = { startDay: "2026-10-01", week: 1, dailyMinutes: 0, daysPerWeek: 7, rings: ["rest", "light"] as ("rest" | "light")[] };
    const full: DayRecord = { train: 0, trainGoal: 0, rest: 6, restGoal: 6, light: 90, lightGoal: 90 };
    const some: DayRecord = { ...full, light: 20 };
    const days = weekView({ ...habit, today: "2026-10-04" }, { "2026-10-01": full, "2026-10-02": some, "2026-10-04": some });
    expect(days.map((d) => d.state)).toEqual(["done", "part", "none", "open", "ahead", "ahead", "ahead"]);
    expect(days.slice(0, 2).map((d) => [d.minutes, d.goal, Math.round(d.share * 100)])).toEqual([[0, 0, 100], [0, 0, 61]]);
    /* today counts as a day with something logged once a ring has moved */
    expect(practisedDays(days)).toBe(3);
  });

  it("has no days to keep while no minutes are set", () => {
    expect(weekView({ ...base, dailyMinutes: 0, daysPerWeek: 0, today: "2026-10-03" }, {}).every((d) => d.state === "waiting")).toBe(true);
  });
});

describe("check-ups, the visit and next week", () => {
  const p = plan("lazy-eye"), start = "2026-08-27";

  it("sets a check-up for week 1, then at its own interval, and always for the last week", () => {
    const monthly = { test: "stereo", everyWeeks: 4 };
    expect([1, 2, 4, 5, 9, 11, 12].map((w) => checkInWeek(p, monthly, w))).toEqual([true, false, false, true, true, false, true]);
    expect([1, 2, 12].map((w) => checkInWeek(p, { test: "acuity", everyWeeks: 1 }, w))).toEqual([true, true, true]);
    expect(checkInWeek({ weeks: null }, monthly, 41)).toBe(true);
  });

  it("shows this week's check-ups, done or due, and keeps an earlier one due until it is taken", () => {
    /* week 6: weekly ones taken today; the monthly ones were set for week 5 and not taken since */
    const taken = [{ test: "acuity", day: "2026-10-05" }, { test: "balance", day: "2026-10-05" }, { test: "stereo", day: "2026-08-30" }];
    expect(checksFor(p, start, 6, taken)).toEqual([
      { test: "acuity", since: 6, done: true },
      { test: "balance", since: 6, done: true },
      { test: "stereo", since: 5, done: false },
      { test: "suppression", since: 5, done: false },
    ]);
    /* once taken in or after the week it was set for, an earlier check-up is no longer listed */
    const later = [...taken, { test: "stereo", day: "2026-09-25" }, { test: "suppression", day: "2026-10-02" }];
    expect(checksFor(p, start, 6, later).map((c) => c.test)).toEqual(["acuity", "balance"]);
  });

  it("does not count a result from before the week a check-up was set for", () => {
    expect(checksFor(p, start, 6, [{ test: "acuity", day: "2026-09-30" }])[0]).toEqual({ test: "acuity", since: 6, done: false });
  });

  it("asks for the eye-test visit in week 6 of the lazy-eye plan and in no other week", () => {
    expect(Array.from({ length: 12 }, (_, i) => i + 1).filter((w) => visitIn(p, w))).toEqual([6]);
  });

  it("says what next week holds, and nothing after the last week", () => {
    expect(nextWeek(p, 5)).toEqual({ week: 6, chapters: ["film-and-play", "film-day"], checks: ["acuity", "balance"], visit: true, last: false, newStage: false });
    expect(nextWeek(p, 11)).toMatchObject({ week: 12, last: true, checks: ["acuity", "balance", "stereo", "suppression"] });
    expect(nextWeek(p, 12)).toBeNull();
    expect(nextWeek(plan("convergence"), 4)).toMatchObject({ week: 5, chapters: ["wider-range"], newStage: true });
    expect(nextWeek(plan("eye-fitness"), 400)).toMatchObject({ week: 401, last: false });
  });
});
