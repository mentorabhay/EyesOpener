/**
 * The public site: what its pages read from the catalogue, and the rules for the enquiry form.
 *
 * The first half is pure (tested in site.test.ts): every count a public page shows is worked out here from
 * `@/data` and `@/engine`, so no page types a number in. The second half reads and writes the `enquiry` table.
 *
 * The public site never calls `requireMember`. It shows nothing about any household.
 */
import { and, asc, desc, eq, gte, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import {
  catalogue, exercises, games, gameLevel, mechanismOf, programmes, tests,
  type EvidenceKey, type Exercise, type Game, type Mechanism, type Programme, type TestDef,
} from "@/data";

/* ════════════════════════ pure rules ════════════════════════ */

/* ───────────── where the site lives ───────────── */

/** The public address of the site, with no slash at the end. Set SITE_URL in production. */
export const siteUrl = (env: string | undefined = process.env.SITE_URL) => (env?.trim() || "http://localhost:3111").replace(/\/+$/, "");

/** Every public page, for the sitemap, the navigation and the footer. The landing page and the stories belong to other folders. */
export const SITE_PAGES = [
  "/", "/how-it-works", "/programmes", "/evidence", "/library", "/safety", "/stories",
  "/for-counsellors", "/for-sponsors", "/about", "/privacy", "/childrens-data", "/terms",
  "/wish-jam", "/try", "/register",
] as const;
export type SitePath = (typeof SITE_PAGES)[number];

/** Areas a search engine must stay out of: the member app, the three portals and sign-in. */
export const PRIVATE_PATHS = [
  "/admin", "/counsellor", "/sponsor", "/login", "/join", "/today", "/train", "/test", "/together", "/family",
  "/settings", "/setup", "/onboarding", "/circle", "/leave-child-mode",
  /* the addresses that set a browser's language and carry its words: nothing for a search engine to read */
  "/lang",
] as const;

/** Title, description, canonical address and Open Graph for one public page. The root layout adds the site name to the title. */
export function pageMeta(path: string, m: { title: string; description: string }, name = "Eyes Opener") {
  return {
    title: m.title,
    description: m.description,
    alternates: { canonical: path },
    openGraph: { title: `${m.title} · ${name}`, description: m.description, url: path, siteName: name, type: "website" as const, locale: "en_IN" },
    twitter: { card: "summary" as const, title: `${m.title} · ${name}`, description: m.description },
  };
}

/* ───────────── evidence ───────────── */

export const EVIDENCE_KEYS: EvidenceKey[] = catalogue.evidence.map((e) => e.key);
export const isEvidenceKey = (v: string | undefined): v is EvidenceKey => !!v && (EVIDENCE_KEYS as string[]).includes(v);
export const evidenceOfItem = (item: { mechanism: string }): EvidenceKey => mechanismOf(item.mechanism).evidence;

export interface EvidenceCount { key: EvidenceKey; games: number; exercises: number; total: number }

/** How many games and exercises carry each evidence label, in the order the catalogue lists the labels. */
export function evidenceCounts(g: readonly Game[] = games, e: readonly Exercise[] = exercises): EvidenceCount[] {
  return EVIDENCE_KEYS.map((key) => {
    const gn = g.filter((x) => evidenceOfItem(x) === key).length, en = e.filter((x) => evidenceOfItem(x) === key).length;
    return { key, games: gn, exercises: en, total: gn + en };
  });
}

export interface MechanismUse extends Mechanism { games: number; exercises: number }

/** Every mechanism with the number of games and exercises built on it, strongest evidence first. */
export function mechanismUse(): MechanismUse[] {
  return catalogue.mechanisms
    .map((m) => ({ ...m, games: games.filter((g) => g.mechanism === m.key).length, exercises: exercises.filter((x) => x.mechanism === m.key).length }))
    .sort((a, b) => EVIDENCE_KEYS.indexOf(a.evidence) - EVIDENCE_KEYS.indexOf(b.evidence));
}

/* ───────────── programmes ───────────── */

export const gamesIn = (p: Programme): Game[] => games.filter((g) => g.tags.includes(p.tag));
export const exercisesIn = (p: Programme): Exercise[] => (p.group ? exercises.filter((e) => e.group === p.group) : []);

/**
 * The check-ups that track each programme. The catalogue does not hold this, so the site states it here,
 * following the measures each condition is followed by in the evidence framework.
 */
const TRACKED_BY: Record<string, readonly string[]> = {
  "eye-fitness": ["acuity", "contrast", "symptoms"],
  "screen-strain": ["symptoms", "near_point", "acuity"],
  "child-myopia": ["acuity"],
  "lazy-eye": ["acuity", "contrast", "balance", "suppression", "stereo"],
  convergence: ["near_point", "fusion_break", "fusion_recovery", "symptoms"],
  depth: ["stereo", "suppression", "balance"],
  squint: ["suppression", "fusion_break", "fusion_recovery", "stereo"],
  "after-concussion": ["near_point", "fusion_break", "fusion_recovery", "symptoms"],
  "after-stroke": ["acuity", "contrast", "symptoms"],
};
export const testsFor = (p: Programme): TestDef[] => (TRACKED_BY[p.slug] ?? []).map((k) => tests.find((t) => t.key === k)).filter((t): t is TestDef => !!t);

/** Who a game or exercise is for, without the access-level code the catalogue adds at the end ("· level 1"). The level is shown in words instead. */
export const forWhom = (item: { for: string }): string => item.for.replace(/\s*·\s*level \d.*$/, "");

/** The evidence labels found in a programme, strongest first, each once. */
export function evidenceIn(p: Programme): EvidenceKey[] {
  const found = new Set([...gamesIn(p), ...exercisesIn(p)].map(evidenceOfItem));
  return EVIDENCE_KEYS.filter((k) => found.has(k));
}

/** Exercise groups that no programme owns (focus drills, monitoring). They still show in the library. */
export const looseGroups = (): string[] => [...new Set(exercises.map((e) => e.group))].filter((g) => !programmes.some((p) => p.group === g));

/* ───────────── the library filter ───────────── */

export const LIBRARY_KINDS = ["all", "games", "exercises"] as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[number];

export interface LibraryFilter { tag: string; evidence: EvidenceKey | "all"; kind: LibraryKind }

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Reads the filter from the address. Anything unknown falls back to "show everything". */
export function readLibraryFilter(sp: Record<string, string | string[] | undefined>): LibraryFilter {
  const tag = one(sp.tag), evidence = one(sp.evidence), kind = one(sp.kind);
  return {
    tag: catalogue.gameTags.some((t) => t.key === tag) ? tag! : "any",
    evidence: isEvidenceKey(evidence) ? evidence : "all",
    kind: (LIBRARY_KINDS as readonly string[]).includes(kind ?? "") ? (kind as LibraryKind) : "all",
  };
}

/** The address of the library with this filter. Defaults are left out, so the plain address shows everything. */
export function libraryHref(f: LibraryFilter): string {
  const q = new URLSearchParams();
  if (f.tag !== "any") q.set("tag", f.tag);
  if (f.evidence !== "all") q.set("evidence", f.evidence);
  if (f.kind !== "all") q.set("kind", f.kind);
  const s = q.toString();
  return s ? `/library?${s}` : "/library";
}

/** Exercises carry a group, not a tag. A tag reaches the group of the programme that uses that tag. */
export const groupForTag = (tag: string): string | null => programmes.find((p) => p.tag === tag)?.group ?? null;

export function filterLibrary(f: LibraryFilter): { games: Game[]; exercises: Exercise[] } {
  const byEvidence = (x: { mechanism: string }) => f.evidence === "all" || evidenceOfItem(x) === f.evidence;
  const group = groupForTag(f.tag);
  return {
    games: f.kind === "exercises" ? [] : games.filter((g) => (f.tag === "any" || g.tags.includes(f.tag)) && byEvidence(g)),
    exercises: f.kind === "games" ? [] : exercises.filter((e) => (f.tag === "any" || e.group === group) && byEvidence(e)),
  };
}

/** Games and exercises at each access level. Exercises carry no level of their own, so they follow their programme. */
export function levelCounts(): { level: 0 | 1 | 2; games: number; programmes: number }[] {
  return ([0, 1, 2] as const).map((level) => ({
    level, games: games.filter((g) => gameLevel(g) === level).length, programmes: programmes.filter((p) => p.level === level).length,
  }));
}

/* ───────────── enquiries ───────────── */

/** "wish_jam" is a developer or a student who wants to build a game for a wish (the public page /wish-jam). */
export const ENQUIRY_KINDS = ["counsellor", "sponsor", "school", "wish_jam", "other"] as const;
export type EnquiryKind = (typeof ENQUIRY_KINDS)[number];
export const ENQUIRY_STATUSES = ["new", "answered", "closed"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

/** One email address may write this many times in a day. */
export const ENQUIRY_DAILY_LIMIT = 3;
export const ENQUIRY_WINDOW_MS = 86_400_000;
/** The form is for adults. A person ticks a box to say they are at least this old. */
export const ENQUIRY_MIN_AGE = 18;
export const ENQUIRY_MAX = { name: 80, organisation: 120, email: 200, message: 2000 } as const;
/** The hidden field a person never sees. A robot fills it in, and the form then stores nothing. */
export const HONEYPOT_FIELD = "website";

const text = (max: number) => z.string().trim().max(max);

export const EnquiryInput = z.object({
  name: text(ENQUIRY_MAX.name).min(1),
  organisation: text(ENQUIRY_MAX.organisation).default(""),
  email: z.string().trim().toLowerCase().max(ENQUIRY_MAX.email).pipe(z.email()),
  kind: z.enum(ENQUIRY_KINDS),
  message: text(ENQUIRY_MAX.message).min(1),
  /** The box "I am 18 or older". The form is for adults only. */
  adult: z.literal("on"),
});
export type Enquiry = z.infer<typeof EnquiryInput>;
export type EnquiryField = keyof Enquiry;

export type EnquiryRead =
  | { ok: true; robot: false; data: Enquiry }
  | { ok: true; robot: true }
  | { ok: false; fields: EnquiryField[] };

/** Reads the posted form. A filled honeypot is answered as a success and carries no data. */
export function readEnquiry(form: Record<string, unknown>): EnquiryRead {
  if (typeof form[HONEYPOT_FIELD] === "string" && form[HONEYPOT_FIELD].trim() !== "") return { ok: true, robot: true };
  const parsed = EnquiryInput.safeParse(form);
  if (parsed.success) return { ok: true, robot: false, data: parsed.data };
  const fields = [...new Set(parsed.error.issues.map((i) => String(i.path[0]) as EnquiryField))];
  return { ok: false, fields };
}

/** True when this address has already written as often as one day allows. */
export const overEnquiryLimit = (sentInWindow: number) => sentInWindow >= ENQUIRY_DAILY_LIMIT;

/** What staff may do next with an enquiry. A closed one stays closed. */
export const nextEnquiryStatuses = (status: string): EnquiryStatus[] =>
  status === "new" ? ["answered", "closed"] : status === "answered" ? ["closed"] : [];

/* ════════════════════════ reads and writes ════════════════════════ */

const E = schema.enquiry;

export type EnquirySave = "saved" | "limit";

/** Stores an enquiry unless this address has reached the day's limit. The count and the insert share one transaction. */
export async function saveEnquiry(e: Enquiry, now = new Date()): Promise<EnquirySave> {
  return db.transaction(async (tx) => {
    /* One address at a time, so two posts sent together cannot both slip under the limit. */
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"enquiry:" + e.email}))`);
    const [{ n }] = await tx.select({ n: sql<number>`count(*)::int` }).from(E)
      .where(and(eq(E.email, e.email), gte(E.createdAt, new Date(now.getTime() - ENQUIRY_WINDOW_MS))));
    if (overEnquiryLimit(n)) return "limit";
    await tx.insert(E).values({ kind: e.kind, name: e.name, organisation: e.organisation, email: e.email, message: e.message });
    return "saved";
  });
}

const enquiryRows = () => db.select({
  id: E.id, kind: E.kind, name: E.name, organisation: E.organisation, email: E.email, message: E.message,
  status: E.status, createdAt: E.createdAt, handler: schema.appUser.displayName,
}).from(E).leftJoin(schema.appUser, eq(schema.appUser.id, E.handledBy));

/** The staff room's list: what waits for an answer, oldest first, then what was handled, newest first. */
export async function enquiries() {
  const [open, handled] = await Promise.all([
    enquiryRows().where(eq(E.status, "new")).orderBy(asc(E.createdAt)).limit(200),
    enquiryRows().where(inArray(E.status, ["answered", "closed"])).orderBy(desc(E.createdAt)).limit(100),
  ]);
  return { open, handled };
}

/** Moves an enquiry on. Null when it is not in a state that allows the move. */
export async function setEnquiryStatus(id: string, to: Exclude<EnquiryStatus, "new">, staffId: string) {
  const from: EnquiryStatus[] = to === "answered" ? ["new"] : ["new", "answered"];
  const [row] = await db.update(E).set({ status: to, handledBy: staffId }).where(and(eq(E.id, id), inArray(E.status, from))).returning();
  return row ?? null;
}
