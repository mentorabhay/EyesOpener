# Eyes Opener

Eye care you can do at home, built on published research: track how you use your eyes, check them, and practise with games. Eyes Opener is not a medical device. It does not diagnose, treat or cure any condition.

This repository is the open core of the web app:

- the engine: eye profile, colour for red-cyan glasses, test staircases, dose limits and the stop rule
- nine home check-ups with history, a change alert and a printable summary for an eye exam
- the game kit and a first set of games
- 47 exercise routines and a two-eye player for your own video
- the community features, family accounts with child mode, and the staff, counsellor and sponsor areas
- the public site: landing page, programmes, evidence, library, safety

The live Eyes Opener service adds more games, stories and apps for phone and TV that are not in this repository.

Start in [`app/`](app/README.md). Build rules for contributors are in [`app/docs/CONTRACT.md`](app/docs/CONTRACT.md).

Before every commit and push, `tools/check-public.mjs` checks that no secret, key or personal detail is about to be published. Turn the hooks on once after cloning: `git config core.hooksPath .githooks`.
