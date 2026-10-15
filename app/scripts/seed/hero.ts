/**
 * Demo rows for Draw Your Hero and the Focus Wall. Run it after the main seed and the league's; safe to run again.
 *   npx tsx scripts/seed/hero.ts
 * Everything here is sample data for development.
 *
 * What it does:
 * - Gives Aarav two heroes, unless he has one already: the ready-made cat, and a drawn figure that is the one in
 *   play. The figure is a drawing made by code (src/lib/hero/test-picture.ts) and read by the app's own tracing,
 *   so the row holds exactly what the tracing produces. It is not a child's drawing.
 * - Sets this month's wall right: the picture is drawn by IOpener, so the wall says so, and it has the size a new
 *   wall would be given from last month's finished practice days.
 * - Opens last month's wall and gives every finished practice day in the demo data its tile, with the same code
 *   the daily job uses. The tiles shown are counted, not typed in.
 */
import "../env";
import { and, eq } from "drizzle-orm";
import { wall as words } from "../../src/copy/wall";
import { db, schema as s } from "../../src/db";
import { starter } from "../../src/games/hero";
import { circle, sheet, stroke } from "../../src/lib/hero/test-picture";
import { trace } from "../../src/lib/hero/trace";
import { dayOf } from "../../src/lib/league";
import { ensureWall, finishedIn, settleTiles } from "../../src/lib/wall";
import { artworkFor, monthOf, shiftMonth, tilesFor } from "../../src/lib/wall-rules";

const DAY_MS = 86_400_000;

/** A drawing made by code, the way a six-year-old might draw a person: a big round face, a small body. */
function sampleDrawing() {
  const p = sheet(256, 256);
  circle(p, 128, 86, 60, 9);
  circle(p, 106, 74, 7);
  circle(p, 150, 74, 7);
  stroke(p, 102, 104, 128, 117, 7);
  stroke(p, 128, 117, 154, 104, 7);
  stroke(p, 128, 148, 128, 198, 9);
  stroke(p, 128, 166, 82, 150, 9);
  stroke(p, 128, 166, 174, 150, 9);
  stroke(p, 128, 198, 100, 246, 9);
  stroke(p, 128, 198, 156, 246, 9);
  return p;
}

export async function seedHero() {
  const [aarav] = await db.select({ id: s.profile.id }).from(s.profile).innerJoin(s.account, eq(s.account.id, s.profile.accountId))
    .where(and(eq(s.profile.displayName, "Aarav"), eq(s.account.isDemo, true))).limit(1);
  if (!aarav) { console.log("Hero: the demo family is not there. Run the main seed first."); return; }

  /* heroes */
  const have = await db.select({ id: s.hero.id }).from(s.hero).where(eq(s.hero.profileId, aarav.id));
  if (!have.length) {
    const drawn = trace(sampleDrawing());
    if (!drawn.ok) throw new Error(`the sample drawing could not be traced: ${drawn.why}`);
    await db.insert(s.hero).values([
      { profileId: aarav.id, sprite: starter("cat"), isCurrent: false, createdAt: new Date(Date.now() - 12 * DAY_MS) },
      { profileId: aarav.id, sprite: drawn.sprite, isCurrent: true, createdAt: new Date(Date.now() - 5 * DAY_MS) },
    ]);
  }

  /* the wall */
  const today = dayOf(new Date()), month = monthOf(today), before = shiftMonth(month, -1);
  await ensureWall(before);
  const pastAdded = await settleTiles(before, { today });
  const now = await ensureWall(month);
  /* The size a new wall gets comes from the days finished the month before; the seeded wall is brought up to it, never shrunk. */
  await db.update(s.focusWall)
    .set({ title: words.art[artworkFor(month)].title, artist: words.artist, tiles: Math.max(now.tiles, tilesFor(await finishedIn(before))) })
    .where(eq(s.focusWall.id, now.id));
  const added = await settleTiles(month, { today });
  console.log(`Hero: ${have.length ? "heroes kept as they were" : "2 heroes for Aarav"}. Wall: ${pastAdded} tiles added for ${before}, ${added} added for ${month}.`);
}

if (/scripts[\\/]seed[\\/]hero\.ts$/.test(process.argv[1] ?? "")) seedHero().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
