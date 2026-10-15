/**
 * Reads and writes the status of each language. Server only.
 * One row of `setting` (key "languages") holds what staff chose; a language that is not in it is off.
 *
 * The statuses are needed for every request that asks for a language other than English, so they are kept in
 * memory for half a minute. A change by staff is seen at once on the server that took it, and within half a
 * minute on any other.
 */
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { cleanLangStatuses, type LangStatus, type LangStatusMap } from "./decide";
import { SOURCE, type Lang } from "./languages";

export const LANGUAGES_KEY = "languages";
const KEEP_MS = 30_000;

const g = globalThis as unknown as { __ioLangStatuses?: { at: number; map: LangStatusMap; loading?: Promise<LangStatusMap> } };

async function read(): Promise<LangStatusMap> {
  const [row] = await db.select({ value: schema.setting.value }).from(schema.setting).where(eq(schema.setting.key, LANGUAGES_KEY)).limit(1);
  return cleanLangStatuses(row?.value);
}

/**
 * The statuses, at most half a minute old. When the database cannot be read, every language counts as off:
 * the app then answers in English, which is always safe.
 */
export async function langStatuses(fresh = false): Promise<LangStatusMap> {
  const had = g.__ioLangStatuses, now = Date.now();
  if (had && !fresh && now - had.at < KEEP_MS) return had.map;
  if (had?.loading) return had.loading;
  const loading = read().then(
    (map) => { g.__ioLangStatuses = { at: Date.now(), map }; return map; },
    () => { g.__ioLangStatuses = { at: Date.now(), map: {} }; return {}; },
  );
  g.__ioLangStatuses = { at: had?.at ?? 0, map: had?.map ?? {}, loading };
  return loading;
}

/** Sets one language's status. English cannot be set: it is always on. */
export async function setLangStatus(lang: Lang, status: LangStatus): Promise<boolean> {
  if (lang === SOURCE) return false;
  const map = { ...(await read()) };
  if (status === "off") delete map[lang]; else map[lang] = status;
  const value = cleanLangStatuses(map);
  await db.insert(schema.setting).values({ key: LANGUAGES_KEY, value })
    .onConflictDoUpdate({ target: schema.setting.key, set: { value, updatedAt: new Date() } });
  g.__ioLangStatuses = { at: Date.now(), map: value };
  return true;
}
