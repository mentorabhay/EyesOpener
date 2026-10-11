// Eyes Opener: Unit and regression test suite verifying library functionality.
import { describe, expect, it } from "vitest";
import { site } from "@/copy/site";
import { catalogue, exerciseBySlug, gameBySlug } from "@/data";
import { gameGuides } from "@/data/game-guides";
import { guides } from "@/data/guides";
import { PASSAGE_KINDS, QUESTION_MAX, ownPassages, questionWords, searchText, wordSearch } from "./library";

const all = ownPassages();
const trials = site.evidence.trials.groups.flatMap((g) => g.items);

describe("the research library's own passages", () => {
  it("holds every trial of the evidence page, every method, every label and every guide of this edition", () => {
    const count = (kind: string) => all.filter((p) => p.kind === kind).length;
    expect(count("trial")).toBe(trials.length);
    expect(count("method")).toBe(catalogue.mechanisms.length);
    expect(count("label")).toBe(catalogue.evidence.length);
    expect(count("exercise")).toBe(guides.filter((g) => exerciseBySlug(g.slug)).length);
    expect(count("game")).toBe(gameGuides.filter((g) => gameBySlug(g.slug)).length);
    /* stories come from an edition that has them */
    expect(count("story")).toBe(0);
  });

  it("gives each passage a key of its own, a kind from the list and a page of this app", () => {
    expect(new Set(all.map((p) => p.key)).size).toBe(all.length);
    for (const p of all) {
      expect(PASSAGE_KINDS, p.key).toContain(p.kind);
      expect(p.key.startsWith(`${p.kind}:`), p.key).toBe(true);
      expect(p.href.startsWith("/"), p.key).toBe(true);
      expect(p.title.trim().length, p.key).toBeGreaterThan(1);
      expect(p.text.trim().length, p.key).toBeGreaterThan(10);
    }
  });

  it("copies a trial word for word, with its source", () => {
    const citt = trials.find((t) => t.name === "CITT")!;
    const p = all.find((x) => x.key === "trial:citt")!;
    expect(p.text).toContain(citt.who);
    expect(p.text).toContain(citt.found);
    expect(p.text).toContain(citt.limit!);
    expect(p.sources[0]).toEqual({ label: citt.source, url: citt.href });
    expect(p.topic).toBe("Convergence");
  });

  it("gives every trial and every guide at least one source with a web address", () => {
    for (const p of all.filter((x) => x.kind === "trial" || x.kind === "exercise" || x.kind === "game")) {
      expect(p.sources.length, p.key).toBeGreaterThan(0);
      for (const s of p.sources) expect(s.url, p.key).toMatch(/^https?:\/\//);
    }
  });

  it("marks a guide's passage with its item, so a page can leave out what staff have hidden", () => {
    const p = all.find((x) => x.kind === "exercise")!;
    expect(p.item).toEqual({ kind: "exercise", slug: p.key.slice("exercise:".length) });
    expect(all.find((x) => x.kind === "trial")!.item).toBeUndefined();
  });

  it("offers the topic, the title and the words to a search", () => {
    const p = all.find((x) => x.key === "trial:citt")!;
    expect(searchText(p).startsWith("Convergence. CITT. ")).toBe(true);
  });
});

describe("a question's words", () => {
  it("keeps the words that carry meaning, once each, without a plural s", () => {
    expect(questionWords("How many HOURS of patching do the children really do, and what hours?")).toEqual(["many", "hour", "patching", "children", "really"]);
  });
  it("reads any script and ignores what is past the length limit", () => {
    expect(questionWords("बच्चे बाहर खेलें")).toEqual(["बच्चे", "बाहर", "खेलें"]);
    expect(questionWords(`${"a ".repeat(QUESTION_MAX)}patching`)).toEqual([]);
  });
  it("is empty for a question of small words only", () => {
    expect(questionWords("how do I?")).toEqual([]);
  });
});

describe("search by words", () => {
  it("finds the passage that carries the words, and puts a match in the title first", () => {
    const hits = wordSearch(all, "outdoor time short sight");
    expect(hits[0].passage.key).toBe("trial:outdoor-time-and-short-sight");
    expect(hits[0].matched).toBe(4);
  });
  it("lets a word match the start of a longer word", () => {
    expect(wordSearch(all, "patch").some((h) => h.passage.key === "trial:motas-patching-study")).toBe(true);
  });
  it("returns a passage's own words unchanged", () => {
    const hit = wordSearch(all, "pencil push-ups")[0];
    expect(all.find((p) => p.key === hit.passage.key)).toBe(hit.passage);
  });
  it("returns nothing for words the library does not hold, and for no words", () => {
    expect(wordSearch(all, "biryani recipe")).toEqual([]);
    expect(wordSearch(all, "")).toEqual([]);
    expect(wordSearch(all, "the and for")).toEqual([]);
  });
  it("asks for at least half the words, and returns a few passages at most", () => {
    expect(wordSearch(all, "patching zebra quantum volcano")).toEqual([]);
    expect(wordSearch(all, "children", 5).length).toBeLessThanOrEqual(5);
  });
});
