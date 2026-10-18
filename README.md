# Eyes Opener

**A free fitness app for the eyes.** Track how you use your eyes, check them at home, and practise with two-eye games, exercises and films, on a screen you already own and a pair of red-cyan glasses. Every game and exercise rests on published research, and its manual in the app says which.

Eyes Opener is not a medical device. It does not diagnose, treat or cure any condition.

**Try it:** [www.eyesopener.com](https://www.eyesopener.com) · [How it works](https://www.eyesopener.com/how-it-works) · [Play the demo game](https://www.eyesopener.com/try) · [Programmes](https://www.eyesopener.com/programmes) · [Evidence](https://www.eyesopener.com/evidence) · [Library](https://www.eyesopener.com/library) · [Safety](https://www.eyesopener.com/safety) · [Register](https://www.eyesopener.com/register)

![The Eyes Opener landing page](<app/docs/Eyes Opener Showcase/img/light/home.jpg>)

## The showcase

[`app/docs/Eyes Opener Showcase`](<app/docs/Eyes Opener Showcase>) is a picture book of the app, page by page, in the order a new family meets it, with short clips of check-ups, games and exercises being played. Open it on your computer after cloning:

- [`index.html`](<app/docs/Eyes Opener Showcase/index.html>): dark pages, with the clips
- [`light.html`](<app/docs/Eyes Opener Showcase/light.html>): light pages
- [`clips/`](<app/docs/Eyes Opener Showcase/clips>): the clips on their own (MP4): [the landing page](<app/docs/Eyes Opener Showcase/clips/landing.mp4>), [a letter check-up](<app/docs/Eyes Opener Showcase/clips/checkup-letters.mp4>), [Lantern Run](<app/docs/Eyes Opener Showcase/clips/lantern-run.mp4>), [Firefly Catch](<app/docs/Eyes Opener Showcase/clips/firefly-catch.mp4>), [Map Quest](<app/docs/Eyes Opener Showcase/clips/map-quest.mp4>), [Who Wants to Be a Visionary](<app/docs/Eyes Opener Showcase/clips/visionary.mp4>), [the Two-Eye Reader](<app/docs/Eyes Opener Showcase/clips/reader.mp4>)

The book shows the full Eyes Opener service. Some of what it shows (Map Quest, Visionary, the Reader, progress, the counsellor's plans) is part of the live service and not of this repository; see "What is in this repository" below.

## What a family gets

| | |
|---|---|
| **Track** | How the eyes are used: screen time, viewing distance, breaks, time outdoors. Three rings a day: rest, train and light |
| **Test** | Nine home check-ups (sharpness, contrast, depth, fusion and more), each compared with the person's own earlier results, with a printable summary for an eye exam |
| **Train** | Two-eye games and films drawn for red-cyan glasses at the doses the trials used, 47 exercises with guides and printable cards, and a dose clock with a stop button on every session |
| **Together** | A family with child mode, a counsellor who can set the plan, and a community whose ideas are tested before and after |

![Today, with the plan from a counsellor](<app/docs/Eyes Opener Showcase/img/light/gyan-today.jpg>)

| Check-ups | A game in full screen | Exercises |
|---|---|---|
| ![Check-ups](<app/docs/Eyes Opener Showcase/img/light/checkups.jpg>) | ![Lantern Run](<app/docs/Eyes Opener Showcase/img/dark/lantern.jpg>) | ![Exercises](<app/docs/Eyes Opener Showcase/img/light/exercises.jpg>) |
| **Two-eye cinema** | **Family and child mode** | **On a phone** |
| ![Two-eye cinema](<app/docs/Eyes Opener Showcase/img/light/cinema.jpg>) | ![Family](<app/docs/Eyes Opener Showcase/img/light/family.jpg>) | ![Today on a phone](<app/docs/Eyes Opener Showcase/img/light/phone-today.jpg>) |

### Safety rules the software enforces

- Red-flag questions come first, and the app never says the eyes are healthy.
- At most 90 minutes of practice a day, and no screen sessions under age 4.
- One press, "Stop, I feel unwell", ends a session at once. Nothing on screen flashes.
- The screen and the glasses are measured before any two-eye scene is shown.
- Camera pictures never leave the device: the workday monitor and the photo checks run in the browser.
- No cure claims, in the app or in community posts.

## What is in this repository

This repository is the open core of the web app. It runs on its own: clone, install, migrate, seed and build, with nothing else needed.

- **The engine:** eye profile, colour for red-cyan glasses, test staircases, dose limits and the stop rule
- **Nine home check-ups** with history, a change alert and a printable summary for an eye exam
- **The game kit** and eleven games: Firefly Catch, Spot Jump, Comet Trail, Lantern Run, Maze of Two Lights, Depth Darts, E Safari, Tunnel Glide, and three care companions (Sky Spotter, Far Window, Blink Garden)
- **47 exercise routines** with guides, on-screen drills and printable cards, and the two-eye cinema for your own video
- **97 clips:** short calibration and measurement runs
- **The workday monitor:** distance, blinks and breaks from the camera, on the device
- **Family accounts with child mode**, the community features, and the staff console, counsellor portal and sponsor portal
- **The public site:** landing page, how it works, programmes, evidence, library, safety, and the demo game
- **Sign-in** with Google or a six-digit email code (no passwords), languages, and the plain-words check on every sentence

The live Eyes Opener service adds more games (68 in all), Stories, the progress and screening pages, counsellors' plans and messages, and the apps for phone, TV and Chrome. Those parts are not in this repository, and nothing here links to them.

## Built with

Next.js 16, React 19 and TypeScript; PostgreSQL through Drizzle; a Canvas 2D game kit; MediaPipe Face Landmarker in the browser. The live service runs on Google Cloud: Cloud Run, Cloud SQL, Firebase Hosting and Authentication, and Gemini for the parts that write.

## Run it

Start in [`app/`](app/README.md): one script sets it up on Windows, and the commands for macOS and Linux are there too. Build rules for contributors are in [`app/docs/CONTRACT.md`](app/docs/CONTRACT.md).

Before every commit and push, `tools/check-public.mjs` checks that no secret, key or personal detail is about to be published. Turn the hooks on once after cloning: `git config core.hooksPath .githooks`.

## Licence

Eyes Opener is free software under the [GNU Affero General Public License v3.0 or later](LICENSE) (AGPL-3.0-or-later). You may use, change and share it. If you share a changed version, or run one for other people over a network, you must publish its complete source code under the same licence, so nobody can turn it into a closed product.

The licence covers the code, not the name: "Eyes Opener" and its logo stay the project's own, and a changed version must use its own name. See [NOTICE](NOTICE) for the copyright line, the rules for the name and logo, and the reminder that this is not a medical device.
