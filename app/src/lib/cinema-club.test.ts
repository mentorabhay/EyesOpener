import { describe, expect, it } from "vitest";
import { BREAK_SECONDS, CHAPTER_SECONDS } from "@/components/film/chapters";
import {
  CLUB_CHAPTERS, CLUB_PLAN, CLUB_SECONDS, clubScreen, clubStatus, firstStatus, GROUP_CONTRAST, inWeekOrder, isStart, listingRefusal, mayOpenKit,
  PLACE_KINDS, PLACE_NAME, placeProblem, SPONSOR_CLUBS_MAX, START_MAX, START_MIN, startChoices, timeText, type ListingInput,
} from "./cinema-club";

describe("who may open the host kit", () => {
  it("opens for a guardian and a co-guardian, not for a cheer seat, and never in child mode", () => {
    expect(mayOpenKit({ seat: "guardian", childMode: false })).toBe(true);
    expect(mayOpenKit({ seat: "co_guardian", childMode: false })).toBe(true);
    expect(mayOpenKit({ seat: "circle", childMode: false })).toBe(false);
    expect(mayOpenKit({ seat: "guardian", childMode: true })).toBe(false);
    expect(mayOpenKit({ seat: null, childMode: false })).toBe(false);
  });
});

describe("the group screen", () => {
  it("shows the same full picture to both eyes: no eye is dimmed for a room of children", () => {
    expect(GROUP_CONTRAST).toBe(1);
  });
  it("is one hour of film in the cinema's own chapters", () => {
    expect(CLUB_SECONDS).toBe(3600);
    expect(CLUB_PLAN).toEqual({ chapters: 6, chapterMinutes: CHAPTER_SECONDS / 60, breakSeconds: BREAK_SECONDS, filmMinutes: 60 });
  });
  it("calls an eye break after every chapter and waits until it was taken", () => {
    expect(clubScreen(0, 0)).toMatchObject({ chapter: 1, breakDue: false, over: false, left: CLUB_SECONDS });
    expect(clubScreen(CHAPTER_SECONDS - 1, 0)).toMatchObject({ chapter: 1, breakDue: false, toBreak: 1 });
    expect(clubScreen(CHAPTER_SECONDS, 0)).toMatchObject({ breakDue: true, finished: 1 });
    /* a film that ran on past the mark still owes the break */
    expect(clubScreen(CHAPTER_SECONDS + 4, 0)).toMatchObject({ breakDue: true });
    expect(clubScreen(CHAPTER_SECONDS, 1)).toMatchObject({ chapter: 2, breakDue: false, toBreak: CHAPTER_SECONDS });
  });
  it("stops after six chapters, with no seventh and no break after the last", () => {
    expect(clubScreen(CLUB_SECONDS - 1, CLUB_CHAPTERS - 1)).toMatchObject({ chapter: CLUB_CHAPTERS, over: false, left: 1 });
    expect(clubScreen(CLUB_SECONDS, CLUB_CHAPTERS - 1)).toMatchObject({ chapter: CLUB_CHAPTERS, over: true, breakDue: false, left: 0 });
    expect(clubScreen(CLUB_SECONDS + 500, 0)).toMatchObject({ chapter: 1, over: true, breakDue: false, left: 0 });
  });
  it("keeps six chapters and a break after each when a staff test household shortens the plan", () => {
    const short = { chapterSeconds: 10, breakSeconds: 3, shortened: true };
    expect(clubScreen(9, 0, short)).toMatchObject({ chapter: 1, breakDue: false, left: 51 });
    expect(clubScreen(10, 0, short)).toMatchObject({ breakDue: true });
    expect(clubScreen(60, 5, short)).toMatchObject({ over: true, breakDue: false, left: 0 });
  });
  it("treats numbers that make no sense as nothing watched", () => {
    expect(clubScreen(Number.NaN, 0)).toMatchObject({ chapter: 1, over: false, left: CLUB_SECONDS });
    expect(clubScreen(-40, -2)).toMatchObject({ chapter: 1, breakDue: false });
  });
});

describe("a place that may be listed", () => {
  it("has no home among the kinds of place", () => {
    expect([...PLACE_KINDS]).toEqual(["school", "library", "community_hall", "clinic"]);
    expect(PLACE_KINDS.some((k) => /home|house|flat/.test(k))).toBe(false);
  });
  it("takes the name of a public place", () => {
    for (const name of ["Hillview School library, Pune", "Kothrud Public Library, Pune", "Ward 12 community hall, Nashik", "Sunrise Eye Clinic waiting room, Thane", "St Mary's School hall, Mumbai"]) {
      expect(placeProblem(name), name).toBeNull();
    }
  });
  it("refuses a name that reads like a private home", () => {
    for (const name of ["My house, near the temple", "Our flat in Baner", "Flat no 12, Shanti Apartments", "House 44 Lane 3 Aundh", "Mrs Rao's home, Kothrud", "Anita's place on MG Road", "The Sharma residence, Pune", "At home with the Guptas", "B-204 apartment 7 Wakad"]) {
      expect(placeProblem(name), name).toBe("home");
    }
  });
  it("refuses a phone number, an email address or a link: a listing is a place and a time only", () => {
    for (const name of ["Public library, call 98765 43210", "City library 020-2567-1234", "School hall, write to host@example.test", "Library, see https://example.test", "Hall www.example.test"]) {
      expect(placeProblem(name), name).toBe("contact");
    }
  });
  it("refuses a name too short to find, or too long to read", () => {
    expect(placeProblem("Hall")).toBe("length");
    expect(placeProblem("  a  b ")).toBe("length");
    expect(placeProblem("x".repeat(PLACE_NAME.max + 1))).toBe("length");
  });
});

describe("the time of a club", () => {
  it("starts on a quarter hour between 8 in the morning and 7 in the evening", () => {
    expect(isStart(START_MIN)).toBe(true);
    expect(isStart(START_MAX)).toBe(true);
    expect(isStart(17 * 60 + 30)).toBe(true);
    expect(isStart(17 * 60 + 20)).toBe(false);
    expect(isStart(START_MIN - 15)).toBe(false);
    expect(isStart(START_MAX + 15)).toBe(false);
    expect(isStart("1050")).toBe(false);
    expect(startChoices()[0]).toBe(START_MIN);
    expect(startChoices().at(-1)).toBe(START_MAX);
    expect(startChoices().every(isStart)).toBe(true);
  });
  it("is written as a clock time", () => {
    expect(timeText(8 * 60)).toBe("8:00 am");
    expect(timeText(12 * 60)).toBe("12:00 pm");
    expect(timeText(17 * 60 + 30)).toBe("5:30 pm");
    expect(timeText(0)).toBe("12:00 am");
  });
});

describe("who may list a club, and what happens to the listing", () => {
  const good: ListingInput = { by: "sponsor", approved: true, open: 0, placeKind: "library", placeName: "Kothrud Public Library, Pune", weekday: 6, startMinute: 17 * 60 };
  it("lets an approved sponsor and staff list a public place", () => {
    expect(listingRefusal(good)).toBeNull();
    expect(listingRefusal({ ...good, by: "staff", approved: false })).toBeNull();
  });
  it("refuses a sponsor that is not approved, before anything else is read", () => {
    expect(listingRefusal({ ...good, approved: false })).toBe("not_approved");
    expect(listingRefusal({ ...good, approved: false, placeName: "My house" })).toBe("not_approved");
  });
  it("keeps a sponsor to a sensible number of open listings", () => {
    expect(listingRefusal({ ...good, open: SPONSOR_CLUBS_MAX - 1 })).toBeNull();
    expect(listingRefusal({ ...good, open: SPONSOR_CLUBS_MAX })).toBe("too_many");
    expect(listingRefusal({ ...good, by: "staff", open: SPONSOR_CLUBS_MAX })).toBeNull();
  });
  it("refuses a kind of place that is not on the list, a home most of all", () => {
    for (const placeKind of ["home", "house", "", null, 3]) expect(listingRefusal({ ...good, placeKind }), String(placeKind)).toBe("kind");
  });
  it("refuses a day or a time that makes no sense", () => {
    expect(listingRefusal({ ...good, weekday: 7 })).toBe("day");
    expect(listingRefusal({ ...good, weekday: "6" })).toBe("day");
    expect(listingRefusal({ ...good, startMinute: 23 * 60 })).toBe("time");
  });
  it("refuses a home whoever lists it, staff included", () => {
    expect(listingRefusal({ ...good, placeName: "Our flat in Baner" })).toBe("home");
    expect(listingRefusal({ ...good, by: "staff", placeName: "Mrs Rao's house, Kothrud" })).toBe("home");
  });
  it("makes a sponsor's listing wait for a person, and shows staff's own at once", () => {
    expect(firstStatus("sponsor")).toBe("in_review");
    expect(firstStatus("staff")).toBe("listed");
  });
  it("reads an unknown stored status as removed, so it is never shown", () => {
    expect(clubStatus("listed")).toBe("listed");
    expect(clubStatus("something")).toBe("removed");
  });
});

describe("the order clubs are shown in", () => {
  it("goes through the week from Monday, then by time, then by name", () => {
    const clubs = [
      { placeName: "B", weekday: 0, startMinute: 600 },
      { placeName: "Z", weekday: 6, startMinute: 1020 },
      { placeName: "A", weekday: 6, startMinute: 1020 },
      { placeName: "C", weekday: 1, startMinute: 900 },
      { placeName: "D", weekday: 6, startMinute: 600 },
    ];
    expect(inWeekOrder(clubs).map((c) => c.placeName)).toEqual(["C", "D", "A", "Z", "B"]);
    expect(clubs[0].placeName).toBe("B");
  });
});
