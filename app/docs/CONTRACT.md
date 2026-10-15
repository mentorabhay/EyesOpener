# Eyes Opener web app: build contract

Read this before writing any file. It is short, and it is what keeps the app consistent.

## Stack facts (do not assume older behaviour)

- Next.js 16 App Router, React 19, TypeScript strict. **`params` and `searchParams` are Promises: `await` them.** `cookies()` is async.
- Pages are Server Components. Add `"use client"` only to the component that needs state, effects or browser APIs.
- Data: PostgreSQL through Drizzle. `import { db, schema } from "@/db"` and operators from `drizzle-orm` (`eq`, `and`, `desc`, `gte`, `inArray`, `sql`). Use plain `db.select().from(...)`, `db.insert(...).values(...).returning()`, `db.update(...).set(...).where(...)`. Do not use the relational `db.query` API.
- Mutations are Server Actions in an `actions.ts` file beside the page (`"use server"` at the top). Validate every input with `zod` (v4). Finish with `revalidatePath`.
- No new npm packages. No Tailwind. No emoji in the interface.

## Files you may import but must NOT edit

| File | What it gives you |
|---|---|
| `src/app/globals.css` | All shared classes (list below) |
| `src/components/ui.tsx` | `PageHead`, `Card`, `Chip`, `EvidenceChip`, `Btn`, `Progress`, `Void`, `Empty`, `Pills`, `Rings`, `SceneThumb` |
| `src/data/index.ts` | `games`, `exercises`, `clips`, `ideas`, `programmes`, `tests`, `catalogue`, `mechanismOf`, `evidenceOf`, `isStrong`, `gameBySlug`, `exerciseBySlug`, `ideaBySlug`, `programmeBySlug`, `testByKey`, `exerciseGroups` |
| `src/db/schema.ts` | 51 tables. Read it; the comments state the rules |
| `src/engine/*` | `derive`, `Measured`, `EyeResult`, `snellen`, `acuityText`, `contrastText`, `percent`, `channel`, `strongInk`, `weakInk`, `videoMatrix`, `acuityLevels`, `acuityOf`, `contrastLevels`, `contrastGrey`, `CONTRAST_BACKGROUND`, `startStaircase`, `answerStaircase`, `startBalance`, `answerBalance`, `balanceContrasts`, `balanceCyanEye`, `canStart`, `MAX_DAILY_MINUTES`, `ringFor`, `ringShare`, `ageFrom`, `STOP_SYMPTOMS` |
| `src/lib/session.ts` | `requireMember()` returns `{ account, profiles, profile, age, eye, device, enrolment }`; `todayKey()` |
| `src/lib/actions.ts` | `switchProfile` |
| `src/app/(app)/layout.tsx`, `src/app/layout.tsx`, `package.json`, configs | |

If a change needs one of these, make it a separate, small pull request and say why.

Reference page to copy the pattern from: `src/app/(app)/today/page.tsx` and `src/copy/today.ts`.

## Rules

1. **Words.** Every string a member reads goes in `src/copy/<your-area>.ts`. Plain words a school student can follow. No jargon, no codes, no emoji. Say "weaker eye" and "stronger eye".
2. **Scope every query by the active profile** (`m.profile.id`) or account. Never trust an id sent by the browser without checking it belongs to `m.account`.
3. **Product rules, enforced on the server:**
   - AI never sets a dose. Minutes come from the programme (`m.enrolment`) or a counsellor.
   - Training sessions must pass `canStart(...)` from the engine. Never more than 90 minutes a day. No screen sessions under age 4.
   - A stop symptom ends the session at once (`endReason: "stop_rule"`).
   - No cure claims. No diagnosis wording. Evidence labels come from `@/data` only; never write your own effectiveness numbers.
   - Camera frames and photos are never sent to the server. Only derived numbers are stored.
   - A child is a profile inside the parent's account. No child email. Store birth year only.
4. **Design: direction B.** Use the shared classes. Hatching (`Void`, `Empty`, `prog hatched`, `chip data-b="none"`) means "not measured yet" or "not built yet". The gradient (`btn-g`, `chip data-b="grad"`, progress fill) is for the one primary action on a screen. Therapy scenes use `.scene` (black field) with inks `var(--weak)`, `var(--strong)`, `var(--shared)`; `--strong` is already set from the member's eye profile by the app layout.
5. **Works at 400 px wide** with no sideways scroll. Use `.bento` + `Card span`, `.grid-cards`, `.row`, `.stack`.
6. **Accessibility.** Real buttons and links, labels on inputs, `aria-label` on drawings, keyboard works, respect reduced motion.
7. Route-local styles go in a `*.module.css` beside the page. Keep them small.
8. If something in your scope cannot be finished, build the screen and mark the missing part with `Empty` and a plain sentence. Do not fake data.

## Shared CSS classes

Layout: `page` (already wrapped), `bento`, `c` `span3|4|5|6|7|8|12` `c-grad` `c-dark`, `c-head`, `stack`, `row` (+ `sp` spacer), `grid-cards`.
Text: `muted`, `small`, `tnum`. Head: `phead`, `hstat` (`v`, `l`), `crumb`.
Controls: `btn` `btn-g` `btn-d` `btn-gh` `btn-sm`, `pills` + `pill` (`aria-current="true"` or `aria-pressed="true"`), `field` (label + input), `input`, `notice` `data-b="ok|warn|danger"`.
Status: `chip` `data-b="ok|warn|risk|danger|none|grad|plain"`, `prog` (+ `hatched`), `seg`, `void`, `empty`.
Lists: `ins` (`tx`, `sub`), `kv` (`<dl class="kv"><div><dt/><dd/></div></dl>`), `tbwrap` + `table.tb` (`n` for right-aligned numbers).
Scenes: `scene` (+ `ratio` for 16:9), `chart` (white test panel, + `dark`), `gcard` (catalogue card: `.scene` then `.b`).

## Checking your work

- `npm run typecheck`, `npm run lint`, `npm test` and `npm run build` must all pass.
- Open what you changed in a browser at phone width (400 px) and at desktop width. No sideways scroll, no console errors.
- Demo data (`npm run db:seed`): the "Sharma family" with Aarav (child, 6, on the lazy-eye programme, has an eye profile), Priya (adult, no eye profile) and Dadi (adult, has an eye profile).
- Never commit a secret, a key or a personal email address. `node tools/check-public.mjs` at the repository root runs before every commit and push.

---

# Addendum: people, roles and areas

The identity model changed. Read `src/lib/roles.ts`, `src/lib/auth.ts`, `src/lib/session.ts`, `src/proxy.ts` and the top of `src/db/schema.ts`.

- **`account` is a household.** People sign in as **`appUser`**. One person can hold several roles: a household `seat` (guardian, co_guardian, circle), a `staffRole` (super_admin, ops, content), `isCounsellor` (usable once `counsellorVerifiedAt` is set), and sponsor membership (`sponsorUser`, owner or editor).
- **Roles are read from the database on every request.** Never trust a role, id or seat sent by the browser.
- **Not permitted means not found.** The gates call `notFound()`; do not build "access denied" pages.
- **Every staff, counsellor and sponsor write is audited:** `await audit(viewer, "action.name", targetId, { ...meta })`.

| Area | Route group | Gate (call it in the layout AND in every page and action) | Who |
|---|---|---|---|
| Member app | `src/app/(app)/**` | `requireMember()`, then `m.can(action)` before any write | guardian, co-guardian: everything allowed by `memberCan`; cheer seat: `view`, `encourage` only; child mode: `view`, `train`, `test` only |
| Admin console | `src/app/(admin)/admin/**` | `requireStaff(area)` with the room from `ADMIN_AREAS` | super_admin: all rooms; ops: overview, moderation, hazards, requests, counsellors, sponsors, households; content: overview, and the stories studio in editions that have it |
| Counsellor portal | `src/app/(counsellor)/counsellor/**` | `requireCounsellor()` | verified counsellors; they see only profiles with a `counsellor_link` to them |
| Sponsor portal | `src/app/(sponsor)/sponsor/**` | `requireSponsor(action)` | sponsor owners and editors; a pending sponsor sees its status and little else |
| Sign-in | `src/app/(auth)/login` | none | demo sign-in lists the seeded people |

`MemberAction` values: `view`, `encourage`, `train`, `test`, `share`, `manage_family`, `consent`, `data`, `seats`.

Shared shell for the three non-member areas: `PortalShell` from `src/components/portal.tsx` (props: `area`, `who`, `role`, `groups`).

## Privacy rules per area (enforce in the queries, not only in the page)

- **Sponsors see counts only.** Never a member's name, profile, result or session. Any count that covers fewer than `SPONSOR_MIN_GROUP` (5) households is not shown: render the hatched "not enough families yet" state instead.
- **Ops sees households, not eyes.** The households room lists a household's name, number of profiles and seats, last activity and open requests. It never shows test results, eye profiles or session detail.
- **Counsellors see linked profiles only**, and only while the link is `active`. A pending link shows the request and nothing else.
- **Child profiles:** no child sign-in exists. A child uses the app in child mode on a guardian's device (`io_child` entry of the `__session` cookie, exit by PIN; sealed paths in `SEALED_IN_CHILD_MODE`).
- **Cookies:** every cookie is an entry of the one cookie `__session`, read and written through `src/lib/cookie-jar.ts` (`jar()` in place of Next's `cookies()`; `requestJar` and `responseJar` in the proxy). Firebase Hosting passes on no other name. Never set a cookie of another name.
- **Dose:** only a verified, actively linked counsellor may set `enrolment.dailyMinutes` for a level 2 programme, never above `MAX_DAILY_MINUTES`; record `approvedBy`. Nobody else and no AI sets a dose.

## Demo people (seeded; pick one at `/login`)

Sharma family: Priya (guardian), Raj (co-guardian), Nani (cheer seat). Staff: Asha (super admin), Meera (ops), Kabir (content). Counsellors: Dr Rao (verified, has a pending link to Aarav), Dr Iyer (waiting for checks). Sponsors: Anita of Sunrise Eye Foundation (approved, group code SUNRISE1 with 7 households), Mr Das of Hillview School (pending). Also seeded: one open moderation item, one open data request.

To act as a person in a script or with curl, post the demo sign-in form on `/login`, or in a Playwright run click that person's "Sign in" button.

---

# Addendum: games (the kit)

Read `src/games/kit.ts` (the whole file) and the reference game `src/games/dgame/firefly-catch.ts` before writing a game.

## How a game is put together

- A game is one plain `.ts` file that exports a `GameDef<State>`: `init(k)`, `update(k, s)`, `draw(k, s)`. No React, no DOM, no images, no audio, no timers, no `Date`, no `Math.random` (use `k.rand()` and `k.pick()`), no module-level state. Time is `k.t` and `k.dt`.
- The scene is 640 x 360 units (`W`, `H`). The kit scales it to the screen, handles touch, mouse, keys and a TV remote, and owns contrast.
- You draw with three inks only: `"weak"` (cyan, reaches the eye behind the cyan lens: the weaker eye), `"strong"` (red, reaches the stronger eye, already at the member's contrast), `"both"` (white, reaches both eyes). Use `k.disc`, `k.ring`, `k.box`, `k.line`, `k.poly`, `k.text`, or `k.ctx(ink)` for your own paths. Never set a colour yourself. On a layer you may set `g.globalAlpha` to dim a shape; set it back to 1.
- Packages: `src/games/<package>/`. Each owner writes the game files, `index.ts` (slug to def), `slugs.ts` (the slugs that are built) and `src/copy/games-<package>.ts` (words drawn in the scene, and `help[slug]`: one plain line saying how to play with touch and with keys or a remote).
- Do **not** edit `kit.ts`, `canvas.tsx`, `registry.ts`, `built.ts`, `sim.ts`, `games.test.ts`, the Stage or the play page. Ask in your report.
- The Stage owns the session clock, the dose and the stop button. A game never ends a session, never shows a "game over", never takes lives, never counts down to a failure. A miss is quiet: the level eases.

## Rules every game must meet

1. **The catalogue is the spec.** `gameBySlug(slug)` gives `play`, `purpose`, `for`, `gear`. Build what `play` says. Each game must have its own mechanic; do not reskin one game twelve times.
2. **Ink carries the therapy.** Write a header comment in every game saying which ink carries what, and why.
   - *Two-eye balanced play* (`dgame`, lazy eye): what the member must find or steer is in `weak` ink; something the game also needs (obstacles, walls, landed pieces) is in `strong` ink; the frame, the score and at least one anchor are in `both`. The game must be impossible to score in with the stronger eye alone, and should need the stronger eye too.
   - *Vergence* (`verg`, `vstep`, and the recovery games): use `src/games/vergence.ts` (read it). Hold the demand in a `Demand`, set it with `aim`, move it with `ramp` once a frame (never faster than 2 prism dioptres a second) or, in a jump game, with `jumpTo` (limited by level). Draw with `target(...)` so each eye's picture carries its own dot, or `k.fuse` / `fuseAt` for your own shape plus your own per-eye mark. Positive demand turns the eyes in, negative out. Demand starts at 0 in every session and stays inside `k.convMax` / `k.divMax`. A game cannot see the eyes: every vergence game draws `drawSplit(k, label)` and, when `splitPressed(k)` is true, calls `ease(k, d)`. Down is reserved for "it split in two". Everything that is not the fusion target is in `both` ink.
   - *Depth* (`stereo`): `k.depth(arcsec, ...)`. Never ask for a step finer than `k.pxArcsec`.
   - *Games with no glasses* (gear "None" or a patch): use `both` for everything that matters and `weak` only as a second colour. Never `strong`: it is dimmed for some members.
   - *Counsellor-led games* (level 2): slow, uncluttered, no time pressure at all.
3. **Size.** Multiply sketch sizes by `k.k`. Words are drawn at `k.letter` or larger. Anything tappable has a reach of at least `26 * k.k`. Keep play below the score line: nothing important above `y = 30 + k.letter`, and nothing important within 14 units of an edge. At `k.k = 3` (a member who needs large targets, or a phone) the game must still fit: clamp counts and positions.
4. **No flashing.** Nothing switches on and off or swaps colours more than twice a second. No full-screen flashes, no strobing, no pattern reversal. Multiply every speed by `k.slow`.
5. **Input.** Fully playable by touch or mouse (`k.input.tapped`, `x`, `y`, `down`) and fully playable by keys or a remote (`dx`, `dy`, `pressed`, `action`). A TV has four arrows and OK, nothing else.
6. **Difficulty** follows the player through `k.hit()` and `k.miss()` and `k.level` (1 to 10). Level changes speed, count, spacing or demand. It never changes contrast.
7. **Score** through `k.add()`; show it with `k.hud(...)`.
8. **The first frame** from `init` must look like the game: it is the still picture shown before Start.
9. Words drawn in the scene come from your copy file. Plain words. No emoji.

## Checking a game

- `npx vitest run src/games 2>&1 | tail -30 | cut -c1-200` plays every game for two minutes with random input on three screen sizes. It must pass.
- Look at it: open `/train/games/<slug>/play` as the demo guardian with Aarav's profile, press Start, and play with touch and with the arrow keys and Space. Check a 400 px phone width too. Aarav is 6, on the lazy-eye programme, stronger-eye contrast 15%. Level 2 games do not open for him (that is the rule working); test those in the simulator and by reading your drawing code.
- `npx tsc --noEmit 2>&1 | grep "games/<package>\|games-<package>" | cut -c1-240` and `npx eslint src/games/<package> src/copy/games-<package>.ts 2>&1 | tail -20 | cut -c1-220`.

---

# Addendum: exercise guides, drills and results

An exercise page must leave nobody guessing. It says what the routine is, how to set up, what to do step by step, what to measure and exactly how, what is usual, and when to stop. It then gives the member the tool to do it and keeps the result.

Read `src/data/guides/types.ts` (the whole file), `src/data/guides/index.ts`, `src/games/kit.ts` and `src/games/vergence.ts`.

## Guides (`src/data/guides/<group>.ts`)

- One `Guide` for every exercise of the group in `src/data/catalogue.json` (`exercises`). The catalogue line (`how`, `purpose`, `for`, `gear`, `dose`) is the spec: the guide expands it and never contradicts it.
- **Words.** Plain words a school student can follow. One action per step. Say "weaker eye" and "stronger eye". Say what the member will see ("the two strings look like an X that crosses at the bead"). No jargon without its meaning beside it. No emoji. No cure claims, no promise of a result, no diagnosis.
- **Steps** say distances in centimetres or metres, counts and times. A member must be able to do the routine from the page alone.
- **Measures.** One to three per guide. Each says exactly how to get the number. `from: "auto"` is for what the tool itself fills in: the keys in `AUTO_KEYS[slug]` for a drill, the reading tool or the grid (list them, with a label, unit and `how` that says what the screen does), and the `measure` a `count` or `checklist` tool names. Everything else is `from: "typed"`. `npx vitest run src/data/guides` checks the shape of every guide. Keys: lower case, digits and underscores, at most 24 characters.
- **What is usual.** Give a figure only when a published source gives it, and point `usual.source` at that source. When none exists, leave `usual` out: the page then says to compare with one's own earlier results. Never invent a norm.
- **Sources.** Each source is a real paper or a guideline from a professional body, with a working URL (prefer PubMed, PMC or the publisher's page). Check each one by opening it. At least one source per guide. `evidence` is one honest line about the routine itself ("No trial tested this drill on its own; it is part of the supervised therapy the trials used.").
- **Stop.** Always include: double vision that stays, a headache, eye pain, feeling dizzy or sick. Add what is particular to the routine.
- **Tool.** `drill`, `reading` and `grid` only for the slugs in `TOOL_KIND`. `cinema` for routines done in the two-eye cinema. `companion` names a care-companion game that logs the same thing. `count` suits anything counted against the clock (cycles in a minute). `checklist` suits a set-up check. `log` suits a routine that runs through the day, where a stopwatch makes no sense (hours of glasses wear): the member types the numbers and saves. Otherwise `timer`. With `cinema` or `companion` the time is the record and `measures` may be empty.
- A camera feature that the catalogue mentions is not built. Write the routine so it is done by hand (a ruler, an arm's length, a timer), and say so in one plain line.

## Drills (`src/drills/**`)

A drill is a `GameDef` on the game kit, registered under the exercise's slug. Everything in "Addendum: games (the kit)" applies, with these differences:

- A drill is practice with a measurement, not a game: calm, uncluttered, no time pressure unless the measure is a rate.
- It reports its measures with `k.report(key, value)` (replace) and `k.peak(key, value)` (keep the largest). It reports exactly the keys in `AUTO_KEYS[slug]`, in the units the guide states. Numbers a member would call wrong (negative seconds, more than the screen can show) are never reported.
- The words drawn in the scene and the one-line help live in `src/copy/drills-<package>.ts` (`words`, `help[slug]`).
- Vergence drills use `src/games/vergence.ts` and keep every rule there: start at zero, at most 2 prism dioptres a second, jumps inside `maxJump`, the "it split in two" control, per-eye marks.
- A drill done with a patch or with no glasses draws in `both` ink. For a grey that is not white (a faint stripe, a grey field) it may set `fillStyle`/`strokeStyle` itself on the `both` layer after `k.ctx("both")`; nothing else may set a colour.
- `src/drills/drills.test.ts` plays every drill in the simulator at three sizes and checks the reported keys.

## Results

- The kit keeps `k.stats` for every session: `hits`, `misses`, `level`, `top`, and whatever a game or drill reports. The Stage saves it in `session.detail` when the session ends (plain numbers by key; `cleanDetail` in `src/lib/sessions.ts` drops anything else).
- A page shows a member's own record with `pastSessions(m, kind, slug)` and the `History` component (`src/components/play/results.tsx`). Labels for the numbers come from the guide's measures (exercises) or `src/copy/results.ts` (games).

## Status of library items

- Staff set each game, exercise and the cinema to `open`, `counsellor`, `staff` or `off` in the Catalogue room (`src/lib/status.ts`, `src/lib/catalogue.ts`). Everything is `open` until staff change it.
- `doseFor(m, kind, slug)` checks the status. Lists hide `staff` and `off` from members. A staff member with no household of their own gets a test household (`m.tester`): every status opens for them and the daily limits are off.

---

# Addendum: game guides

A member who opens a game must not have to guess. The game's page says what the game is for, what they should see, how to play, when to press, what counts as success, what is measured, and when to stop. A person who tried Tunnel Glide wrote: "ask was: you see one ring with both dots. This never happens, or I am not understanding." He had no glasses on, and nothing told him that the screen always shows two rings and that they become one only through red-cyan glasses. Every guide must close that kind of gap.

Read `src/data/game-guides/types.ts`, `src/data/game-guides/cue.ts`, the reference guide in `src/data/game-guides/verg.ts` (Tunnel Glide), `src/components/play/cue.tsx` and `src/data/game-guides/game-guides.test.ts`.

- **One `GameGuide` for every built game**, written from the game's own code and copy: read the game's file, its words and its catalogue entry before writing. The guide describes what the game really does: what scores a point, what the top line shows, which key does what.
- **Words.** Plain words a school student can follow. Say "weaker eye" and "stronger eye". No jargon without its meaning beside it. No emoji. No cure claims, no promise of a result.
- **`see`** says what is on the screen and what the member sees through the glasses, and what each eye gets. For a red-cyan game it says that the screen itself always shows both pictures.
- **`cues`** are two to four small pictures of "when you see this, do this", each a list of simple shapes in a 160 by 90 box (see `cue.ts` for builders). Draw the real moments of this game, simplified: the moment to act (`go`), the moment to wait (`wait`), and what to do when the eyes let go or one eye switches off (`stop`). Mark where to tap with `tap(x, y)` and the key to press with `key(x, y, "Space")`. Words inside a picture are short (30 characters at most) and at least size 6. Keep shapes inside the box.
- **`success`** says what one point is, what a good session looks like, and what the level means. Where the game relies on what the member reports (every fusion game), say that pressing without seeing it raises the numbers and trains nothing.
- **`measures`** name the numbers the session keeps, with the keys the kit records: `score`, `hits`, `misses`, `top` (highest level), and for games built on `vergence.ts` also `conv`, `div` and `splits`. List only what this game really records (a game that never calls `k.hit` has no `hits`). No published norm exists for a game score: never give one.
- **`joined: true`** only for a game whose target is drawn with `k.fuse`, `target` or `fuseAt` and must be joined into one picture. The page then offers the "Eyes joined" practice view.
- **`helps` and `evidence`** are honest: what the method is, what trials found for the method, and that no trial tested this game. Sources are real papers or guidelines with a working URL. The exercise guides (`src/data/guides/*.ts`) and the evidence page (`src/copy/site.ts`) already carry sources that were opened and read: reuse those by copying the label and the URL. A new source must be opened and checked first.
- **`stop`** always includes: double vision that stays, a headache, eye pain, feeling dizzy or sick. A care companion (a family log with no scene) needs only what fits it.
- `npx vitest run src/data/game-guides` checks every guide.

---

# Addendum: the assistant seam

Some editions of Eyes Opener have an assistant (AI). The public edition has none, and its pages must work, and say nothing about AI, without one.

- **The seam is `src/lib/assist/`.** `types.ts` holds what an assistant may be asked and the shapes it answers in, with the rules every assistant must keep. `extra.ts` is this edition's assistant: it answers "none" to everything. A fuller build replaces that one file. Never import an assistant from anywhere else.
- **A page asks first.** Draw nothing about AI unless `assist.available` is true. Offer a member a button only when `assist.ready(job)` is true as well, so nobody presses a button that cannot answer.
- **An assistant suggests and flags. A person decides.** Nothing it returns is saved, published, approved or removed by the page on its say-so. The fixed hazard rules (`screenHazards`) run first and their answer stands whatever an assistant says: it can only add caution.
- **Say when words came from AI.** Wherever a member or a reviewer reads an assistant's words, the page says so in the same place. The words are in `src/copy/assist.ts`.
- **What an assistant leaves in the database** has a shape that is public and checked on reading: `AiFlagZ` for `moderation_item.ai_flag`. The vectors of the search by meaning are `protocol.embedding` and the table `library_vector`; they need the PostgreSQL extension `vector`.
- **Two more slots** follow the same pattern: `src/lib/jobs/extra.ts` (scheduled jobs an edition adds; empty here) and `src/app/(admin)/admin/switchboard/extra.tsx` (what an edition adds to the Switchboard; nothing here).
- **The research library** (`src/lib/library.ts`, `/together/research`) is part of every edition. It returns passages of the app's own pages, word for word, with their sources, and never writes an answer. It searches by words; an assistant may add a search by meaning through the seam.

---

# Addendum: languages

The app can be read in ten languages besides English. Read `docs/LANGUAGES.md` before adding a page or a file of words.

- **A file of words is made with `texts(...)`**: `export const today = texts("copy/today", "today", () => ({ ... }))`. It types and reads like the plain object; a word is looked up in the reader's language at the moment it is read. `npx tsx scripts/i18n.ts wrap --write` does this for a new file.
- **Never read a word while a module loads.** `const tabs = [{ label: n.today }]` at the top of a file keeps one reader's language for everybody: write `const tabs = () => [...]`. A page's title is `generateMetadata`, not `metadata`.
- **Never decide by a word, cut a word up, or store a word.** Compare values, not labels. What goes into the database or the audit log is written inside `inEnglish(() => ...)`.
- **No words typed into a page.** A string written straight into a page or a component stays English in every language.
- **Catalogue lines a person reads** come from `src/data/words.ts` (`gameWords(game).purpose`), not from `game.purpose`.
- **Numbers and units in a sentence** are written as figures with their unit ("20 minutes", "40 cm"): that is what lets a translation be checked against the English.
- After changing words: `npx tsx scripts/i18n.ts count --write`, then `npx vitest run src/i18n`. The tests fail on a word read too early, on a list that is older than the words, and on any translation that changes a number, a unit, a placeholder or a name.

---

# Addendum: the plain-words check

Every sentence a person reads is checked by rule (`src/lib/plain-words.ts`); a test runs the rules over every file of words, every guide and every catalogue line (`src/lib/plain-words.test.ts`).

- **Must not exist (the test fails):** an emoji; a code or a file name on screen; a note left for a builder; a doubled word or a doubled space; "good eye", "bad eye", "lazy eye" said of a person's eye, "better eye"; a promise of a cure; a diagnosis stated by the app; a sentence over 45 words; a trade word with no meaning beside it (the list is `JARGON`); a hard word that has a plain one (`HARD_WORDS`); "patients", "users"; a wrong name for the glasses; "!!".
- **Counted, and may only go down:** sentences over 28 words, and sentences that read above school year 11. Today's counts are in `src/lib/plain-words.baseline.json`. A change that adds one fails; a change that removes some should write the lower counts with `npx tsx scripts/plain-words.ts --baseline`.
- **Who reads it decides how strict it is.** Words for a family and for the public pages get every rule. Words for a counsellor may use the trade words. Words for staff may use both.
- **A source is not a sentence.** A citation keeps its own title, journal and names.
- **The answer to a finding is to rewrite the sentence.** `ALLOWED` in the rules file lists the few places a person has read and found right, each with its reason; a test fails when an entry there no longer matches anything.
- To read the findings: `npx tsx scripts/plain-words.ts` (add `--soft` for the counted ones).
