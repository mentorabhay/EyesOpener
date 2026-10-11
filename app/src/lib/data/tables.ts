// Eyes Opener: Every table in the database, and what a family's copy and a family's deletion do with it.
/**
 * Every table in the database, and what a family's copy and a family's deletion do with it.
 *
 * This list is the one place that decides it. The copy (export.ts) and the deletion (erase.ts) are both driven by it,
 * so they cannot disagree. TypeScript refuses to build while a table has no line here, and `tables.test.ts` checks the
 * list against the schema: every table, every foreign key that points at something a deletion removes, and the order
 * rows are removed in. A table or a key added later cannot be left out without a test failing.
 *
 * How to add a line:
 *  - `owner` says which rows are one household's. Leave it out when no row belongs to one household.
 *  - `copy` names the part of the family's file the rows become, or says in plain words why they are left out.
 *  - `erase` says what a deletion does: "rows" removes them, "unlink" keeps the row and empties the pointer,
 *    "people" is the rule for the grown-ups who sign in, "scrub" is the rule for the audit log.
 *  - `links` lists every other foreign key that points at a row a deletion removes, and what becomes of it.
 */
import type { PgTable } from "drizzle-orm/pg-core";
import type * as schema from "@/db/schema";

type Schema = typeof schema;
/** The name of every table, as it is exported from the schema. Enums are not tables and are left out. */
export type TableName = { [K in keyof Schema]: Schema[K] extends PgTable ? K : never }[keyof Schema];
type Col<K extends TableName> = Extract<keyof Schema[K]["_"]["columns"], string>;

/** The parts of a family's file, in the order they are written. Words for each part: src/copy/data.ts. */
export const PARTS = [
  "household", "people", "invites", "profiles", "consent", "safetyAnswers", "screens", "onboardingRuns", "eyeSettings",
  "checkUps", "programmes", "sessions", "days", "carePlans", "careLog", "monitorSamples", "streaks",
  "counsellorLinks", "counsellorNotes", "stories", "ideas", "experiments", "experimentPlaces", "review",
  "lights", "weekNotes", "mail", "wallTiles", "gallery", "glassesJourney", "heroes", "teams", "teamMoves",
  "sponsorGroups", "pushTokens", "enquiries", "dataRequests",
  "duets", "discoveryVotes", "mapPlaces",
  "classMissions", "wishes",
  "depthDays", "keeperWelcomes", "keeperAsks",
  "clipRuns",
] as const;
export type PartKey = (typeof PARTS)[number];

/** Which rows of a table are one household's. A row that matches any line is theirs. */
export interface Owner<K extends TableName = TableName> {
  /** The row is the household itself. */
  self?: true;
  /** Columns that hold the household's id. */
  account?: readonly Col<K>[];
  /** Columns that hold the id of one of the household's profiles. */
  profile?: readonly Col<K>[];
  /** Columns that hold the id of a grown-up who signs in to the household. */
  person?: readonly Col<K>[];
  /** The row hangs off a row of another table, and goes where that row goes. */
  parent?: { table: TableName; column: Col<K> };
  /** A loose pointer with no foreign key: the `kind` column says which table `column` points into. */
  ref?: { kind: Col<K>; column: Col<K>; to: Readonly<Record<string, TableName>> };
  /** A column that holds the email address of a grown-up who signs in to the household. */
  email?: Col<K>;
}

/** What becomes of a foreign key that points at a deleted row, when the row holding the key is not itself removed for that reason. */
export interface Link {
  /**
   * cleared: the key is emptied and the row keeps nothing of the household.
   * guarded: the key would remove the row, but the person it points at is never deleted (see `people` in erase.ts).
   * falls:   the row is removed with the row it points at. The reason says why that is right.
   */
  fate: "cleared" | "guarded" | "falls";
  why: string;
}

export interface Rule<K extends TableName = TableName> {
  /** One plain line: what the table holds. */
  holds: string;
  owner?: Owner<K>;
  copy:
    | { part: PartKey; /** Columns kept out of the file, each with the reason. */ hide?: Partial<Record<Col<K>, string>> }
    | { leftOut: string };
  erase: "rows" | "unlink" | "people" | "scrub" | { untouched: string };
  links?: Partial<Record<Col<K>, Link>>;
}

const sameHousehold = "The person is in the same household, so the row is removed with it.";
const staffOnly = "Points at a member of staff. A person with a staff role is never deleted with a household.";
const ownScreen = "Points at a screen of the same household. In a deletion of one profile the screen stays, because the family still uses it.";

export const TABLES = {
  /* ───────────── the household and its people ───────────── */
  account: {
    holds: "The household: its name and language.",
    owner: { self: true },
    copy: { part: "household", hide: { exitPinHash: "A scrambled PIN. The file says only whether one is set.", previewFor: "The id of the staff member a test household belongs to. The file says only that it is a test household." } },
    erase: "rows",
  },
  appUser: {
    holds: "A grown-up who signs in: name, email, seat and roles.",
    owner: { account: ["accountId"] },
    copy: { part: "people" },
    erase: "people",
  },
  invite: {
    holds: "A code a guardian shared so another grown-up could join.",
    owner: { account: ["accountId"] },
    copy: { part: "invites" },
    erase: "rows",
    links: {
      createdBy: { fate: "falls", why: "An invite is made by a person of the household it belongs to, so it is already removed with that household." },
      acceptedBy: { fate: "cleared", why: sameHousehold },
    },
  },
  profile: {
    holds: "A family member: name, adult or child, year of birth.",
    owner: { account: ["accountId"], profile: ["id"] },
    copy: { part: "profiles", hide: { pinHash: "A scrambled PIN. The file says only whether one is set." } },
    erase: "rows",
  },
  consent: {
    holds: "The agreement a guardian gave for a child.",
    owner: { account: ["accountId"], profile: ["profileId"] },
    copy: { part: "consent" },
    erase: "rows",
    links: { userId: { fate: "cleared", why: sameHousehold } },
  },
  triage: {
    holds: "Answers to the six safety questions.",
    owner: { profile: ["profileId"] },
    copy: { part: "safetyAnswers" },
    erase: "rows",
  },

  /* ───────────── screens, onboarding, eye settings, check-ups ───────────── */
  device: {
    holds: "A screen the family measured: its size and the viewing distance.",
    owner: { account: ["accountId"] },
    copy: { part: "screens" },
    erase: "rows",
  },
  onboardingRun: {
    holds: "One run of onboarding: the yes and no answers for each eye and how long it took.",
    owner: { profile: ["profileId"] },
    copy: { part: "onboardingRuns" },
    erase: "rows",
    links: { deviceId: { fate: "cleared", why: ownScreen } },
  },
  eyeProfile: {
    holds: "Eye settings: the weaker eye, the stronger-eye contrast, letter and target sizes.",
    owner: { profile: ["profileId"] },
    copy: { part: "eyeSettings" },
    erase: "rows",
    links: { deviceId: { fate: "cleared", why: ownScreen } },
  },
  testResult: {
    holds: "The number each check-up measured, and when.",
    owner: { profile: ["profileId"] },
    copy: { part: "checkUps" },
    erase: "rows",
    links: { deviceId: { fate: "cleared", why: ownScreen } },
  },

  /* ───────────── programmes, sessions, the eye day ───────────── */
  enrolment: {
    holds: "A programme a profile is on or was on, with its dose.",
    owner: { profile: ["profileId"] },
    copy: { part: "programmes" },
    erase: "rows",
    links: { approvedBy: { fate: "cleared", why: "Points at the counsellor who set the dose. A person with a counsellor role is never deleted with a household." } },
  },
  session: {
    holds: "One sitting of a game, exercise, film or check-up, with what it measured.",
    owner: { profile: ["profileId"] },
    copy: { part: "sessions" },
    erase: "rows",
    links: { deviceId: { fate: "cleared", why: ownScreen } },
  },
  daySummary: {
    holds: "The three rings for one day: breaks, practice minutes, outdoor minutes.",
    owner: { profile: ["profileId"] },
    copy: { part: "days" },
    erase: "rows",
  },
  carePlan: {
    holds: "What an eye doctor prescribed away from the screen, as a guardian typed it.",
    owner: { profile: ["profileId"] },
    copy: { part: "carePlans" },
    erase: "rows",
    links: { setBy: { fate: "cleared", why: sameHousehold } },
  },
  careLog: {
    holds: "The family's log of patch time, glasses wear, drops, outdoor time and breaks.",
    owner: { profile: ["profileId"] },
    copy: { part: "careLog" },
    erase: "rows",
    links: { confirmedBy: { fate: "cleared", why: sameHousehold } },
  },
  monitorSample: {
    holds: "One-minute numbers from the workday monitor.",
    owner: { profile: ["profileId"] },
    copy: { part: "monitorSamples" },
    erase: "rows",
  },
  streak: {
    holds: "Days in a row with practice, and lights left to give.",
    owner: { profile: ["profileId"] },
    copy: { part: "streaks" },
    erase: "rows",
  },

  /* ───────────── counsellor ───────────── */
  counsellorLink: {
    holds: "A link between a profile and a counsellor.",
    owner: { profile: ["profileId"] },
    copy: { part: "counsellorLinks" },
    erase: "rows",
    links: { counsellorId: { fate: "guarded", why: "A person who is, or has been, a counsellor to any family is never deleted with their own household. Only their seat in it is removed." } },
  },
  counsellorNote: {
    holds: "A note a linked counsellor wrote about the member.",
    owner: { parent: { table: "counsellorLink", column: "linkId" } },
    copy: { part: "counsellorNotes" },
    erase: "rows",
  },

  /* ───────────── what the family shared ───────────── */
  story: {
    holds: "A story a member shared in Together.",
    owner: { profile: ["profileId"] },
    copy: { part: "stories" },
    erase: "rows",
  },
  protocol: {
    holds: "An idea a member wrote down as steps.",
    owner: { profile: ["profileId"] },
    copy: { part: "ideas", hide: {
      embedding: "A list of numbers the search uses to find ideas that say something similar. It is worked out from the idea's own words, which are in the file.",
      embeddedAs: "A mark of which model made those numbers. It says nothing about the family.",
    } },
    erase: "rows",
    links: { storyId: { fate: "cleared", why: "An idea and the story it grew from belong to the same profile, so both are removed together." } },
  },
  experiment: {
    holds: "The experiment that tests one idea.",
    owner: { parent: { table: "protocol", column: "protocolId" } },
    copy: { part: "experiments" },
    erase: "rows",
  },
  experimentEnrolment: {
    holds: "A profile's place in an experiment, with the check-ups tied to it.",
    owner: { profile: ["profileId"] },
    copy: { part: "experimentPlaces" },
    erase: "rows",
    links: {
      experimentId: { fate: "falls", why: "When a family's idea is deleted its experiment goes too. Other families who joined lose their place in it and nothing else: their check-ups stay theirs." },
      baselineId: { fate: "cleared", why: "Points at the same profile's own check-up." },
      followupId: { fate: "cleared", why: "Points at the same profile's own check-up." },
    },
  },
  experimentSignal: {
    holds: "The pooled result of an experiment: group sizes and average change.",
    owner: { parent: { table: "experiment", column: "experimentId" } },
    copy: { leftOut: "Pooled numbers from several families. No single family's data is in them." },
    erase: "rows",
  },
  hazardRule: {
    holds: "Words that stop a harmful idea.",
    copy: { leftOut: "Staff settings. Nothing about a household." },
    erase: { untouched: "Staff settings. Nothing about a household." },
  },
  moderationItem: {
    holds: "A shared item waiting for a person to review it, and the decision.",
    owner: { ref: { kind: "kind", column: "refId", to: { story: "story", protocol: "protocol", note: "aheadNote", mail: "fusionMail", wish: "wish", wish_name: "wish" } } },
    copy: { part: "review" },
    erase: "rows",
    links: { reviewerId: { fate: "cleared", why: staffOnly } },
  },

  /* ───────────── leagues ───────────── */
  league: {
    holds: "A league: its name, programme and age band.",
    copy: { leftOut: "Shared by many families. The family's file names the league its teams play in." },
    erase: { untouched: "Shared by many families and named by staff." },
  },
  team: {
    holds: "A team in a league.",
    copy: { leftOut: "Shared by many families. The family's file names the teams its profiles are in." },
    erase: { untouched: "Shared by many families and named by staff." },
  },
  teamMember: {
    holds: "Which team a profile is in.",
    owner: { profile: ["profileId"] },
    copy: { part: "teams" },
    erase: "rows",
  },
  teamWeek: {
    holds: "A team's days finished in one week.",
    copy: { leftOut: "A count for a whole team. No single family's data is in it." },
    erase: { untouched: "A count for a whole team, with no name in it." },
  },
  teamMove: {
    holds: "Each time a profile joined, left or changed team.",
    owner: { profile: ["profileId"] },
    copy: { part: "teamMoves" },
    erase: "rows",
  },

  /* ───────────── community ───────────── */
  lightGift: {
    holds: "A light one member gave another, with its short note.",
    owner: { profile: ["fromProfileId", "toProfileId"] },
    copy: { part: "lights" },
    erase: "rows",
  },
  aheadNote: {
    holds: "A note a member left for families who reach a later week.",
    owner: { profile: ["profileId"] },
    copy: { part: "weekNotes" },
    erase: "rows",
  },
  fusionMail: {
    holds: "A short note from one person in the household to a profile in it.",
    owner: { profile: ["fromProfileId", "toProfileId"], person: ["fromUserId"] },
    copy: { part: "mail" },
    erase: "rows",
  },
  focusWall: {
    holds: "The month's shared picture.",
    copy: { leftOut: "Shared by everyone. The family's file names the wall each of its tiles is on." },
    erase: { untouched: "Shared by everyone." },
  },
  focusTile: {
    holds: "One tile of the shared picture, and the profile that sharpened it.",
    owner: { profile: ["profileId"] },
    copy: { part: "wallTiles" },
    erase: "unlink",
  },
  galleryUnlock: {
    holds: "A gallery picture a profile unlocked.",
    owner: { profile: ["profileId"] },
    copy: { part: "gallery" },
    erase: "rows",
  },
  glassesPair: {
    holds: "A pair of glasses that travels from family to family.",
    copy: { leftOut: "Shared by the families on its journey. The family's file gives the pair's code beside its own leg." },
    erase: { untouched: "Shared by the families on its journey." },
  },
  glassesLeg: {
    holds: "One family's time with a travelling pair: a first name, a city and a note.",
    owner: { profile: ["profileId"] },
    copy: { part: "glassesJourney" },
    erase: "rows",
  },
  hero: {
    holds: "The outline a child traced for Draw Your Hero.",
    owner: { profile: ["profileId"] },
    copy: { part: "heroes" },
    erase: "rows",
  },

  /* ───────────── the public site and staff ───────────── */
  blogPost: {
    holds: "A story on the blog.",
    copy: { leftOut: "Written by staff. Nothing about a household." },
    erase: { untouched: "Written by staff." },
    links: { editedBy: { fate: "cleared", why: staffOnly } },
  },
  blogRevision: {
    holds: "An earlier version of a blog story.",
    copy: { leftOut: "Written by staff. Nothing about a household." },
    erase: { untouched: "Written by staff." },
    links: { editedBy: { fate: "cleared", why: staffOnly } },
  },
  enquiry: {
    holds: "A message sent from the public site: name, organisation, email and message.",
    owner: { email: "email" },
    copy: { part: "enquiries" },
    erase: "rows",
    links: { handledBy: { fate: "cleared", why: staffOnly } },
  },
  aiCall: {
    holds: "The size and cost of each AI call.",
    copy: { leftOut: "Counts and costs only. A call a member started carries a scrambled mark that changes every day and cannot be turned back into a household, so no row can be tied to one." },
    erase: { untouched: "Counts and costs only. The scrambled mark on a row cannot be turned back into a household." },
  },
  setting: {
    holds: "Switches such as saver mode.",
    copy: { leftOut: "Staff settings. Nothing about a household." },
    erase: { untouched: "Staff settings. Nothing about a household." },
  },
  pushToken: {
    holds: "The address a phone gave so the app can send it a message.",
    owner: { account: ["accountId"] },
    copy: { part: "pushTokens" },
    erase: "rows",
  },
  dataRequest: {
    holds: "A request for a copy of the data or for deletion.",
    owner: { account: ["accountId"] },
    copy: { part: "dataRequests" },
    erase: "rows",
    links: {
      handledBy: { fate: "cleared", why: staffOnly },
      askedBy: { fate: "cleared", why: sameHousehold },
      profileId: { fate: "cleared", why: "After one profile is deleted the request stays as the family's record that it was done. It holds no name." },
    },
  },
  auditLog: {
    holds: "Who did what in the staff, counsellor and sponsor areas.",
    copy: { leftOut: "The staff record of staff, counsellor and sponsor actions. It is kept for accountability and is not the family's own data." },
    erase: "scrub",
    links: { userId: { fate: "cleared", why: "The line stays, with nobody named." } },
  },

  /* ───────────── sponsors ───────────── */
  sponsor: {
    holds: "An organisation that supports families.",
    copy: { leftOut: "About the organisation, not a household. The family's file names the sponsor of each group it joined." },
    erase: { untouched: "About the organisation, not a household." },
    links: { approvedBy: { fate: "cleared", why: staffOnly } },
  },
  sponsorUser: {
    holds: "A person who signs in for a sponsor.",
    copy: { leftOut: "A person's role at an organisation, not household data." },
    erase: { untouched: "A person's role at an organisation." },
    links: { userId: { fate: "guarded", why: "A person who signs in for a sponsor is never deleted with their own household. Only their seat in it is removed." } },
  },
  sponsorGroup: {
    holds: "A group a sponsor opened for families.",
    copy: { leftOut: "About the sponsor's group, not a household. The family's file names each group it joined." },
    erase: { untouched: "About the sponsor's group, not a household." },
  },
  sponsorGroupMember: {
    holds: "Which sponsor groups a household joined.",
    owner: { account: ["accountId"] },
    copy: { part: "sponsorGroups" },
    erase: "rows",
  },

  /* ───────────── package: people (Duet Streak, Discovery Board, Light the Map) ───────────── */
  duet: {
    holds: "A duet: two people of the household who keep one streak, and the day it started.",
    owner: { account: ["accountId"], profile: ["aProfileId", "bProfileId"], person: ["bUserId"] },
    copy: { part: "duets" },
    erase: "rows",
    links: { createdBy: { fate: "cleared", why: sameHousehold } },
  },
  discoveryRound: {
    holds: "A round of voting on the Discovery Board.",
    copy: { leftOut: "Opened by staff and shared by everyone. The family's file names the round each of its votes was given in." },
    erase: { untouched: "Opened by staff and shared by everyone." },
    links: { createdBy: { fate: "cleared", why: staffOnly } },
  },
  discoveryQuestion: {
    holds: "A question staff put on the Discovery Board, and its answer once there is one.",
    copy: { leftOut: "Written by staff and shared by everyone. The family's file gives the question each of its votes went to." },
    erase: { untouched: "Written by staff and shared by everyone. An answer holds pooled numbers and no household." },
    links: { createdBy: { fate: "cleared", why: staffOnly }, answeredBy: { fate: "cleared", why: staffOnly } },
  },
  discoveryVote: {
    holds: "The question a profile voted for in one round of the Discovery Board.",
    owner: { profile: ["profileId"] },
    copy: { part: "discoveryVotes" },
    erase: "rows",
  },
  mapPlace: {
    holds: "The household's place on the map: the first three digits of its PIN code, and a welcome line if it chose one.",
    owner: { account: ["accountId"] },
    copy: { part: "mapPlaces" },
    erase: "rows",
    links: { joinedBy: { fate: "cleared", why: sameHousehold } },
  },

  /* ───────────── package: gatherings (Cinema Club, Class Mission, Wish Jam) ───────────── */
  cinemaClub: {
    holds: "A public place where a volunteer hosts a weekly film hour: the place, the day and the time.",
    copy: { leftOut: "Listed by a sponsor or by staff. It names a public place and no household, and nobody who went there is recorded." },
    erase: { untouched: "A listing of a public place, made by a sponsor or by staff. Nothing in it is about a household." },
    links: { createdBy: { fate: "cleared", why: "Points at the person who listed the club for a sponsor or for staff. The listing stays, with nobody named." } },
  },
  classMission: {
    holds: "A class mission a guardian gave a child, and the day it was run.",
    owner: { profile: ["profileId"] },
    copy: { part: "classMissions" },
    erase: "rows",
    links: { givenBy: { fate: "cleared", why: sameHousehold } },
  },
  wish: {
    holds: "A child's wish for a game, written by a guardian, and the name the child gave the game.",
    owner: { account: ["accountId"], profile: ["profileId"] },
    copy: { part: "wishes" },
    erase: "rows",
    links: { createdBy: { fate: "cleared", why: sameHousehold } },
  },

  /* ───────────── package: rewards (First Depth Day, Keeper Graduation) ───────────── */
  depthDay: {
    holds: "The day a profile's Depth check-up first found depth, and when its scene was first played.",
    owner: { profile: ["profileId"] },
    copy: { part: "depthDays" },
    erase: "rows",
  },
  keeperWelcome: {
    holds: "The welcome line a household left for a new family when one of its profiles finished a course.",
    owner: { account: ["accountId"], profile: ["profileId"] },
    copy: { part: "keeperWelcomes" },
    erase: "rows",
    links: {
      enrolmentId: { fate: "falls", why: "A welcome is left for one finished course of the same profile, so it is already removed with that profile." },
      leftBy: { fate: "cleared", why: sameHousehold },
    },
  },
  keeperAsk: {
    holds: "A household's ask for a welcome from a family that finished the same programme, and the line it received.",
    owner: { account: ["accountId"], profile: ["profileId"] },
    copy: { part: "keeperAsks", hide: { welcomeId: "The id of a row that belongs to the family that left the welcome. The file gives the line that was received." } },
    erase: "rows",
    links: {
      enrolmentId: { fate: "falls", why: "An ask belongs to one course of the same profile, so it is already removed with that profile." },
      askedBy: { fate: "cleared", why: sameHousehold },
      welcomeId: { fate: "cleared", why: "The welcome was left by another household. When that household is deleted the pointer is emptied, and this family keeps the line it received." },
    },
  },

  /* ───────────── package: clips (the clip runner) ───────────── */
  clipRun: {
    holds: "Each clip a profile finished: its code, how it came out, and the answers or numbers it recorded on the way.",
    owner: { account: ["accountId"], profile: ["profileId"] },
    copy: { part: "clipRuns" },
    erase: "rows",
    links: { deviceId: { fate: "cleared", why: ownScreen } },
  },

  /* ───────────── package: signin (sign-in with Firebase Authentication) ───────────── */
  signinAsk: {
    holds: "A count of sign-in links asked for: a scrambled form of the address or network it came from, and the time.",
    copy: { leftOut: "Holds a scrambled key that cannot be turned back into an address, so no row can be tied to a household." },
    erase: { untouched: "Every row is removed a day after it is made. It holds a scrambled key, never an address." },
  },
  signinCode: {
    holds: "A six-digit sign-in code sent by email: a scrambled form of the address and of the code, when it ends, and how many wrong tries.",
    copy: { leftOut: "Holds scrambled keys that cannot be turned back into an address or a code, so no row can be tied to a household." },
    erase: { untouched: "Every row is removed a day after it is made. It holds scrambled keys, never an address." },
  },
  signinRemoval: {
    holds: "A sign-in account still to be removed from the sign-in service after its person was deleted: only its id there.",
    copy: { leftOut: "It exists only after a person has been deleted, so it belongs to no household that could ask for a copy." },
    erase: { untouched: "A deletion makes this row. It goes as soon as the sign-in service confirms that the account is removed." },
  },

  /* ───────────── package: ai (the assistant's side of the database) ───────────── */
  libraryVector: {
    holds: "Where each passage of the research library sits by meaning: the passage's key and a list of numbers.",
    copy: { leftOut: "Worked out from IOpener's own pages and published stories. Nothing about a household." },
    erase: { untouched: "Worked out from IOpener's own pages and published stories. Nothing about a household." },
  },
} satisfies { [K in TableName]: Rule<K> };

/** The same list, read by name. */
export const ruleFor = (name: TableName): Rule => (TABLES as unknown as Record<TableName, Rule>)[name];
export const TABLE_NAMES = Object.keys(TABLES) as TableName[];

/**
 * The order rows are removed in. A table comes before every table its `owner` reads: a note before its link,
 * a review item before the story it points at, everything before the profiles, the household last.
 * `people` (the grown-ups) are handled just before the household.
 */
export const ERASE_ORDER: readonly TableName[] = [
  "moderationItem", "counsellorNote", "counsellorLink",
  "experimentSignal", "experimentEnrolment", "experiment", "protocol", "story",
  "lightGift", "aheadNote", "fusionMail", "galleryUnlock", "glassesLeg", "hero", "teamMove", "teamMember",
  "duet", "discoveryVote", "mapPlace",
  "classMission", "wish",
  "keeperAsk", "keeperWelcome", "depthDay",
  "clipRun",
  "monitorSample", "careLog", "carePlan", "daySummary", "session", "enrolment", "streak",
  "testResult", "eyeProfile", "onboardingRun", "triage", "consent",
  "enquiry", "pushToken", "invite", "sponsorGroupMember", "dataRequest", "device",
  "profile", "account",
];

/** The table each part of the file is read from. */
export const tableOfPart = (part: PartKey): TableName =>
  TABLE_NAMES.find((n) => { const c = ruleFor(n).copy; return "part" in c && c.part === part; })!;
