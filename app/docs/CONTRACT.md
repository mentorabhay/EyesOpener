# IOpener web app: build contract

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
- **Child profiles:** no child sign-in exists. A child uses the app in child mode on a guardian's device (`io_child` cookie, exit by PIN; sealed paths in `SEALED_IN_CHILD_MODE`).
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
