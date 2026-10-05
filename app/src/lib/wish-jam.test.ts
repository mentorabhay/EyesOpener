import { describe, expect, it } from "vitest";
import { wishJam as copy } from "@/copy/wish-jam";
import {
  afterReview, ageBand, CODE_ALPHABET, firstNameOf, GAME_KINDS, isLibraryGame, isOpenWish, isPublicStatus, isWishCode, LINE_MAX, lineProblem, LOVES,
  nameAfterReview, nameProblem, nameRefusal, nameWords, PLAYS, publicState, STAFF_STEPS, staffStep, staffSteps, tidy, toPublic, wishRefusal, wishStatus,
  type WishInput, type WishRow,
} from "./wish-jam";

const NAMES = ["Aarav", "Sharma family"];

describe("the lists a guardian chooses from", () => {
  it("has words for every choice, and no choice without words", () => {
    expect(Object.keys(copy.loves).sort()).toEqual([...LOVES].sort());
    expect(Object.keys(copy.plays).sort()).toEqual([...PLAYS].sort());
    expect(Object.keys(copy.games).sort()).toEqual([...GAME_KINDS].sort());
  });
});

describe("the short line", () => {
  it("may be empty, and may say what the child would like", () => {
    expect(lineProblem("", NAMES)).toBeNull();
    expect(lineProblem("   ", NAMES)).toBeNull();
    expect(lineProblem("Trains instead of blocks, with a station to stop at.", NAMES)).toBeNull();
    expect(lineProblem("He likes it when the animals wave back", NAMES)).toBeNull();
  });
  it("never carries the child's name or the family's name", () => {
    expect(lineProblem("Aarav wants trains", NAMES)).toBe("name");
    expect(lineProblem("a train for AARAV!", NAMES)).toBe("name");
    expect(lineProblem("The Sharma boy loves trains", NAMES)).toBe("name");
    /* a word that only holds the name inside it is not the name */
    expect(lineProblem("A sharmaji-style snack stall in the game", ["Sharma family"])).toBeNull();
    expect(lineProblem("Trains that go far away", ["Ara", "Far family"])).toBe("name");
    expect(lineProblem("Trains that go farther", ["Far family"])).toBeNull();
  });
  it("does not mistake 'family' or 'household' for a name", () => {
    expect(nameWords(["Sharma family", "Staff test household"])).toEqual(["sharma", "staff"]);
    expect(lineProblem("A game the whole family can play", NAMES)).toBeNull();
    /* names written in another script are found as whole words too */
    expect(lineProblem("आरव को रेल पसंद है", ["आरव"])).toBe("name");
  });
  it("never carries a school or a class", () => {
    for (const line of ["He goes to Hillview School", "For the kids of class 2", "Std 3 children love cricket", "grade 4 cricket", "her nursery friends like birds"]) {
      expect(lineProblem(line, NAMES), line).toBe("place");
    }
  });
  it("never carries a phone number, an email address or a link", () => {
    for (const line of ["call 98765 43210", "mail me at a@b.test", "see https://example.test", "www.example.test has the idea", "PIN 411038"]) {
      expect(lineProblem(line, NAMES), line).toBe("contact");
    }
    expect(lineProblem("A train with 12 coaches and 3 stations", NAMES)).toBeNull();
  });
  it("makes no promise about eyes", () => {
    expect(lineProblem("A train game that cures lazy eye", NAMES)).toBe("promise");
  });
  it("is short", () => {
    expect(lineProblem("x".repeat(LINE_MAX), [])).toBeNull();
    expect(lineProblem("x".repeat(LINE_MAX + 1), [])).toBe("length");
  });
  it("is stored on one line", () => {
    expect(tidy("  Trains \n instead   of blocks ")).toBe("Trains instead of blocks");
  });
});

describe("the name a child gives the game", () => {
  it("is a few words of letters and digits", () => {
    for (const name of ["Station Hero", "Chuk Chuk 2", "रेल गाड़ी", "Tiger's Train", "Go-Go Rail"]) expect(nameProblem(name, NAMES), name).toBeNull();
  });
  it("is refused when it is too short, too long, too many words or not words at all", () => {
    expect(nameProblem("A", NAMES)).toBe("length");
    expect(nameProblem("x".repeat(25), NAMES)).toBe("length");
    expect(nameProblem("one two three four five", NAMES)).toBe("shape");
    expect(nameProblem("<b>Train</b>", NAMES)).toBe("shape");
    expect(nameProblem("Train :)", NAMES)).toBe("shape");
    expect(nameProblem("Train 98765", NAMES)).toBe("shape");
  });
  it("never carries the child's or the family's name, a school, or a promise", () => {
    expect(nameProblem("Aarav Express", NAMES)).toBe("name");
    expect(nameProblem("Sharma Rail", NAMES)).toBe("name");
    expect(nameProblem("School Train", NAMES)).toBe("place");
    expect(nameProblem("Eye Cure Train", NAMES)).toBe("promise");
  });
});

describe("who the wish is for, as a builder sees it", () => {
  it("is an age band, never an age", () => {
    expect([4, 6, 7, 9, 10, 12, 13, 17].map(ageBand)).toEqual(["4 to 6", "4 to 6", "7 to 9", "7 to 9", "10 to 12", "10 to 12", "13 to 17", "13 to 17"]);
    expect(ageBand(3)).toBeNull();
    expect(ageBand(18)).toBeNull();
    expect(ageBand(null)).toBeNull();
  });
  it("is a first name at most: the first word of the profile's name and nothing after it", () => {
    expect(firstNameOf("Aarav")).toBe("Aarav");
    expect(firstNameOf("Aarav Sharma")).toBe("Aarav");
    expect(firstNameOf("  Mary-Ann  D'Souza ")).toBe("Mary-Ann");
    expect(firstNameOf("आरव शर्मा")).toBe("आरव");
    expect(firstNameOf("A")).toBeNull();
    expect(firstNameOf("42")).toBeNull();
    expect(firstNameOf("")).toBeNull();
  });
});

describe("who may make a wish", () => {
  const ok: WishInput = { canShare: true, tester: false, profile: { kind: "child", age: 6 }, consented: true, hasOpen: false, loves: "trains", play: "steer", game: "any" };
  it("is a guardian, for a child of the household whose consent stands", () => {
    expect(wishRefusal(ok)).toBeNull();
    expect(wishRefusal({ ...ok, profile: { kind: "child", age: null } })).toBeNull();
  });
  it("is refused to a cheer seat and in child mode, before anything else is read", () => {
    expect(wishRefusal({ ...ok, canShare: false })).toBe("not_allowed");
    expect(wishRefusal({ ...ok, canShare: false, profile: null, loves: "x" })).toBe("not_allowed");
  });
  it("is never made from a staff test household, so the list holds members only", () => {
    expect(wishRefusal({ ...ok, tester: true })).toBe("tester");
  });
  it("is refused for a profile outside the household, for a grown-up, and under the age for screen sessions", () => {
    expect(wishRefusal({ ...ok, profile: null })).toBe("not_found");
    expect(wishRefusal({ ...ok, profile: { kind: "adult", age: 34 } })).toBe("not_child");
    expect(wishRefusal({ ...ok, profile: { kind: "child", age: 3 } })).toBe("too_young");
  });
  it("waits while a guardian's consent does not stand", () => {
    expect(wishRefusal({ ...ok, consented: false })).toBe("needs_consent");
  });
  it("is one at a time for a child", () => {
    expect(wishRefusal({ ...ok, hasOpen: true })).toBe("already");
  });
  it("takes only choices from the lists: nothing else can be sent in their place", () => {
    expect(wishRefusal({ ...ok, loves: "Aarav Sharma, Hillview School" })).toBe("bad_choice");
    expect(wishRefusal({ ...ok, play: "" })).toBe("bad_choice");
    expect(wishRefusal({ ...ok, game: null })).toBe("bad_choice");
  });
});

describe("where a wish stands", () => {
  it("is open until it is named or taken off the list", () => {
    expect(isOpenWish({ status: "in_review", nameStatus: null })).toBe(true);
    expect(isOpenWish({ status: "listed", nameStatus: null })).toBe(true);
    expect(isOpenWish({ status: "matched", nameStatus: null })).toBe(true);
    expect(isOpenWish({ status: "built", nameStatus: null })).toBe(true);
    expect(isOpenWish({ status: "built", nameStatus: "in_review" })).toBe(true);
    expect(isOpenWish({ status: "built", nameStatus: "blocked" })).toBe(true);
    expect(isOpenWish({ status: "built", nameStatus: "approved" })).toBe(false);
    expect(isOpenWish({ status: "blocked", nameStatus: null })).toBe(false);
  });
  it("is public only after a person approved it, and never once it is taken off", () => {
    expect(["in_review", "listed", "matched", "built", "blocked", "anything"].map(isPublicStatus)).toEqual([false, true, true, true, false, false]);
    expect(wishStatus("anything")).toBe("blocked");
  });
  it("tells the public list what to say", () => {
    expect(publicState({ status: "in_review", nameStatus: null })).toBeNull();
    expect(publicState({ status: "listed", nameStatus: null })).toBe("waiting");
    expect(publicState({ status: "matched", nameStatus: null })).toBe("matched");
    expect(publicState({ status: "built", nameStatus: "in_review" })).toBe("built");
    expect(publicState({ status: "built", nameStatus: "approved" })).toBe("named");
    expect(publicState({ status: "blocked", nameStatus: "approved" })).toBeNull();
  });
});

describe("a wish as anyone may read it", () => {
  const row: WishRow = { code: "W7KQ2M", loves: "trains", play: "steer", game: "two_eye", line: "Trains instead of blocks.", showFirstName: false, status: "listed", nameStatus: null, gameName: null, isSample: false };
  const child = { displayName: "Aarav Sharma", age: 6 };
  it("shows the code, an age band and the choices, and no name unless the guardian chose to show the first name", () => {
    expect(toPublic(row, child)).toEqual({ code: "W7KQ2M", firstName: null, band: "4 to 6", loves: "trains", play: "steer", game: "two_eye", line: "Trains instead of blocks.", state: "waiting", gameName: null, isSample: false });
    expect(toPublic({ ...row, showFirstName: true }, child)?.firstName).toBe("Aarav");
  });
  it("carries nothing else of the row or the child", () => {
    const full = { ...row, id: "an-id", accountId: "a-household", profileId: "a-profile", createdBy: "a-person" };
    expect(Object.keys(toPublic(full, { ...child, birthYear: 2020 } as typeof child)!).sort()).toEqual(["band", "code", "firstName", "game", "gameName", "isSample", "line", "loves", "play", "state"]);
  });
  it("shows the game's name only once a person approved it", () => {
    expect(toPublic({ ...row, status: "built", nameStatus: "in_review", gameName: "Station Hero" }, child)).toMatchObject({ state: "built", gameName: null });
    expect(toPublic({ ...row, status: "built", nameStatus: "blocked", gameName: "Station Hero" }, child)).toMatchObject({ state: "built", gameName: null });
    expect(toPublic({ ...row, status: "built", nameStatus: "approved", gameName: "Station Hero" }, child)).toMatchObject({ state: "named", gameName: "Station Hero" });
  });
  it("is nothing at all for a wish that waits, was taken off, or holds a choice that is not on the lists", () => {
    expect(toPublic({ ...row, status: "in_review" }, child)).toBeNull();
    expect(toPublic({ ...row, status: "blocked" }, child)).toBeNull();
    expect(toPublic({ ...row, loves: "something typed" }, child)).toBeNull();
  });
});

describe("naming the game", () => {
  const built = { status: "built", nameStatus: null };
  it("is for a guardian, once the wish is built, one name at a time", () => {
    expect(nameRefusal({ canShare: true, consented: true, wish: built })).toBeNull();
    expect(nameRefusal({ canShare: true, consented: true, wish: { status: "built", nameStatus: "blocked" } })).toBeNull();
    expect(nameRefusal({ canShare: false, consented: true, wish: built })).toBe("not_allowed");
    expect(nameRefusal({ canShare: true, consented: true, wish: null })).toBe("not_found");
    expect(nameRefusal({ canShare: true, consented: false, wish: built })).toBe("needs_consent");
    expect(nameRefusal({ canShare: true, consented: true, wish: { status: "matched", nameStatus: null } })).toBe("not_built");
    expect(nameRefusal({ canShare: true, consented: true, wish: { status: "built", nameStatus: "in_review" } })).toBe("waiting");
    expect(nameRefusal({ canShare: true, consented: true, wish: { status: "built", nameStatus: "approved" } })).toBe("named");
  });
});

describe("what staff do with a wish", () => {
  it("moves it one step at a time, and only from where the step starts", () => {
    expect(staffStep("listed", "match")).toBe("matched");
    expect(staffStep("matched", "unmatch")).toBe("listed");
    expect(staffStep("listed", "built")).toBe("built");
    expect(staffStep("matched", "built")).toBe("built");
    expect(staffStep("built", "unlist")).toBe("blocked");
    expect(staffStep("in_review", "match")).toBeNull();
    expect(staffStep("in_review", "built")).toBeNull();
    expect(staffStep("blocked", "built")).toBeNull();
    expect(staffStep("built", "match")).toBeNull();
  });
  it("has no step for a wish that still waits for review: that is decided in the moderation room", () => {
    expect(staffSteps("in_review")).toEqual([]);
    expect(staffSteps("blocked")).toEqual([]);
    expect(staffSteps("listed")).toEqual(["match", "built", "unlist"]);
    expect(STAFF_STEPS).toHaveLength(4);
  });
  it("ties a wish only to a game that is already in the library", () => {
    expect(isLibraryGame("comet-trail")).toBe(true);
    expect(isLibraryGame("a-game-nobody-added")).toBe(false);
    expect(isLibraryGame("")).toBe(false);
  });
  it("lists an approved wish and blocks a removed one; the same for a name", () => {
    expect(afterReview(true)).toBe("listed");
    expect(afterReview(false)).toBe("blocked");
    expect(nameAfterReview(true)).toBe("approved");
    expect(nameAfterReview(false)).toBe("blocked");
  });
});

describe("the code a builder quotes", () => {
  it("is six letters and digits that cannot be mistaken for each other", () => {
    expect(isWishCode("W7KQ2M")).toBe(true);
    expect(isWishCode("W7KQ2")).toBe(false);
    expect(isWishCode("W7KQ20")).toBe(false);
    expect(isWishCode("w7kq2m")).toBe(false);
    for (const ch of "0O1I") expect(CODE_ALPHABET.includes(ch)).toBe(false);
  });
});
