// Eyes Opener: A stand-in database that records every update. `schema` hands back marked objects so a test can tell which.
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * A stand-in database that records every update. `schema` hands back marked objects so a test can tell which
 * table an update went to. Nothing here reads a row: the rules that decide are tested in programme-rules.test.ts.
 */
const fake = vi.hoisted(() => {
  const updates: { table: string; set: Record<string, unknown> }[] = [];
  const state = { matched: 1 };
  const update = (table: { name: string }) => ({
    set: (set: Record<string, unknown>) => {
      updates.push({ table: table.name, set });
      const rows = () => Promise.resolve(Array.from({ length: state.matched }, () => ({ id: "row" })));
      const where = () => Object.assign(rows(), { returning: rows });
      return { where };
    },
  });
  const db = { update, transaction: async <T>(run: (tx: { update: typeof update }) => Promise<T>) => run({ update }) };
  const column = new Proxy({}, { get: () => ({}) });
  const table = (name: string) => new Proxy({ name }, { get: (t, key) => (key === "name" ? t.name : column) });
  const schema = new Proxy({}, { get: (_, key) => table(String(key)) });
  return { updates, state, db, schema };
});
vi.mock("@/db", () => ({ db: fake.db, schema: fake.schema }));

import { exerciseBySlug } from "@/data";
import { programmePlans } from "@/data/programme-plans";
import { kindOf } from "@/games/built";
import { JOBS } from "@/lib/jobs";
import { itemHref, nextStep, syncEnrolment } from "@/lib/programme";
import { chapterFor, FILM_SLUG, progress, type DayDone, type Fit } from "@/lib/programme-rules";
import { CINEMA, isCareRoutine, onCounsellorPlan } from "@/lib/sessions";

const DAY = 86_400_000;
const NOW = new Date("2026-10-05T06:00:00Z");
const enrolment = (programme: string, week: number, daysAgo: number, status: "active" | "finished" = "active") =>
  ({ id: "e1", profileId: "p1", programme, week, status, startedAt: new Date(NOW.getTime() - daysAgo * DAY) });
const all = (age: number | null): Fit => ({ age, usable: () => true });
const nothing: DayDone = { minutes: {}, train: 0, logged: [], rest: { done: 0, goal: 6 }, light: { done: 0, goal: 90 } };

beforeEach(() => { fake.updates.length = 0; fake.state.matched = 1; });

describe("keeping the stored week in step with the calendar", () => {
  it("writes nothing when the stored week is already right", async () => {
    expect(await syncEnrolment(enrolment("lazy-eye", 6, 39), NOW)).toEqual({ week: 6, finished: false, changed: false });
    expect(fake.updates).toEqual([]);
  });

  it("moves the week on, and only the week", async () => {
    expect(await syncEnrolment(enrolment("lazy-eye", 6, 42), NOW)).toEqual({ week: 7, finished: false, changed: true });
    expect(fake.updates).toEqual([{ table: "enrolment", set: { week: 7 } }]);
  });

  it("does not move on a week for practice done or missed: only the start day and today count", async () => {
    /* the function is given nothing about sessions at all */
    expect(await syncEnrolment(enrolment("convergence", 1, 20), NOW)).toMatchObject({ week: 3, finished: false });
  });

  it("closes a course the day after its last week, keeps the week at the last one, and puts the profile back at level 0", async () => {
    const r = await syncEnrolment(enrolment("lazy-eye", 12, 84), NOW);
    expect(r).toEqual({ week: 12, finished: true, changed: true });
    expect(fake.updates.map((u) => u.table)).toEqual(["enrolment", "profile"]);
    expect(fake.updates[0].set).toMatchObject({ status: "finished", week: 12, endedAt: NOW });
    expect(fake.updates[1].set).toEqual({ accessLevel: 0 });
  });

  it("keeps a course open on the last day of its last week", async () => {
    expect(await syncEnrolment(enrolment("lazy-eye", 12, 83), NOW)).toEqual({ week: 12, finished: false, changed: false });
    expect(fake.updates).toEqual([]);
  });

  it("leaves the profile alone when someone else closed the course first", async () => {
    fake.state.matched = 0;
    expect(await syncEnrolment(enrolment("after-stroke", 2, 30), NOW)).toEqual({ week: 2, finished: true, changed: false });
    expect(fake.updates.map((u) => u.table)).toEqual(["enrolment"]);
  });

  it("never ends a habit programme, however long it has run", async () => {
    expect(await syncEnrolment(enrolment("screen-strain", 3, 700), NOW)).toEqual({ week: 101, finished: false, changed: true });
    expect(fake.updates).toEqual([{ table: "enrolment", set: { week: 101 } }]);
  });

  it("touches nothing that is not an active enrolment of a known programme", async () => {
    await syncEnrolment(enrolment("lazy-eye", 3, 400, "finished"), NOW);
    await syncEnrolment(enrolment("not-a-programme", 3, 400), NOW);
    expect(fake.updates).toEqual([]);
  });

  it("is on the list of daily jobs", () => {
    expect(JOBS.find((j) => j.name === "programme-weeks")?.cadence).toBe("daily");
  });
});

describe("care and training stay apart", () => {
  /* The session code decides what a care routine is. A plan must agree with it, or a care log would be asked to fill training minutes. */
  const careItem = (kind: string, slug: string) => (kind === "exercise" ? isCareRoutine("exercise", slug) : kind === "game" ? kindOf(slug) === "care" : false);

  it("puts only care routines in care parts and none in training parts, in every plan at every age", () => {
    for (const plan of programmePlans) for (const age of [null, 5, 8, 12, 40]) for (const week of [1, 2, 5, 9]) for (let day = 1; day <= 7; day++) {
      for (const part of chapterFor(plan, week, day, 60, all(age)).parts) {
        for (const it of part.items) expect(careItem(it.kind, it.slug), `${plan.slug} ${part.key} ${it.slug}`).toBe(part.kind === "care");
      }
    }
  });

  it("never lets a care routine's time count toward the chapter, even an hour of it", () => {
    const chapter = chapterFor(programmePlans.find((p) => p.slug === "lazy-eye")!, 1, 1, 60, all(6));
    const p = progress(chapter, { ...nothing, logged: ["exercise:glasses-check-in", "exercise:patch-wear-timer"] });
    expect(p.minutes).toBe(0);
    expect(p.parts.filter((x) => x.state === "done").map((x) => x.key)).toEqual(["glasses", "patch"]);
    expect(exerciseBySlug("patch-wear-timer")?.mechanism).toBe("patch");
  });

  it("uses the slug every film session is saved under", () => {
    expect(FILM_SLUG).toBe(CINEMA);
  });
});

describe("counsellor-led items", () => {
  it("open for a member with a linked counsellor, and not without one", () => {
    expect(onCounsellorPlan({ enrolment: null, linked: true }, "exercise", "see-both-lights")).toBe(true);
    expect(onCounsellorPlan({ enrolment: null, linked: false }, "exercise", "see-both-lights")).toBe(false);
  });
});

describe("where a chapter leads", () => {
  it("sends each kind of item to the page where it is done", () => {
    expect(itemHref({ kind: "film", slug: FILM_SLUG })).toBe("/train/cinema");
    expect(itemHref({ kind: "game", slug: "firefly-catch" })).toBe("/train/games/firefly-catch/play");
    expect(itemHref({ kind: "exercise", slug: "brock-string" })).toBe("/train/exercises/brock-string");
  });

  it("opens the next part that is not done, and nothing once the chapter is finished", () => {
    const chapter = chapterFor(programmePlans.find((p) => p.slug === "lazy-eye")!, 6, 5, 60, all(6));
    const at = (d: DayDone) => nextStep({ chapter, done: progress(chapter, d) });
    expect(at(nothing)).toEqual({ index: 1, total: 3, href: "/train/cinema" });
    expect(at({ ...nothing, minutes: { "film:two-eye-cinema": 40 }, train: 40 })).toMatchObject({ index: 3, total: 3 });
    expect(at({ ...nothing, minutes: { "film:two-eye-cinema": 40 }, train: 40 })!.href).toMatch(/^\/train\/games\/[a-z-]+\/play$/);
    expect(at({ ...nothing, minutes: { "film:two-eye-cinema": 60 }, train: 60 })).toBeNull();
  });

  it("opens the first habit of a day with no training", () => {
    const chapter = chapterFor(programmePlans.find((p) => p.slug === "screen-strain")!, 1, 1, 0, all(null));
    expect(nextStep({ chapter, done: progress(chapter, nothing) })).toEqual({ index: 1, total: 3, href: "/train/exercises/desk-set-up-check" });
  });
});
