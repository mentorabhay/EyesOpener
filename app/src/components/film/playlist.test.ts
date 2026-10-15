import { describe, expect, it } from "vitest";
import {
  addFilms, addReel, EMPTY, filmKey, handleKey, isVideoFile, MAX_FILMS, moveFilm, nextFilm, parseStored, REEL_KEY, removeFilm, resumeAt,
  selectFilm, serialise, setDuration, setPosition, sizeText, storageKey, titleOf, watchedShare, type Stored,
} from "./playlist";

const A = { name: "Holiday part 1.mp4", size: 1000 }, B = { name: "Holiday part 2.mp4", size: 2000 }, C = { name: "Kites.webm", size: 3000 };
const keyA = filmKey(A.name, A.size), keyB = filmKey(B.name, B.size), keyC = filmKey(C.name, C.size);
const three = () => addFilms(EMPTY, [A, B, C]).stored;
const order = (s: Stored) => s.films.map((f) => f.name);

describe("keys", () => {
  it("keeps one list per profile", () => {
    expect(storageKey("p1")).toBe("iopener.cinema.v1.p1");
    expect(storageKey("p1")).not.toBe(storageKey("p2"));
    expect(handleKey("p1", keyA)).not.toBe(handleKey("p2", keyA));
  });

  it("gives the same file the same key and a different file another", () => {
    expect(filmKey("a.mp4", 10)).toBe(filmKey("a.mp4", 10));
    expect(filmKey("a.mp4", 10)).not.toBe(filmKey("a.mp4", 11));
    expect(filmKey("a.mp4", 10)).not.toBe(filmKey("b.mp4", 10));
    expect(filmKey("a.mp4", 10)).not.toBe(REEL_KEY);
  });
});

describe("titleOf", () => {
  it("drops the folder and the ending", () => {
    expect(titleOf("Holiday part 1.mp4")).toBe("Holiday part 1");
    expect(titleOf("C:\\films\\Big.Buck.Bunny.webm")).toBe("Big.Buck.Bunny");
    expect(titleOf("/home/me/clip.MOV")).toBe("clip");
    expect(titleOf("noending")).toBe("noending");
    expect(titleOf(".mp4")).toBe(".mp4");
    expect(titleOf("")).toBe("Film");
    expect(titleOf("x".repeat(300) + ".mp4")).toHaveLength(120);
  });
});

describe("addFilms", () => {
  it("adds films in the order picked and makes the first one current", () => {
    const r = addFilms(EMPTY, [A, B]);
    expect(order(r.stored)).toEqual(["Holiday part 1", "Holiday part 2"]);
    expect(r.added).toEqual([keyA, keyB]);
    expect(r.stored.current).toBe(keyA);
    expect(r.stored.films[0]).toEqual({ key: keyA, name: "Holiday part 1", size: 1000, duration: 0, position: 0, done: false });
  });

  it("adds more to the end and keeps the current film", () => {
    const first = selectFilm(addFilms(EMPTY, [A, B]).stored, keyB);
    const r = addFilms(first, [C]);
    expect(order(r.stored)).toEqual(["Holiday part 1", "Holiday part 2", "Kites"]);
    expect(r.stored.current).toBe(keyB);
  });

  it("keeps the row, the order and the place of a film picked again", () => {
    const watched = setPosition(three(), keyB, 400, 900);
    const r = addFilms(watched, [B, B]);
    expect(r.added).toEqual([]);
    expect(r.known).toEqual([keyB]);
    expect(order(r.stored)).toEqual(order(watched));
    expect(r.stored.films[1].position).toBe(400);
  });

  it("does not add the same file twice in one pick", () => {
    expect(addFilms(EMPTY, [A, A]).stored.films).toHaveLength(1);
  });

  it("stops at the longest list and says how many were left out", () => {
    const many = Array.from({ length: MAX_FILMS + 3 }, (_, i) => ({ name: `f${i}.mp4`, size: i + 1 }));
    const r = addFilms(EMPTY, many);
    expect(r.stored.films).toHaveLength(MAX_FILMS);
    expect(r.left).toBe(3);
  });
});

describe("addReel", () => {
  it("adds the test reel once", () => {
    const once = addReel(EMPTY, "Test reel", 90);
    expect(once.films).toEqual([{ key: REEL_KEY, name: "Test reel", size: 0, duration: 90, position: 0, done: false }]);
    expect(addReel(once, "Test reel", 90)).toBe(once);
  });
});

describe("reordering and removing", () => {
  it("moves a film up and down one place", () => {
    expect(order(moveFilm(three(), keyC, -1))).toEqual(["Holiday part 1", "Kites", "Holiday part 2"]);
    expect(order(moveFilm(three(), keyA, 1))).toEqual(["Holiday part 2", "Holiday part 1", "Kites"]);
  });

  it("leaves the list alone at its ends and for a film that is not in it", () => {
    const s = three();
    expect(moveFilm(s, keyA, -1)).toBe(s);
    expect(moveFilm(s, keyC, 1)).toBe(s);
    expect(moveFilm(s, "nope", 1)).toBe(s);
  });

  it("keeps the current film current when the order changes", () => {
    expect(moveFilm(selectFilm(three(), keyB), keyB, 1).current).toBe(keyB);
  });

  it("removes a film and forgets its place", () => {
    const s = removeFilm(setPosition(three(), keyB, 300, 900), keyB);
    expect(order(s)).toEqual(["Holiday part 1", "Kites"]);
    expect(addFilms(s, [B]).stored.films.at(-1)?.position).toBe(0);
  });

  it("moves on to the next film when the current one is removed, or back at the end of the list", () => {
    expect(removeFilm(selectFilm(three(), keyB), keyB).current).toBe(keyC);
    expect(removeFilm(selectFilm(three(), keyC), keyC).current).toBe(keyB);
    expect(removeFilm(addFilms(EMPTY, [A]).stored, keyA)).toEqual({ films: [], current: null });
  });

  it("selects only a film that is in the list", () => {
    const s = three();
    expect(selectFilm(s, keyC).current).toBe(keyC);
    expect(selectFilm(s, "nope")).toBe(s);
  });
});

describe("places", () => {
  it("notes where a film stopped", () => {
    const s = setPosition(three(), keyA, 760, 2710);
    expect(s.films[0]).toMatchObject({ position: 760, duration: 2710, done: false });
    expect(resumeAt(s.films[0])).toBe(760);
    expect(watchedShare(s.films[0])).toBeCloseTo(760 / 2710);
  });

  it("never keeps a place past the end of the film", () => {
    expect(setPosition(three(), keyA, 5000, 900).films[0].position).toBe(900);
  });

  it("counts a film stopped within five seconds of its end as watched, and starts it again next time", () => {
    const s = setPosition(three(), keyA, 896, 900);
    expect(s.films[0].done).toBe(true);
    expect(resumeAt(s.films[0])).toBeNull();
    expect(setPosition(s, keyA, 30, 900).films[0].done).toBe(true);
  });

  it("offers no place to carry on from near the start", () => {
    expect(resumeAt(setPosition(three(), keyA, 9, 900).films[0])).toBeNull();
    expect(resumeAt(setPosition(three(), keyA, 10, 900).films[0])).toBe(10);
    expect(resumeAt(undefined)).toBeNull();
  });

  it("offers the place of a film whose length is not known yet", () => {
    const s = setPosition(three(), keyA, 120);
    expect(resumeAt(s.films[0])).toBe(120);
    expect(watchedShare(s.films[0])).toBeNull();
  });

  it("notes a film's length and pulls a place back inside it", () => {
    const s = setDuration(setPosition(three(), keyA, 500), keyA, 300);
    expect(s.films[0]).toMatchObject({ duration: 300, position: 300 });
    expect(setDuration(s, keyA, 300)).toBe(s);
    expect(setDuration(s, keyA, NaN)).toBe(s);
  });

  it("returns the same list when nothing changed, so nothing is written for it", () => {
    const s = setPosition(three(), keyA, 100, 900);
    expect(setPosition(s, keyA, 100.1, 900)).toBe(s);
    expect(setPosition(s, "nope", 5, 900)).toBe(s);
  });
});

describe("nextFilm", () => {
  it("is the next film down the list that can be played", () => {
    const s = three();
    expect(nextFilm(s, keyA, () => true)).toBe(keyB);
    expect(nextFilm(s, keyA, (k) => k !== keyB)).toBe(keyC);
  });

  it("is nothing after the last film, and never goes round to the top", () => {
    const s = three();
    expect(nextFilm(s, keyC, () => true)).toBeNull();
    expect(nextFilm(s, keyB, (k) => k === keyA)).toBeNull();
    expect(nextFilm(s, "nope", () => true)).toBeNull();
  });
});

describe("what the browser keeps", () => {
  it("reads back what it wrote", () => {
    const s = selectFilm(setPosition(addReel(three(), "Test reel", 90), keyB, 400, 900), keyB);
    expect(parseStored(serialise(s))).toEqual(s);
  });

  it("holds names, sizes, lengths and places and nothing else", () => {
    const kept = JSON.parse(serialise(setPosition(three(), keyA, 100, 900))) as { films: object[] };
    for (const f of kept.films) expect(Object.keys(f).sort()).toEqual(["done", "duration", "key", "name", "position", "size"]);
  });

  it("gives an empty list for anything broken", () => {
    for (const bad of [null, undefined, "", "{", "[]", "7", '{"films":7}', '"x"']) expect(parseStored(bad)).toEqual(EMPTY);
  });

  it("drops rows that are not films and repairs numbers", () => {
    const raw = JSON.stringify({ films: [
      { key: keyA, name: "A", size: 10, duration: 100, position: 500, done: true },
      { key: keyA, name: "A again", size: 10 },
      { key: "", name: "no key" }, { name: "no key" }, null, 5,
      { key: keyB, name: "B", size: -4, duration: "long", position: -3, done: "yes" },
    ], current: "gone" });
    expect(parseStored(raw)).toEqual({ films: [
      { key: keyA, name: "A", size: 10, duration: 100, position: 100, done: true },
      { key: keyB, name: "B", size: 0, duration: 0, position: 0, done: false },
    ], current: null });
  });

  it("never reads back more than the longest list", () => {
    const films = Array.from({ length: MAX_FILMS + 10 }, (_, i) => ({ key: `f:${i}:x`, name: "x", size: i }));
    expect(parseStored(JSON.stringify({ films })).films).toHaveLength(MAX_FILMS);
  });
});

describe("isVideoFile", () => {
  it("goes by the type the browser gives, and by the ending when it gives none", () => {
    expect(isVideoFile("a.mp4", "video/mp4")).toBe(true);
    expect(isVideoFile("a.webm", "video/webm")).toBe(true);
    expect(isVideoFile("holiday.mkv", "")).toBe(true);
    expect(isVideoFile("notes.pdf", "application/pdf")).toBe(false);
    expect(isVideoFile("song.mp3", "audio/mpeg")).toBe(false);
    expect(isVideoFile("film.mkv", "application/octet-stream")).toBe(true);
    expect(isVideoFile("data.bin", "application/octet-stream")).toBe(false);
    expect(isVideoFile("clip.mp4", "text/plain")).toBe(false);
    expect(isVideoFile("readme", "")).toBe(false);
  });
});

describe("sizeText", () => {
  it("writes a size in plain units", () => {
    expect(sizeText(1_400_000_000)).toBe("1.4 GB");
    expect(sizeText(730_000_000)).toBe("730 MB");
    expect(sizeText(2_273_913)).toBe("2 MB");
    expect(sizeText(4_000)).toBe("4 KB");
    expect(sizeText(12)).toBe("1 KB");
  });
});
