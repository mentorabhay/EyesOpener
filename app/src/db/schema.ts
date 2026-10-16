// Eyes Opener: Eyes Opener database models (PostgreSQL, Drizzle).
/**
 * Eyes Opener database models (PostgreSQL, Drizzle).
 * Column names are written in camelCase here and stored in snake_case (see drizzle.config.ts and src/db/index.ts).
 *
 * Rules this schema enforces:
 * - A child is a profile inside a household. No child sign-in, no child email.
 * - People sign in as `appUser`. Roles (seat, staff, counsellor, sponsor) are read from the database on every request.
 * - Only numbers derived on the device are stored: no camera frames, no face landmarks, no photos.
 * - The games, exercises and clips catalogue lives in code (src/data); rows here point at it by slug.
 */
import {
  pgTable, pgEnum, text, integer, real, boolean, timestamp, date, jsonb, uuid, index, uniqueIndex, primaryKey, vector,
} from "drizzle-orm/pg-core";

const id = () => uuid().primaryKey().defaultRandom();
const now = () => timestamp({ withTimezone: true }).notNull().defaultNow();
const when = () => timestamp({ withTimezone: true });

/** A person's seat in a household. Guardians manage; cheer seats (circle) can only look and encourage. */
export const seat = pgEnum("seat", ["guardian", "co_guardian", "circle"]);
/** Staff rooms in the admin console. super_admin passes every gate. */
export const staffRole = pgEnum("staff_role", ["super_admin", "ops", "content"]);
export const sponsorKind = pgEnum("sponsor_kind", ["school", "clinic", "ngo", "community", "donor"]);
export const sponsorStatus = pgEnum("sponsor_status", ["pending", "approved", "suspended"]);
export const sponsorUserRole = pgEnum("sponsor_user_role", ["owner", "editor"]);
export const inviteStatus = pgEnum("invite_status", ["open", "accepted", "revoked"]);
export const profileKind = pgEnum("profile_kind", ["adult", "child"]);
export const eye = pgEnum("eye", ["left", "right"]);
export const deviceKind = pgEnum("device_kind", ["web", "phone", "tv"]);
export const sessionKind = pgEnum("session_kind", ["game", "exercise", "film", "test", "monitor", "outdoor"]);
export const ring = pgEnum("ring", ["rest", "train", "light"]);
export const ladderStep = pgEnum("ladder_step", ["story", "protocol", "experiment", "signal", "reviewed", "trialled"]);
export const pubStatus = pgEnum("pub_status", ["draft", "in_review", "published", "blocked", "archived"]);
export const enrolStatus = pgEnum("enrol_status", ["active", "paused", "finished"]);
export const linkStatus = pgEnum("link_status", ["pending", "active", "ended"]);
export const arm = pgEnum("arm", ["tried", "control"]);
export const modStatus = pgEnum("mod_status", ["open", "approved", "removed"]);
export const requestKind = pgEnum("request_kind", ["export", "delete"]);

/* ───────────── accounts, profiles, consent ───────────── */

/** A household: the family that shares profiles, devices and consent. People sign in as `appUser`. */
export const account = pgTable("account", {
  id: id(),
  displayName: text().notNull(),
  locale: text().notNull().default("en"),
  isDemo: boolean().notNull().default(false),
  /** Hash of the PIN a grown-up types to leave child mode. */
  exitPinHash: text(),
  /**
   * Set on a staff member's own test household: the id of that `appUser`. Such a household belongs to no family.
   * It lets staff open and try every game, exercise and film; it is left out of every household count.
   */
  previewFor: uuid().unique(),
  createdAt: now(),
});

/**
 * A person who signs in. Roles are separate and can combine:
 * - `seat` in a household (guardian, co-guardian, cheer seat), when `accountId` is set;
 * - `staffRole` for the admin console;
 * - `isCounsellor` for the counsellor portal, usable once `counsellorVerifiedAt` is set by ops;
 * - sponsor membership through `sponsorUser`.
 * Roles are read from this row on every request, never from a token.
 */
export const appUser = pgTable("app_user", {
  id: id(),
  firebaseUid: text().unique(),
  email: text().notNull().unique(),
  displayName: text().notNull(),
  accountId: uuid().references(() => account.id, { onDelete: "cascade" }),
  seat: seat(),
  staffRole: staffRole(),
  isCounsellor: boolean().notNull().default(false),
  counsellorVerifiedAt: when(),
  /** "Sign out on every device": a session that began before this moment no longer counts. Checked on every request. */
  sessionsValidAfter: when(),
  createdAt: now(),
}, (t) => [index().on(t.accountId)]);

/** A code a guardian shares so a co-guardian or a cheer seat can join the household. */
export const invite = pgTable("invite", {
  id: id(),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  seat: seat().notNull(),
  code: text().notNull().unique(),
  status: inviteStatus().notNull().default("open"),
  createdBy: uuid().notNull().references(() => appUser.id, { onDelete: "cascade" }),
  acceptedBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
});

export const profile = pgTable("profile", {
  id: id(),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  displayName: text().notNull(),
  kind: profileKind().notNull(),
  /** Year only. Enough for age bands and the under-4 rule; a full birth date is never stored. */
  birthYear: integer(),
  pinHash: text(),
  /** 0 everyone, 1 named condition, 2 counsellor-linked. */
  accessLevel: integer().notNull().default(0),
  createdAt: now(),
  archivedAt: when(),
  /** Which ink the weaker eye sees: "cyan" (the usual way) or "red" (the swap). Set by a guardian; engine/profile.ts. */
  weakInk: text().notNull().default("cyan"),
  /** When the choice was last changed; null while it has never been changed from the usual way. */
  weakInkAt: when(),
}, (t) => [index().on(t.accountId)]);

export const consent = pgTable("consent", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  /** The guardian who gave it. */
  userId: uuid().references(() => appUser.id, { onDelete: "set null" }),
  /** parental, camera, community */
  kind: text().notNull(),
  textVersion: text().notNull(),
  grantedAt: now(),
  revokedAt: when(),
}, (t) => [index().on(t.profileId, t.kind)]);

export const triage = pgTable("triage", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  answers: jsonb().notNull(),
  redFlag: boolean().notNull().default(false),
  /** proceed, see_doctor_first, counsellor_needed */
  outcome: text().notNull(),
  createdAt: now(),
});

/* ───────────── devices, onboarding, eye profile, tests ───────────── */

export const device = pgTable("device", {
  id: id(),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  kind: deviceKind().notNull(),
  label: text().notNull(),
  pxPerCm: real().notNull(),
  distanceCm: integer().notNull(),
  gamma: real().notNull().default(2.2),
  /** Share of each ink that leaks through the wrong lens, 0 to 1. */
  channelLeak: real().notNull().default(0),
  calibratedAt: now(),
  /* package "cal": the three colour measurements of this screen with the family's glasses (src/engine/calibrate.ts).
     Null means "not measured": the engine then uses the usual value and behaves as it did before these existed. */
  /** When `gamma` was measured on this screen. Null while `gamma` is the usual 2.2. */
  gammaAt: when(),
  /** Share of the cyan ink's light that the red lens lets through, next to the red ink at full through the same lens. */
  leakRedLens: real(),
  /** Share of the red ink's light that the cyan lens lets through, next to the cyan ink at full through the same lens. */
  leakCyanLens: real(),
  leakAt: when(),
  /** log10 of how much brighter the cyan ink looks through its lens than the red ink through its lens. */
  inkBalance: real(),
  inkBalanceAt: when(),
  /** What the matches were, so a value can be worked out again: { gamma, leak, ink, ppc }. See src/lib/screen-rules.ts. */
  colourRaw: jsonb().notNull().default({}),
  /* the inks tuned for these glasses (src/engine/tune.ts). Null means "not tuned": the usual inks are drawn. */
  /** Share of the green channel's light kept in the cyan ink, so less of it shows through the red lens. */
  cyanGreen: real(),
  /** Share of the blue channel's light kept in the cyan ink. `cyanGreenAt` is when the cyan mix (green or blue) last changed. */
  cyanBlue: real(),
  cyanGreenAt: when(),
  /** The most light the red ink may have in training, so its shadow through the cyan lens stays out of sight. */
  redTop: real(),
  redTopAt: when(),
}, (t) => [index().on(t.accountId)]);

export const onboardingRun = pgTable("onboarding_run", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  deviceId: uuid().references(() => device.id, { onDelete: "set null" }),
  /** { left: boolean[4], right: boolean[4] } — the four yes/no questions per eye. */
  answers: jsonb().notNull(),
  leftSeconds: integer(),
  rightSeconds: integer(),
  startedAt: now(),
  finishedAt: when(),
});

/** What the engine reads on every frame. One current row per profile and device. */
export const eyeProfile = pgTable("eye_profile", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  deviceId: uuid().references(() => device.id, { onDelete: "set null" }),
  weakEye: eye(),
  cyanEye: eye().notNull().default("left"),
  /** The ink the weaker eye sees in this eye profile: "cyan" or "red" (the profile's choice when it was derived). */
  weakInk: text().notNull().default("cyan"),
  /** Stronger-eye contrast, 0.05 to 1: of the red ink, or of the cyan ink when the weaker eye sees red. */
  strongContrast: real().notNull().default(1),
  /** log10 of red over cyan contrast at balance; null until the balance test is taken. */
  balanceLogRatio: real(),
  letterCm: real().notNull(),
  targetCm: real().notNull(),
  appTextPx: integer().notNull(),
  faintText: boolean().notNull().default(false),
  /** { ownGlasses, lazyBefore, eyeTurn, stop } from the onboarding questions. */
  flags: jsonb().notNull().default({}),
  /** onboarding, weekly_check, counsellor */
  source: text().notNull().default("onboarding"),
  isCurrent: boolean().notNull().default(true),
  createdAt: now(),
}, (t) => [index().on(t.profileId, t.isCurrent)]);

export const testResult = pgTable("test_result", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  deviceId: uuid().references(() => device.id, { onDelete: "set null" }),
  /** acuity, contrast, balance, stereo, fusion_break, fusion_recovery, near_point, suppression, symptoms */
  testKey: text().notNull(),
  eye: eye(),
  value: real().notNull(),
  /** logMAR, logCS, log_ratio, arcsec, prism_dioptre, cm, score */
  unit: text().notNull(),
  /** floor = at the screen's limit, worse = below the largest step shown */
  note: text(),
  raw: jsonb(),
  isBaseline: boolean().notNull().default(false),
  takenAt: now(),
}, (t) => [index().on(t.profileId, t.testKey, t.takenAt)]);

/* ───────────── programmes, sessions, the eye day ───────────── */

export const enrolment = pgTable("enrolment", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  /** Programme slug from src/data. */
  programme: text().notNull(),
  dailyMinutes: integer().notNull(),
  daysPerWeek: integer().notNull(),
  week: integer().notNull().default(1),
  status: enrolStatus().notNull().default("active"),
  /** Set when a counsellor approved the dose (level 2). Never set by AI. */
  approvedBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  startedAt: now(),
  endedAt: when(),
}, (t) => [index().on(t.profileId, t.status)]);

export const session = pgTable("session", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  deviceId: uuid().references(() => device.id, { onDelete: "set null" }),
  kind: sessionKind().notNull(),
  /** Game, exercise, film or test slug from src/data. */
  itemSlug: text().notNull(),
  ring: ring().notNull(),
  minutes: real().notNull().default(0),
  strongContrast: real(),
  score: integer(),
  /**
   * What the session measured, as plain numbers by key: a game's hits, misses and level, the furthest demand held,
   * or what an exercise asked the member to count or measure. Never a name, a picture or free text.
   */
  detail: jsonb().$type<Record<string, number>>(),
  /** done, daily_cap, stop_rule, left */
  endReason: text(),
  /** The symptom the member reported when the stop rule ended the session. */
  stopSymptom: text(),
  startedAt: now(),
  endedAt: when(),
}, (t) => [index().on(t.profileId, t.startedAt)]);

export const daySummary = pgTable("day_summary", {
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  day: date().notNull(),
  restBreaks: integer().notNull().default(0),
  restGoal: integer().notNull().default(6),
  trainMinutes: real().notNull().default(0),
  trainGoal: integer().notNull().default(0),
  lightMinutes: real().notNull().default(0),
  lightGoal: integer().notNull().default(90),
  screenMinutes: real().notNull().default(0),
}, (t) => [primaryKey({ columns: [t.profileId, t.day] })]);

/**
 * What an eye doctor prescribed away from the screen: patch hours, glasses wear, drop days.
 * A guardian types in what the doctor said. Eyes Opener never sets or changes it.
 */
export const carePlan = pgTable("care_plan", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  /** patch, glasses, drops */
  kind: text().notNull(),
  /** Hours a day for patch and glasses; 1 for a drop day. */
  perDay: real().notNull(),
  /** Days of the week it applies, 0 Sunday to 6 Saturday. Empty means every day. */
  days: jsonb().notNull().default([]),
  /** The guardian who entered it. */
  setBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  updatedAt: now(),
}, (t) => [uniqueIndex().on(t.profileId, t.kind)]);

/** The family's own log of care away from the screen. One row per entry; a day can have several. */
export const careLog = pgTable("care_log", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  day: date().notNull(),
  /** patch, glasses, drops, outdoor, blink, far. Also "goal": the weekly outdoor minutes a guardian picked for the family (in `minutes`). */
  kind: text().notNull(),
  /** The companion it was logged in. */
  itemSlug: text().notNull(),
  minutes: real().notNull().default(0),
  count: integer().notNull().default(0),
  /** Small extras a companion keeps, such as which bingo squares were found. Never a photo. */
  data: jsonb().notNull().default({}),
  /** The grown-up who confirmed it, when one did. */
  confirmedBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
}, (t) => [index().on(t.profileId, t.kind, t.day)]);

/** One-minute samples from the workday monitor. Numbers only; frames never leave the device. */
export const monitorSample = pgTable("monitor_sample", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  distanceCm: real(),
  blinksPerMin: real(),
  posture: real(),
  minutesSinceBreak: real(),
  takenAt: now(),
  /* package "monitor": see the block at the end of this file. Null on rows written before these existed. */
  /** Seconds of the minute with a face in view. A minute with too few is never stored. */
  faceSeconds: real(),
  /** Of `blinksPerMin`, the blinks in which the lids did not meet. A rough figure: see src/vision/blink.ts. */
  halfBlinksPerMin: real(),
  /** What fell due or came on show in this minute: break, close, blink, tilt. */
  prompt: text(),
}, (t) => [index().on(t.profileId, t.takenAt)]);

export const streak = pgTable("streak", {
  profileId: uuid().primaryKey().references(() => profile.id, { onDelete: "cascade" }),
  current: integer().notNull().default(0),
  longest: integer().notNull().default(0),
  lastDay: date(),
  /** Lights this member can give away. Lights are never bought or earned by extra minutes. */
  lights: integer().notNull().default(0),
});

/* ───────────── counsellor layer ───────────── */

export const counsellorLink = pgTable("counsellor_link", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  counsellorId: uuid().notNull().references(() => appUser.id, { onDelete: "cascade" }),
  status: linkStatus().notNull().default("pending"),
  createdAt: now(),
}, (t) => [uniqueIndex().on(t.profileId, t.counsellorId)]);

export const counsellorNote = pgTable("counsellor_note", {
  id: id(),
  linkId: uuid().notNull().references(() => counsellorLink.id, { onDelete: "cascade" }),
  body: text().notNull(),
  createdAt: now(),
});

/* ───────────── evidence engine ───────────── */

export const story = pgTable("story", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  body: text().notNull(),
  status: pubStatus().notNull().default("draft"),
  createdAt: now(),
});

export const protocol = pgTable("protocol", {
  id: id(),
  storyId: uuid().references(() => story.id, { onDelete: "set null" }),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  title: text().notNull(),
  forWhom: text().notNull(),
  doWhat: text().notNull(),
  howMuch: text().notNull(),
  weeks: integer().notNull(),
  /** The test key this idea should move. */
  moves: text().notNull(),
  step: ladderStep().notNull().default("protocol"),
  status: pubStatus().notNull().default("draft"),
  /** Result of the hazard screen: { blocked: string[], flagged: string[] }. */
  hazard: jsonb().notNull().default({}),
  createdAt: now(),
  publishedAt: when(),
  /* ai package (see the note at the end of this file) */
  /** Where this idea sits among the others by meaning: a list of numbers worked out from its own words. Set only while it is published. */
  embedding: vector({ dimensions: 768 }),
  /** Which model made `embedding`, and a short mark of the words it was made from, so a changed idea or model is done again. */
  embeddedAs: text(),
}, (t) => [index().on(t.status, t.step)]);

export const experiment = pgTable("experiment", {
  id: id(),
  protocolId: uuid().notNull().references(() => protocol.id, { onDelete: "cascade" }),
  /** open, closed */
  status: text().notNull().default("open"),
  opensAt: now(),
  closesAt: when(),
});

export const experimentEnrolment = pgTable("experiment_enrolment", {
  id: id(),
  experimentId: uuid().notNull().references(() => experiment.id, { onDelete: "cascade" }),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  arm: arm().notNull(),
  baselineId: uuid().references(() => testResult.id, { onDelete: "set null" }),
  followupId: uuid().references(() => testResult.id, { onDelete: "set null" }),
  joinedAt: now(),
  finishedAt: when(),
  /* experiments package (see the note at the end of this file) */
  /** When the "before" check-up was tied to the enrolment. The idea's weeks are counted from this day. */
  startedAt: when(),
  /** When the member left. Their check-ups are untied at once and never counted again. Leaving is final for this experiment. */
  leftAt: when(),
  /** The screen as it was measured at the "before" check-up. Null for a check-up done away from the screen. */
  basePxPerCm: real(),
  baseDistanceCm: integer(),
  /** The screen as it was measured at the "after" check-up. When it differs from the one before, the pair is not counted. */
  followPxPerCm: real(),
  followDistanceCm: integer(),
}, (t) => [uniqueIndex().on(t.experimentId, t.profileId)]);

export const experimentSignal = pgTable("experiment_signal", {
  id: id(),
  experimentId: uuid().notNull().references(() => experiment.id, { onDelete: "cascade" }),
  nTried: integer().notNull(),
  nControl: integer().notNull(),
  changeTried: real().notNull(),
  changeControl: real().notNull(),
  low: real().notNull(),
  high: real().notNull(),
  computedAt: now(),
  /* experiments package: how much the changes varied inside each group (sample standard deviation), so the range can be checked by hand */
  sdTried: real(),
  sdControl: real(),
});

export const hazardRule = pgTable("hazard_rule", {
  id: id(),
  pattern: text().notNull(),
  reason: text().notNull(),
  active: boolean().notNull().default(true),
});

export const moderationItem = pgTable("moderation_item", {
  id: id(),
  /** story, protocol, note, mail, picture */
  kind: text().notNull(),
  refId: uuid().notNull(),
  reason: text().notNull(),
  aiFlag: jsonb(),
  status: modStatus().notNull().default("open"),
  reviewerId: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
  decidedAt: when(),
}, (t) => [index().on(t.status)]);

/* ───────────── leagues ───────────── */

export const league = pgTable("league", {
  id: id(),
  name: text().notNull(),
  programme: text().notNull(),
  ageBand: text().notNull(),
  createdAt: now(),
});

export const team = pgTable("team", {
  id: id(),
  leagueId: uuid().notNull().references(() => league.id, { onDelete: "cascade" }),
  name: text().notNull(),
});

export const teamMember = pgTable("team_member", {
  teamId: uuid().notNull().references(() => team.id, { onDelete: "cascade" }),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  /** The Monday from which this member's days count for the team. Empty means every week. (package: league) */
  countsFrom: date(),
}, (t) => [primaryKey({ columns: [t.teamId, t.profileId] })]);

/** Ranked only by days the practice was finished. Scores and extra minutes are not stored here. */
export const teamWeek = pgTable("team_week", {
  teamId: uuid().notNull().references(() => team.id, { onDelete: "cascade" }),
  weekStart: date().notNull(),
  daysFinished: integer().notNull().default(0),
  daysPossible: integer().notNull().default(6),
  /** Set by the weekly job when the week is over and its numbers are final. Empty while the week runs. (package: league) */
  closedAt: when(),
}, (t) => [primaryKey({ columns: [t.teamId, t.weekStart] })]);

/* ───────────── community ideas ───────────── */

export const lightGift = pgTable("light_gift", {
  id: id(),
  fromProfileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  toProfileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  note: text(),
  forDay: date().notNull(),
  createdAt: now(),
});

export const aheadNote = pgTable("ahead_note", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  programme: text().notNull(),
  /** The week a reader must reach to see this note. */
  week: integer().notNull(),
  body: text().notNull(),
  signature: text().notNull(),
  status: pubStatus().notNull().default("in_review"),
  createdAt: now(),
}, (t) => [index().on(t.programme, t.week, t.status)]);

/** The text is stored once. Each reader's device draws it with that reader's eye profile. */
export const fusionMail = pgTable("fusion_mail", {
  id: id(),
  /** Set when a family member with a profile wrote it. */
  fromProfileId: uuid().references(() => profile.id, { onDelete: "cascade" }),
  /** The signed-in person who wrote it. A cheer seat has no profile, so this is how their notes are known. */
  fromUserId: uuid().references(() => appUser.id, { onDelete: "set null" }),
  toProfileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  fromName: text().notNull(),
  body: text().notNull(),
  createdAt: now(),
  openedAt: when(),
}, (t) => [index().on(t.toProfileId, t.createdAt)]);

export const focusWall = pgTable("focus_wall", {
  id: id(),
  /** YYYY-MM */
  month: text().notNull().unique(),
  title: text().notNull(),
  artist: text().notNull(),
  pictureUrl: text(),
  tiles: integer().notNull().default(32),
});

export const focusTile = pgTable("focus_tile", {
  wallId: uuid().notNull().references(() => focusWall.id, { onDelete: "cascade" }),
  idx: integer().notNull(),
  profileId: uuid().references(() => profile.id, { onDelete: "set null" }),
  createdAt: now(),
  /** The finished practice day that earned this tile (package "hero"). Null on tiles from before the rule. */
  day: date(),
}, (t) => [primaryKey({ columns: [t.wallId, t.idx] }), uniqueIndex("focus_tile_one_a_day").on(t.wallId, t.profileId, t.day)]);

export const galleryUnlock = pgTable("gallery_unlock", {
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  itemSlug: text().notNull(),
  unlockedAt: now(),
}, (t) => [primaryKey({ columns: [t.profileId, t.itemSlug] })]);

export const glassesPair = pgTable("glasses_pair", {
  id: id(),
  code: text().notNull().unique(),
  /** The sponsor who donated this pair, when there is one. */
  sponsorId: uuid().references(() => sponsor.id, { onDelete: "set null" }),
});

export const glassesLeg = pgTable("glasses_leg", {
  id: id(),
  pairId: uuid().notNull().references(() => glassesPair.id, { onDelete: "cascade" }),
  profileId: uuid().references(() => profile.id, { onDelete: "set null" }),
  displayName: text().notNull(),
  city: text().notNull(),
  /** wearing, finished, passed_on */
  status: text().notNull(),
  note: text(),
  startedAt: now(),
  finishedAt: when(),
});

/** Draw Your Hero: the outline traced on the device. The photograph itself is not stored. */
export const hero = pgTable("hero", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  sprite: jsonb().notNull(),
  isCurrent: boolean().notNull().default(true),
  createdAt: now(),
});

/* ───────────── blog ───────────── */

export const blogPost = pgTable("blog_post", {
  id: id(),
  slug: text().notNull().unique(),
  status: pubStatus().notNull().default("draft"),
  title: text().notNull(),
  dek: text().notNull().default(""),
  topic: text().notNull(),
  readingMin: integer().notNull().default(3),
  /** Typed blocks, validated on write. Each block may carry sources and a claim status. */
  blocks: jsonb().notNull().default([]),
  sources: jsonb().notNull().default([]),
  authorName: text().notNull(),
  /** Set when a draft came from Gemini. AI drafts never publish themselves. */
  modelMeta: jsonb(),
  /** Which drawn scene sits at the top of the story. A key from the story art set, never an uploaded photo of a person. */
  heroArt: text().notNull().default("two-eyes"),
  /** The staff member who last saved it. */
  editedBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
  updatedAt: now(),
  publishedAt: when(),
}, (t) => [index().on(t.status, t.publishedAt)]);

/** The story as it was before each save, so any save can be undone. */
export const blogRevision = pgTable("blog_revision", {
  id: id(),
  postId: uuid().notNull().references(() => blogPost.id, { onDelete: "cascade" }),
  title: text().notNull().default(""),
  blocks: jsonb().notNull(),
  editedBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
}, (t) => [index().on(t.postId, t.createdAt)]);

/** A message from the public site: a counsellor, school or sponsor who wants to take part. Adults only. */
export const enquiry = pgTable("enquiry", {
  id: id(),
  /** counsellor, sponsor, school, other */
  kind: text().notNull(),
  name: text().notNull(),
  organisation: text().notNull().default(""),
  email: text().notNull(),
  message: text().notNull().default(""),
  /** new, answered, closed */
  status: text().notNull().default("new"),
  handledBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
}, (t) => [index().on(t.status, t.createdAt)]);

/* ───────────── operations ───────────── */

/** Every Gemini call, for the monthly spend cap. */
export const aiCall = pgTable("ai_call", {
  id: id(),
  kind: text().notNull(),
  model: text().notNull(),
  inputTokens: integer().notNull(),
  outputTokens: integer().notNull(),
  costUsd: real().notNull(),
  createdAt: now(),
  /* ai package (see the note at the end of this file) */
  /**
   * Set on a call a member started: a scrambled mark of the household and the day, so a household's calls can be
   * counted against a daily limit. It cannot be turned back into a household, and it changes every day.
   */
  caller: text(),
}, (t) => [index().on(t.createdAt)]);

/** Switches such as saver mode. Mirrors Remote Config for the server. */
export const setting = pgTable("setting", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: now(),
});

export const pushToken = pgTable("push_token", {
  id: id(),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  token: text().notNull().unique(),
  platform: text().notNull(),
  createdAt: now(),
});

export const dataRequest = pgTable("data_request", {
  id: id(),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  kind: requestKind().notNull(),
  /** open, ready, done, cancelled. What each means for a copy and for a deletion: src/lib/data/requests.ts */
  status: text().notNull().default("open"),
  handledBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
  doneAt: when(),
  /* The columns below were added by the "data" package (the export and deletion jobs). See the note at the end of this file. */
  /** household, profile. A deletion of one profile leaves the rest of the household alone. */
  scope: text().notNull().default("household"),
  /** The one profile to delete, when `scope` is profile. Emptied when that profile is gone. */
  profileId: uuid().references(() => profile.id, { onDelete: "set null" }),
  /** The guardian who asked. */
  askedBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  /** A copy: when it became ready, the last moment it can be downloaded, and the latest download. */
  readyAt: when(),
  expiresAt: when(),
  downloadedAt: when(),
  /** A deletion: the end of the waiting time. The daily job deletes on the first run after this moment. */
  deleteAfter: when(),
  cancelledAt: when(),
});

/** Who did what in the staff, counsellor and sponsor areas. */
export const auditLog = pgTable("audit_log", {
  id: id(),
  userId: uuid().references(() => appUser.id, { onDelete: "set null" }),
  action: text().notNull(),
  target: text(),
  meta: jsonb(),
  createdAt: now(),
});

/* ───────────── sponsors ─────────────
 * An organisation that supports families: a school, an eye clinic, an NGO, a community group or a donor.
 * Sponsors see counts for their groups only. They never see a member's name, results or sessions. */

export const sponsor = pgTable("sponsor", {
  id: id(),
  name: text().notNull(),
  kind: sponsorKind().notNull(),
  city: text().notNull().default(""),
  about: text().notNull().default(""),
  status: sponsorStatus().notNull().default("pending"),
  approvedBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
  approvedAt: when(),
});

export const sponsorUser = pgTable("sponsor_user", {
  sponsorId: uuid().notNull().references(() => sponsor.id, { onDelete: "cascade" }),
  userId: uuid().notNull().references(() => appUser.id, { onDelete: "cascade" }),
  role: sponsorUserRole().notNull().default("owner"),
}, (t) => [primaryKey({ columns: [t.sponsorId, t.userId] })]);

/** A group a sponsor opens for families, joined with a code. */
export const sponsorGroup = pgTable("sponsor_group", {
  id: id(),
  sponsorId: uuid().notNull().references(() => sponsor.id, { onDelete: "cascade" }),
  name: text().notNull(),
  code: text().notNull().unique(),
  createdAt: now(),
  closedAt: when(),
});

export const sponsorGroupMember = pgTable("sponsor_group_member", {
  groupId: uuid().notNull().references(() => sponsorGroup.id, { onDelete: "cascade" }),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  joinedAt: now(),
}, (t) => [primaryKey({ columns: [t.groupId, t.accountId] })]);

/* ───────────── experiments (package "experiments") ─────────────
 * No new table. Nullable columns were added in place, because a column cannot be declared away from its table:
 *   experiment_enrolment: started_at, left_at, base_px_per_cm, base_distance_cm, follow_px_per_cm, follow_distance_cm
 *   experiment_signal:    sd_tried, sd_control
 * The same change as SQL: drizzle/pending/experiments.sql. The rules that use them: src/lib/experiments.ts. */

/* ───────────── package: league ─────────────
 * Also added above: `team_member.counts_from` and `team_week.closed_at`. */

/**
 * Each time a profile joined, left or changed team. It keeps two rules: a different team at most once a week,
 * and a member who leaves and joins again in the same week goes back to the team they left.
 * Only the household of the profile ever reads its own rows.
 */
export const teamMove = pgTable("team_move", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  /** join, leave, switch */
  kind: text().notNull(),
  fromTeamId: uuid().references(() => team.id, { onDelete: "set null" }),
  toTeamId: uuid().references(() => team.id, { onDelete: "set null" }),
  at: now(),
}, (t) => [index().on(t.profileId, t.at)]);

/* ───────────── package: data (the export and deletion jobs) ─────────────
 * No new table. Columns were added in place to `data_request`, because a column cannot be declared away from its table:
 *   scope, profile_id, asked_by, ready_at, expires_at, downloaded_at, delete_after, cancelled_at
 * The same change as SQL: drizzle/pending/data.sql. The rules that use them: src/lib/data/requests.ts.
 *
 * Adding a table, or a foreign key that points at a household, a profile or a person? Give it a line in
 * src/lib/data/tables.ts. That list decides what a family's copy holds and what a deletion removes, and
 * `npx vitest run src/lib/data` fails until every table and every such key has a decision. */

/* ───────────── package: cal (device calibration) ─────────────
 * No new table. Columns were added in place to `device`, because a column cannot be declared away from its table:
 *   gamma_at, leak_red_lens, leak_cyan_lens, leak_at, ink_balance, ink_balance_at, colour_raw
 * `device.gamma` and `device.channel_leak` already existed and are now written by the calibration
 * (`channel_leak` holds the larger of the two lens values). No foreign key was added.
 * The same change as SQL: drizzle/pending/cal.sql. The maths: src/engine/calibrate.ts. The rules: src/lib/screen-rules.ts. */

/* ───────────── package: people (four community ideas) ─────────────
 * Proof of Help needs no table: it is worked out from the ideas, the experiments and the pooled results above.
 * The same change as SQL: drizzle/pending/people.sql. Each table has its line in src/lib/data/tables.ts.
 * The rules: src/lib/duet.ts, src/lib/discovery.ts, src/lib/map.ts. */

/**
 * Duet Streak: two people of one household, of different generations, who keep one streak.
 * A guardian sets it up and ends it. Nothing about a day is stored here: whether each did their part is read from
 * the rows that already exist (the day's rings, finished sessions, the care log, notes sent).
 * A duet that a guardian ends is deleted; nothing is kept of it.
 */
export const duet = pgTable("duet", {
  id: id(),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  /** The first partner is always a profile of the household. */
  aProfileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  /** The second partner is another profile of the household ... */
  bProfileId: uuid().references(() => profile.id, { onDelete: "cascade" }),
  /** ... or a grown-up who signs in to the household and has no profile (a cheer seat, a co-guardian). Exactly one of the two is set. */
  bUserId: uuid().references(() => appUser.id, { onDelete: "cascade" }),
  /** The first day that counts, in India time. */
  startedOn: date().notNull(),
  /** The guardian who set it up. */
  createdBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
}, (t) => [index().on(t.accountId)]);

/** Discovery Board: one round of voting. Staff open it with a list of questions; it closes on a set day. */
export const discoveryRound = pgTable("discovery_round", {
  id: id(),
  /** What members see as the round's name, such as "October 2026". */
  title: text().notNull(),
  /** The last day a vote can be given or changed, in India time. */
  closesOn: date().notNull(),
  /** Set when the round was closed, by the daily job or by staff. Votes are final from then on. */
  closedAt: when(),
  createdBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
});

/** A question staff put on the board: something the pooled records could answer. Members never type one. */
export const discoveryQuestion = pgTable("discovery_question", {
  id: id(),
  roundId: uuid().notNull().references(() => discoveryRound.id, { onDelete: "cascade" }),
  question: text().notNull(),
  /** One or two plain sentences: why it is worth asking, and which records could answer it. */
  why: text().notNull(),
  position: integer().notNull().default(0),
  /** Set when staff took the question off the list. Votes for it are removed at the same moment. */
  withdrawnAt: when(),
  /** The answer, written by staff from the pooled records. Empty until there is one. */
  answer: text(),
  /** What the answer rests on, in words: which records, from when to when. */
  answerBasis: text(),
  /** How many members' records the answer rests on. Never fewer than the smallest group a pooled result may show. */
  answerMembers: integer(),
  answeredAt: when(),
  answeredBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  /** True for demo rows only: the answer is sample data, and the page says so. Staff cannot set it. */
  isSample: boolean().notNull().default(false),
  createdBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
}, (t) => [index().on(t.roundId)]);

/** One vote per profile per round. It can be changed until the round closes. */
export const discoveryVote = pgTable("discovery_vote", {
  roundId: uuid().notNull().references(() => discoveryRound.id, { onDelete: "cascade" }),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  questionId: uuid().notNull().references(() => discoveryQuestion.id, { onDelete: "cascade" }),
  votedAt: now(),
}, (t) => [primaryKey({ columns: [t.roundId, t.profileId] }), index().on(t.questionId)]);

/**
 * Light the Map: a household that a guardian has put on the map. One row per household; leaving deletes it.
 * Only a coarse area is kept: the first three digits of the PIN code, which cover a district or a large part of
 * a city. The full code is never asked for. An area is shown to anyone only once enough households are in it.
 */
export const mapPlace = pgTable("map_place", {
  accountId: uuid().primaryKey().references(() => account.id, { onDelete: "cascade" }),
  /** Three digits. */
  area: text().notNull(),
  /** The guardian who put the household on the map. */
  joinedBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  joinedAt: now(),
  /** A key from the fixed list of welcome lines (src/lib/map.ts). Only the first household of an area can set it. Never free text. */
  welcome: text(),
}, (t) => [index().on(t.area, t.joinedAt)]);

/* ───────────── package: hero (Draw Your Hero, and the picture on the Focus Wall) ─────────────
 * No new table. Added in place to `focus_tile`, because a column cannot be declared away from its table:
 *   day (date, nullable) and the unique index `focus_tile_one_a_day` on (wall_id, profile_id, day).
 * Together they keep one rule in the database itself: a profile earns at most one tile for one finished practice
 * day, however many minutes it trained and however often the tiles are counted. The rule: src/lib/wall-rules.ts.
 * `hero` is unchanged: `sprite` holds the grid that `cleanSprite` (src/games/hero.ts) passed, and nothing else.
 * A camera consent is a `consent` row of kind "camera"; that kind was already named in the column's comment.
 * The same change as SQL: drizzle/pending/hero.sql. */

/* ───────────── package: signin (sign-in with Firebase Authentication) ─────────────
 * Added in place to `app_user`, because a column cannot be declared away from its table:
 *   sessions_valid_after (timestamptz, nullable)
 * The same change as SQL: drizzle/pending/signin.sql. How sign-in works: docs/SIGN-IN.md. The rules: src/lib/signin/. */

/**
 * One row for each sign-in link asked for, and each try to finish one, so that neither can be done without limit.
 * The server scales to zero, so the count cannot live in memory. Rows are removed after a day.
 */
export const signinAsk = pgTable("signin_ask", {
  id: id(),
  /** email: links asked for one address. net: links asked from one network address. finish: tries to finish a link from one network address. */
  kind: text().notNull(),
  /** A keyed hash of the email address or of the network address. The table never holds either. */
  key: text().notNull(),
  at: now(),
}, (t) => [index().on(t.kind, t.key, t.at)]);

/**
 * A six-digit sign-in code sent by email (Ved, 10 October 2026: "email with OTP"). The table never holds the address
 * or the code: a keyed hash of each. A code works once, for ten minutes, and for five wrong tries at most. Every row is
 * removed a day after it is made (src/lib/signin/code.ts).
 */
export const signinCode = pgTable("signin_code", {
  id: id(),
  /** A keyed hash of the email address. */
  emailKey: text().notNull(),
  /** A keyed hash of the code, made with the address's key. */
  codeHash: text().notNull(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  tries: integer().notNull().default(0),
  usedAt: when(),
  createdAt: now(),
}, (t) => [index().on(t.emailKey, t.createdAt)]);

/**
 * Sign-in accounts that still have to be removed from Firebase Authentication after their person was deleted here.
 * It holds only the id the account has at Firebase. A row goes as soon as Firebase confirms the removal.
 */
export const signinRemoval = pgTable("signin_removal", {
  uid: text().primaryKey(),
  queuedAt: now(),
  tries: integer().notNull().default(0),
  lastTryAt: when(),
});

/* ───────────── package: monitor (the workday monitor) ─────────────
 * No new table. Nullable columns were added in place to `monitor_sample`, because a column cannot be declared away
 * from its table:
 *   face_seconds, half_blinks_per_min, prompt
 * How the existing columns are used: `taken_at` is the start of the clock minute the row measured (one row for a
 * profile and a minute); `blinks_per_min` counts full and half blinks together; `posture` is the share of the
 * minute's pictures with the head level and not leaning in (0 to 1); a null number was not measured in that minute.
 * A minute that was not measured has no row at all. Rows older than 35 days are removed by the daily job.
 * A run of the monitor is a `session` of kind "monitor" with the slug "workday-monitor" and the ring "rest"; a
 * break it saw is a `care_log` row of kind "far" under the same slug. Consent is a `consent` row of kind "camera".
 * No foreign key was added. The same change as SQL: drizzle/pending/monitor.sql.
 * The rules: src/lib/monitor-rules.ts. The database side: src/lib/monitor.ts. */

/* ───────────── package: gatherings (Lights On Hour, Cinema Club, Class Mission, Wish Jam) ─────────────
 * Lights On Hour needs no table: the hour is one row of `setting` (key "lights_on_hour"), and who is practising in
 * it is counted from the `session` rows that already exist. Nothing is written when a household takes part.
 * The same change as SQL: drizzle/pending/gatherings.sql. Each table has its line in src/lib/data/tables.ts.
 * The rules: src/lib/lights-on.ts, src/lib/cinema-club.ts, src/lib/class-mission.ts, src/lib/wish-jam.ts. */

/**
 * Cinema Club: a public place where a volunteer hosts a weekly film hour. A sponsor or staff lists it; a listing by
 * a sponsor waits for a person at Eyes Opener. Only the place and the time are kept: no host's name, no address of a
 * home, nobody who came. A club has no members in the app.
 */
export const cinemaClub = pgTable("cinema_club", {
  id: id(),
  /** The sponsor that listed it. Null when staff listed it. */
  sponsorId: uuid().references(() => sponsor.id, { onDelete: "cascade" }),
  /** school, library, community_hall, clinic. The list has no home in it (src/lib/cinema-club.ts). */
  placeKind: text().notNull(),
  /** The name people know the place by, with its town. Typed by a sponsor or staff; never a private home. */
  placeName: text().notNull(),
  /** 0 is Sunday, 6 is Saturday, in India time. */
  weekday: integer().notNull(),
  /** When the hour starts: minutes after midnight in India time, in steps of 15. */
  startMinute: integer().notNull(),
  /** in_review, listed, removed, closed */
  status: text().notNull().default("in_review"),
  /** True for demo rows only: the place is made up, and every page that shows it says so. */
  isSample: boolean().notNull().default(false),
  createdBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
  listedAt: when(),
  closedAt: when(),
}, (t) => [index().on(t.status)]);

/**
 * Class Mission: a guardian gave a child the mission, and later marked the day it was run.
 * Nothing about the class is kept: no school, no teacher, no classmate, no count and no note of how it went.
 * A mission a guardian takes back before it is run is deleted.
 */
export const classMission = pgTable("class_mission", {
  id: id(),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  /** The guardian who gave the child the mission. */
  givenBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  givenAt: now(),
  /** The day the mission was run, in India time, as a guardian marked it. Null until then. */
  doneOn: date(),
}, (t) => [index().on(t.profileId)]);

/**
 * Wish Jam: what one child wishes a game were about, written by a guardian from a guided form.
 * It is shown outside the household only after a person at Eyes Opener approved it, and only while the guardian's
 * consent for the child stands. It never holds a family name, a school, a city or a picture.
 */
export const wish = pgTable("wish", {
  id: id(),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  /** Six letters and digits shown on the public list, so a builder can say which wish they mean. Never the row's id. */
  code: text().notNull().unique(),
  /** What the child loves: a key from the fixed list (src/lib/wish-jam.ts). */
  loves: text().notNull(),
  /** What the child likes to do in a game: a key from the fixed list. */
  play: text().notNull(),
  /** The kind of game wished for, by the game kit's public families: a key from the fixed list. */
  game: text().notNull().default("any"),
  /** One short line in the guardian's words. It passes the hazard screen and waits for a person with the wish. */
  line: text().notNull().default(""),
  /** A guardian's choice: show the child's first name beside the wish. Off unless ticked. */
  showFirstName: boolean().notNull().default(false),
  /** in_review, listed, matched, built, blocked */
  status: text().notNull().default("in_review"),
  /** True for demo rows only: the wish is made up, and every page that shows it says so. */
  isSample: boolean().notNull().default(false),
  createdBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
  listedAt: when(),
  /** Set by staff when a builder has taken the wish on. */
  matchedAt: when(),
  /** Set by staff when the game exists. */
  builtAt: when(),
  /** The library game staff tied to the wish, once it was added to the library by the normal route. A slug from src/data. */
  gameSlug: text(),
  /** The name the child gave the game. Shown outside the household only once `nameStatus` is "approved". */
  gameName: text(),
  /** in_review, approved, blocked. Null until a name is offered. */
  nameStatus: text(),
  namedAt: when(),
}, (t) => [index().on(t.accountId), index().on(t.status)]);

/* ───────────── package: rewards (Locked Gallery, First Depth Day, Sunset Rule, Keeper Graduation) ─────────────
 * Locked Gallery keeps its rows in `gallery_unlock`, which was already there. Sunset Rule stores nothing: it is
 * worked out from the day's rows. The same change as SQL: drizzle/pending/rewards.sql. Each table has its line in
 * src/lib/data/tables.ts. The rules: src/lib/gallery.ts, src/lib/depth-day.ts, src/lib/sunset.ts, src/lib/graduation.ts. */

/**
 * First Depth Day: the day a Depth check-up first found depth, after at least one earlier check-up that did not.
 * One row for a profile, written once from its own check-up results and never rewritten. A profile whose very
 * first Depth check-up already found depth has no row: nothing was first, so there is no day to keep.
 */
export const depthDay = pgTable("depth_day", {
  profileId: uuid().primaryKey().references(() => profile.id, { onDelete: "cascade" }),
  /** The day of that check-up, in the member's own calendar. */
  day: date().notNull(),
  /** The depth step that check-up found, in arcseconds. */
  arcsec: real().notNull(),
  /** When the scene was first played by someone who may train. Empty until then: the Today page points at it. */
  playedAt: when(),
  createdAt: now(),
});

/**
 * Keeper Graduation: the welcome a household left behind when one of its profiles finished a course.
 * It is a key from a fixed list of lines (src/lib/graduation.ts); nobody types a welcome. One welcome for one
 * finished course. Nothing in this row says which family received it: only that it was given, and the fixed
 * thank-you line that family sent back, if it sent one.
 */
export const keeperWelcome = pgTable("keeper_welcome", {
  id: id(),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  enrolmentId: uuid().notNull().unique().references(() => enrolment.id, { onDelete: "cascade" }),
  /** Programme slug from src/data: a welcome goes to a family on the same programme. */
  programme: text().notNull(),
  line: text().notNull(),
  leftBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
  givenAt: when(),
  thanks: text(),
  thanksAt: when(),
}, (t) => [index().on(t.programme, t.givenAt), index().on(t.accountId)]);

/**
 * Keeper Graduation, the other side: a family on a course that asked for a welcome. One ask for one course.
 * When a welcome is given, its line is copied here, so this family keeps what it received even if the keeper's
 * household is later deleted. Nothing in this row says which family left the welcome.
 */
export const keeperAsk = pgTable("keeper_ask", {
  id: id(),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  enrolmentId: uuid().notNull().unique().references(() => enrolment.id, { onDelete: "cascade" }),
  programme: text().notNull(),
  askedBy: uuid().references(() => appUser.id, { onDelete: "set null" }),
  createdAt: now(),
  /** The welcome that was given. Emptied when the keeper's household is deleted; `line` stays. */
  welcomeId: uuid().references(() => keeperWelcome.id, { onDelete: "set null" }),
  line: text(),
  receivedAt: when(),
  thanks: text(),
  thanksAt: when(),
}, (t) => [index().on(t.programme, t.receivedAt), index().on(t.accountId)]);

/* ───────────── package: clips (the clip runner) ─────────────
 * The 100 calibration and measurement clips are played from src/data/clips. What a clip measures about an eye is a
 * row of `test_result`, under the check-up's own key where it is the same measurement and under a key of its own
 * otherwise (the keys and units: src/data/clips/keys.ts). What a clip sets on the screen is a column of `device`.
 * This table is the record that a clip was finished: it lets a set go on where it stopped, shows when a clip was
 * last done, and holds how a "look and answer" check of the screen came out, which is about a screen and not about
 * an eye. Numbers and short words only: never a picture. The same change as SQL: drizzle/pending/clips.sql.
 * The rules: src/lib/clip-rules.ts. The database side: src/lib/clips.ts. */
export const clipRun = pgTable("clip_run", {
  id: id(),
  accountId: uuid().notNull().references(() => account.id, { onDelete: "cascade" }),
  /** The profile that was active when the clip was run. */
  profileId: uuid().notNull().references(() => profile.id, { onDelete: "cascade" }),
  /** The household's screen it was run on. Empty for a clip done away from the screen. */
  deviceId: uuid().references(() => device.id, { onDelete: "set null" }),
  /** The catalogue code: C01 to C30, M01 to M70. */
  code: text().notNull(),
  /** saved (a result or a screen value was stored), pass, note, fail, na */
  outcome: text().notNull(),
  /** The first number the clip stored, with its unit, for a list. Empty for a check with no number. */
  value: real(),
  unit: text(),
  /** What the clip recorded on the way: answers by number, matches, seconds. Plain numbers and short words. */
  detail: jsonb(),
  /** The set it was played in: screen, weekly, visit. Empty when it was run on its own. */
  setKey: text(),
  takenAt: now(),
}, (t) => [index().on(t.profileId, t.code, t.takenAt), index().on(t.accountId, t.code, t.takenAt)]);

/* ───────────── package: ai (the assistant's side of the database) ─────────────
 * The public edition has no assistant: nothing writes these columns or this table in it (src/lib/assist/extra.ts).
 * An edition with an assistant keeps here what its search by meaning needs. A vector is a list of 768 numbers that
 * says where a text sits among the others by meaning; it is worked out from words the database already holds.
 *  - `protocol.embedding`, `protocol.embeddedAs`: the vector of a published idea, for "similar ideas".
 *  - `library_vector`: the vector of each passage of the research library (src/lib/library.ts), by the passage's key.
 *  - `ai_call.caller`: a scrambled mark of a household and a day, for the daily limit on calls a member starts.
 * The vectors need the PostgreSQL extension "vector" (pgvector): the migration must create it first.
 * The same change as SQL: drizzle/pending/ai.sql. */

/** Where each passage of the research library sits by meaning. Holds no words: a key, a mark and the numbers. */
export const libraryVector = pgTable("library_vector", {
  /** The passage's key: "exercise:<slug>", "game:<slug>", "trial:<name>", "method:<key>", "label:<key>", and keys an edition adds. */
  key: text().primaryKey(),
  /** Which model made the vector, and a short mark of the words it was made from, so a changed passage or model is done again. */
  madeFrom: text().notNull(),
  embedding: vector({ dimensions: 768 }).notNull(),
  updatedAt: now(),
});
