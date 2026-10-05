/**
 * Demo rows for the clip runner: a few finished clips for Aarav on the demo family's laptop, so the clip pages show
 * a history. Run it after the main seed; it is safe to run again.
 *   npx tsx scripts/seed/clips.ts
 * Every row here is sample data for development, and is marked `sample` in what it keeps.
 *
 * What it does:
 * - Each sample is put through the clips' own rules (`resolveClip`), so a row has exactly the shape a real run has.
 * - Two screen checks answered twelve days ago, and six measurements taken twelve and five days ago: crowded
 *   letters for each eye, the one-minute hold, reading speed and the screen strain survey.
 * - Only results under the clips' own keys are written. Nothing here is a check-up result, so no eye setting, no
 *   check-up history and nothing about the screen changes.
 */
import "../env";
import { and, eq, sql } from "drizzle-orm";
import { passages } from "../../src/copy/drills-tools";
import { clipDef, clipTest, isCalibration } from "../../src/data/clips";
import { db, schema as s } from "../../src/db";
import { wordsOf } from "../../src/drills/tools/helpers";
import { resolveClip } from "../../src/lib/clip-rules";

const DAY = 86_400_000;
const words = wordsOf(passages[0]).length;

/** One finished clip: its code, how many days ago, and what the browser would have sent. */
const SAMPLES: { code: string; daysAgo: number; data: unknown }[] = [
  { code: "C17", daysAgo: 12, data: { answers: [0, 0] } },
  { code: "C28", daysAgo: 12, data: { dpr: 1 } },
  { code: "M08", daysAgo: 12, data: { value: 0.1, note: "" } },
  { code: "M09", daysAgo: 12, data: { value: 0.7, note: "" } },
  { code: "M49", daysAgo: 12, data: { held: 22, demand: 9 } },
  { code: "M63", daysAgo: 12, data: { words, seconds: Math.round((words / 92) * 60) } },
  { code: "M65", daysAgo: 12, data: { answers: [2, 1, 1, 2, 1, 0, 1, 2, 1, 1] } },
  { code: "M08", daysAgo: 5, data: { value: 0.1, note: "" } },
  { code: "M09", daysAgo: 5, data: { value: 0.6, note: "" } },
  { code: "M49", daysAgo: 5, data: { held: 41, demand: 9 } },
  { code: "M63", daysAgo: 5, data: { words, seconds: Math.round((words / 101) * 60) } },
];

export async function seedClips() {
  const [aarav] = await db.select({ id: s.profile.id, accountId: s.profile.accountId }).from(s.profile)
    .innerJoin(s.account, eq(s.account.id, s.profile.accountId)).where(and(eq(s.account.isDemo, true), eq(s.profile.displayName, "Aarav"))).limit(1);
  if (!aarav) { console.log("Clips: the demo family is not there. Run the main seed first."); return; }
  const [device] = await db.select().from(s.device).where(and(eq(s.device.accountId, aarav.accountId), eq(s.device.kind, "web"))).limit(1);
  if (!device) { console.log("Clips: the demo family has no web screen. Run the main seed first."); return; }
  const [eye] = await db.select({ cyanEye: s.eyeProfile.cyanEye }).from(s.eyeProfile).where(and(eq(s.eyeProfile.profileId, aarav.id), eq(s.eyeProfile.isCurrent, true))).limit(1);

  const [have] = await db.select({ n: sql<number>`count(*)::int` }).from(s.clipRun)
    .where(and(eq(s.clipRun.profileId, aarav.id), sql`${s.clipRun.detail}->>'sample' = 'true'`));
  if (have.n > 0) { console.log(`Clips: ${have.n} sample runs are already there. Nothing added.`); return; }

  const ctx = { screen: { ppc: device.pxPerCm, dist: device.distanceCm, gamma: device.gamma }, cyanEye: eye?.cyanEye === "right" ? ("R" as const) : ("L" as const), lensMatches: {} };
  const earlier = await db.selectDistinct({ testKey: s.testResult.testKey, eye: s.testResult.eye }).from(s.testResult).where(eq(s.testResult.profileId, aarav.id));
  const seen = new Set(earlier.map((r) => `${r.testKey} ${r.eye}`));
  const now = Date.now();
  let runs = 0, results = 0;

  for (const [i, sample] of SAMPLES.entries()) {
    const def = clipDef(sample.code);
    if (!def?.offered) throw new Error(`Clips: ${sample.code} is not an offered clip.`);
    const got = resolveClip(def, sample.data, ctx);
    if (!got.ok) throw new Error(`Clips: the sample for ${sample.code} was refused (${got.why}).`);
    /* only the clips' own keys: a sample must never become a check-up result or change the screen */
    if (got.step || got.screen || got.rows.some((r) => clipTest(r.testKey)?.checkup !== false)) throw new Error(`Clips: the sample for ${sample.code} would change more than its own rows.`);
    const takenAt = new Date(now - sample.daysAgo * DAY + i * 90_000);
    /* as a real run: a result belongs to the screen when the clip is drawn on it, and a screen check always does */
    const deviceId = def.screen ? device.id : null, runDeviceId = def.screen || isCalibration(def.code) ? device.id : null;
    const side = (e: "L" | "R" | null) => (e === null ? null : e === "L" ? ("left" as const) : ("right" as const));
    if (got.rows.length) {
      await db.insert(s.testResult).values(got.rows.map((r) => {
        const key = `${r.testKey} ${side(r.eye)}`, first = !seen.has(key);
        seen.add(key);
        return { profileId: aarav.id, deviceId, testKey: r.testKey, eye: side(r.eye), value: r.value, unit: clipTest(r.testKey)!.unit, note: r.note || null, raw: { ...r.raw, sample: true }, isBaseline: first, takenAt };
      }));
      results += got.rows.length;
    }
    const top = got.rows[0];
    await db.insert(s.clipRun).values({
      accountId: aarav.accountId, profileId: aarav.id, deviceId: runDeviceId, code: def.code, outcome: got.outcome,
      value: top?.value ?? null, unit: top ? clipTest(top.testKey)!.unit : null,
      detail: { ...got.detail, ...(got.say && { say: got.say }), sample: true }, setKey: null, takenAt,
    });
    runs += 1;
  }
  console.log(`Clips: ${runs} sample runs and ${results} sample results added for Aarav.`);
}

if (/scripts[\\/]seed[\\/]clips\.ts$/.test(process.argv[1] ?? "")) seedClips().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
