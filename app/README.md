# IOpener web app

Eye care at home: track, test, train, together. This folder is the web app (Next.js 16, TypeScript, PostgreSQL through Drizzle).

## Run it on Windows

1. Install Node.js 22 or later and Docker Desktop. Start Docker Desktop.
2. Double-click `setup.bat` once. It installs packages, starts PostgreSQL, creates the tables and adds the demo data.
3. Double-click `start.bat`. The browser opens `http://localhost:3000/login`.

On macOS or Linux: `cp .env.example .env.local && npm install && docker compose up -d && npm run db:migrate && npm run db:seed && npm run dev`.

## Who you can sign in as (demo)

| Person | Role | Their area |
|---|---|---|
| Priya | Guardian of the Sharma family | `/today`, `/family`, everything in the member app |
| Raj | Co-guardian | The same, without seats and the exit PIN |
| Nani | Cheer seat | `/circle`; can look, send Fusion Mail and give a light |
| Asha | Super admin | `/admin`, every room |
| Meera | Ops team | `/admin`: moderation, hazards, requests, counsellors, sponsors, households, enquiries |
| Kabir | Content | `/admin`: overview |
| Dr Rao | Verified counsellor | `/counsellor` |
| Dr Iyer | Counsellor waiting for checks | No portal until ops verifies |
| Anita | Sponsor owner, approved | `/sponsor` |
| Mr Das | Sponsor owner, pending | `/sponsor` shows the waiting message |

A child never signs in. A guardian hands the device over from `/family` (child mode) and leaves it with the exit PIN.

## Commands

```
npm run dev              # http://localhost:3000
npm test                 # engine, roles, games, check-ups, care rules and site rules (Vitest)
npm run typecheck
npm run lint
npm run build
npm run db:generate      # write a migration after changing src/db/schema.ts
npm run db:migrate
npm run db:seed          # reset the demo data
```

## What is in it

- **Public site:** landing page with scroll scenes (`/`), how it works, programmes, evidence, library, safety, pages for counsellors and for sponsors and schools (with an enquiry form), about, privacy, children's data, terms.
- **Member app:** today (three rings), onboarding for each eye, nine check-ups with history, a change alert and a printable summary for an eye exam, games, 47 exercise routines, two-eye cinema for your own video, community, family, child mode.
- **Games:** eight canvas games on one kit (two-eye play, vergence, depth, seeing skills) and three care companions (daylight, blink and far breaks).
- **Staff console, counsellor portal, sponsor portal.**

## How more is added

A fuller build adds games and features without changing this code. The places it plugs into are small files that are empty here: `src/edition.ts` and `src/edition-server.ts` (optional features), `src/games/extra.ts` and `src/games/extra-ui.tsx` (whole game families), `src/games/<family>/extra.ts` with `src/copy/games-<family>.extra.ts` (more games in a family), `src/games/care/extra.tsx` with `extra-slugs.ts` (more care companions), `src/data/catalogue.extra.json` (their catalogue entries) and `src/copy/hero-games.extra.ts` (more games the member's hero plays in). This edition must always build and pass its tests with those files as they are.

## Where things are

| Path | What |
|---|---|
| `src/engine/` | The shared engine: eye profile rules, colour, test staircases, check-up maths, dose and stop rule. Pure functions, unit-tested |
| `src/games/` | The game kit (`kit.ts`, `vergence.ts`), a simulator that plays every game in tests (`sim.ts`), and the games by family: `dgame`, `verg`, `depth`, `skills`, `care` |
| `src/db/schema.ts` | Every table (51), with the rules in comments |
| `src/data/` | Games, exercises, clips, programmes and tests as typed data |
| `src/lib/roles.ts`, `auth.ts`, `session.ts` | Who may do what, and the gates each area calls |
| `src/proxy.ts` | Child mode: seals the grown-up screens |
| `src/app/(site)/` | The public site: landing page and information pages |
| `src/app/(app)/` | Member app: today, onboarding, test, train, together, settings, family, circle |
| `src/app/(admin)/`, `(counsellor)/`, `(sponsor)/`, `(auth)/` | The staff console, the two portals and sign-in |
| `src/copy/` | Every word a person reads |
| `docs/CONTRACT.md` | Build rules for anyone adding to the app, with the rules every game must meet |
| `docs/SIGN-IN.md`, `src/lib/signin/` | Sign-in with Google and by email link: how it works, its settings, what to switch on at Firebase |

## Not built yet

- Sign-in with Google and by email link is built and waits for a Firebase project (`docs/SIGN-IN.md`). Until its settings are present the demo sign-in stands in.
- Camera features (blink and distance monitor), voice audio, languages.
- Data export and deletion jobs, the weekly league reset.
- The privacy, children's data and terms pages are drafts. A lawyer must review them before launch.
- Nothing has been checked through real red-cyan glasses or on a real TV. `setup.bat` and `start.bat` have not been run on Windows.

IOpener is not a medical device. It does not diagnose, treat or cure any condition.
