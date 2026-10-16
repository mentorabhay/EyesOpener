<!-- Eyes Opener: Languages. -->
# Languages

How Eyes Opener is read in a language other than English: what decides the language of a page, when a translation
is shown and when it is not, how staff switch a language on, how a reviewer works, and what is never translated.

Read this before changing anything under `src/i18n/`, `src/copy/`, `translations/` or `scripts/i18n/`.

## The design in ten lines

1. English is the source. Every word a person reads is written in English in `src/copy/*` and in the guide and
   catalogue files under `src/data/`. The ten other languages are translations of it, kept as files in
   `translations/<language>/`.
2. A file of words is made with `texts(...)`. It looks and types like the plain object it wraps; a word is looked
   up in the reader's language at the moment it is read, never before.
3. The language of a request is decided once, in `src/proxy.ts`, and travels with the request in a header. A whole
   page is always drawn in one language.
4. A translation is shown only when a person has reviewed it, it was made from the English as it is now, and its
   numbers, units, placeholders and fixed names are those of the English. In every other case the English
   sentence is shown.
5. A language has a status that staff set: off, in review (staff only), on. Every language starts off.
6. A household has one language (`account.locale`), chosen by a guardian. A visitor to the public site chooses
   for their own browser. Both are kept in a cookie so the language is known before anyone is looked up.
7. The browser is given only the sentences its own code can read, in one small script loaded before the page
   comes alive. The server draws the browser's parts of a page from that same set, so the two always agree.
8. A machine draft is never shown to a family. Production cannot show one: the switch that shows drafts exists
   in development only.
9. Translations are files in the repository. They reach a family only through a release, and every release is
   checked by tests that read each entry against the English.
10. The part that calls a translation service is not in this repository. It writes the same files.

## The eleven languages

English (`en`, written as Indian English), Hindi (`hi`), Bengali (`bn`), Tamil (`ta`), Telugu (`te`), Marathi
(`mr`), Gujarati (`gu`), Kannada (`kn`), Malayalam (`ml`), Urdu (`ur`) and Punjabi (`pa`). The list, each
language's own name, its script and its direction are in `src/i18n/languages.ts`.

## When a translation is shown

`src/i18n/runtime.ts` holds the rule, and it is the same on the server, in the browser, in the scripts and in the
tests. A translation is used only when all of these hold. Otherwise the English text is returned.

| Rule | Why |
|---|---|
| An entry exists under exactly the key the app asks for | An entry under any other key is never read |
| A person has reviewed it (`"status": "reviewed"`) | A machine draft is not health guidance |
| It carries the mark of the English as it is now (`src/i18n/mark.ts`) | An old wording is never shown under a new meaning |
| It passes every check of `src/i18n/check.ts` | See below |
| For a part of the page that also runs in the browser: it is in the browser's set | See "The browser" |

What `check.ts` holds a translation to. It proves a translation wrong; it cannot prove one right.

- The same placeholders (`{name}`, `{n}`), each as often as in the English.
- The same numbers, in the digits 0 to 9. No other numeral of any kind, unless the English has that very sign.
- The same units. A sign (cm, mm, m, %, min, s) stays as it is, after its number. A word (minutes, weeks, times)
  is the language's own word from `src/i18n/units.ts`, after its number. This also holds where the app writes the
  number in: `{n} minutes` cannot come back as `{n}` hours. Where two numbers share one unit ("48 of 60 minutes",
  "10 to 15 minutes") the unit may follow either.
- `Eyes Opener` stays in English letters. So do the names of games and exercises; that is checked for every file in
  the repository by `src/i18n/files.test.ts`.
- The same links and addresses, the same space at the start and the end, the same line breaks.
- No hidden mark that changes the order text is drawn in, and no control character. A direction override in front
  of "90" would draw it as "09".
- Letters of the language's own script or Latin letters only. A translation filed under the wrong language is
  refused.
- A sentence of 60 letters or more that came back a third as long, or four times as long, is refused: it was cut
  off or padded.
- A word drawn inside a game scene or on a printed card has the room the English had, and a little more.

What it cannot catch, and a person must: an instruction turned round ("stop" for "go on"), a number written as a
word ("twice"), a word with two meanings taken the wrong way ("Right", the eye, as "correct"), a softer or a
stronger promise, an unkind or a childish tone.

## How a request gets its language

1. `src/proxy.ts` runs before anything is drawn. It reads the entry `io_lang` of the cookie `__session` (`src/lib/cookie-jar.ts`), matches it against the fixed list
   of eleven, and asks `src/i18n/decide.ts` whether this browser may have that language: it is on, or it is in
   review and the browser carries a signed staff pass for it (`io_lang_pass`). A request for English reads
   nothing. A request for another language reads the statuses, kept in memory for half a minute.
2. The proxy writes the answer on the request as the header `x-io-lang`. It always writes it, so a header sent by
   a browser is never believed. When the cookie named a language the browser may not have, the cookie is put
   back to English.
3. `src/i18n/runtime.ts` reads that header from the request Next.js is serving at that moment. Two requests
   drawn at the same time each read their own.
4. The root layout (`src/app/layout.tsx`, through `src/i18n/html.tsx`) sets `<html lang dir data-script>` and
   loads the browser's words. It reads the header a second time through Next.js's public `headers()`. If the two
   readings ever disagree, the whole page is drawn in English and the server log says so.

A household's language and a browser's cookie are kept the same by `src/i18n/household.ts`. A member's page
that is about to be drawn in another language than the household's sends the browser through `/lang/sync`,
which sets the cookie and sends it straight back. So a new device, or a change made on another device, shows the
household's language from the first page.

Choosing a language (`src/i18n/actions.ts`): a guardian or co-guardian changes the household and this browser. A
cheer seat and a device in child mode change nothing. A visitor with no household changes their own browser. In
every case only a language offered to that person can be chosen. After a change the page is loaded afresh, so its
words, its direction and its typeface change together. `src/i18n/watch.tsx` loads a page afresh whenever the
cookie has changed under it (a sign-in, another tab, staff switching a language off).

### The one place that reaches inside Next.js

Nothing public in Next.js can tell a piece of code, without waiting, which request it is running for; a word is
read in the middle of drawing and cannot wait. So `runtime.ts` imports
`next/dist/server/app-render/work-unit-async-storage.external`, which is where Next.js itself keeps the request.
That import is not part of Next.js's public interface. What guards it:

- `src/i18n/next.test.ts` builds requests with Next.js's own factory and runs code inside them as Next.js does.
  It fails if the store, the kind of a request or its headers change shape. **Run it after every upgrade of
  Next.js.** It also proves that thirty requests in four languages, started together, each see only their own.
- `runtime.ts` never throws on it. If the store is missing or changed, every lookup answers in English.
- The root layout compares the two readings (above) and draws the whole page in English if they differ.
  `src/i18n/next-broken.test.ts` holds both of these.

`src/i18n/layer.ts` relies on one more fact, which is public: the build Next.js makes for server-only parts of a
page is given a React without `useEffect`. `next.test.ts` checks it.

## How words are read

```ts
export const today = texts("copy/today", "today", () => ({
  title: "Today",
  rings: { of: (done: number, goal: number) => `${done} of ${goal}` },
}));
```

- `today.title` gives the reviewed translation, or "Today".
- `today.rings.of(48, 60)` runs the English function first. The function was turned into a template by the
  extractor ("{done} of {goal}"); the translated template is filled with the same values only when the English
  template filled with them is exactly what the function gave. Otherwise the English result is shown.
- A parameter that takes one of a few fixed words (`"left" | "right"`) never becomes a placeholder: each value
  has its own sentence. Where 0 or 1 reads differently, those have their own sentences too.
- A copy file that builds its sentences from another file's words builds them in English (`inEnglish`).

The catalogue (`@/data`) is not translated in place, because the code works with its strings. A page reads the
words of a game, an exercise, a programme, a check-up, a method or an evidence label from `src/data/words.ts`
(`gameWords(game).purpose`), and the guides are made with `textsEach`, which says which fields are words
(`src/data/guides/words.ts`, `src/data/game-guides/words.ts`).

### The one rule for everyone who writes a page

**Never read a word while a module loads.** A module loads once, inside whichever request needs it first, so a
word read at the top of a file would be kept in that first reader's language for everybody.

```ts
const tabs = [{ href: "/today", label: n.today }];          // wrong: read once, kept for ever
const tabs = () => [{ href: "/today", label: n.today }];    // right: read for each request
export const metadata = { title: t.title };                 // wrong
export const generateMetadata = () => ({ title: t.title }); // right
```

`const n = common.nav;` at the top of a file is fine: it keeps the object, and a word is read from it later.
Three more things go wrong once a word can come back in Hindi, and the same scan finds them: deciding by a word
(`if (label === "Done")`), cutting a word up (`text.split(" · ")`), and storing a word in the database (wrap it in
`inEnglish(() => ...)`). `src/i18n/captures.test.ts` reads the whole app with the TypeScript compiler and fails on
any such place that is not listed, with its reason, in `scripts/i18n/policy.ts`.

In development the server also notices a word read too early, answers in English and says where in its log.

## The browser

Most words are drawn on the server and arrive as part of the page. Only the parts of a page that run in the
browser ("use client") read words there. They import the same copy files, so the English is in their code
already; what they lack is the translation.

- `scripts/i18n/client.ts` reads the source and lists which sentences the browser's own code can read: the files
  reached from any "use client" file, and in them every place a file of words is read, as far as the source
  names each step (`site.nav.signIn`, `languages.choose`). The list is kept in `translations/manifest.json`
  under `client`. Today that is 2,150 of 9,229 sentences, about a fifth of the text.
- `src/i18n/client-words.ts` makes one script for a language with the reviewed sentences of that list. The root
  layout loads it before the page comes alive, from `/lang/words/<language>/<version>`. The address changes when
  the words change, so a browser keeps the file until then. For a fully translated language the script is about
  370 kB, 90 kB as sent (gzip). An English page loads nothing.
- While the server draws the browser's parts of a page it reads from that same set (`forBrowserParts` in
  `runtime.ts`). So the page the server sends and the page the browser makes of it are built from the same
  words, and a sentence the list left out is English in both. It cannot make the two differ.
- In development the browser keeps a record of every sentence it asked for and was not given
  (`window.__ioLangMissed`). That is how a sentence the list left out is found.

What an English reader pays for all of this: the lookup code is part of the app's script, about 23 kB before
compression and 9 kB as sent (two thirds of it is the checks of `check.ts` and the unit words of ten languages,
which the browser runs on every entry it is given). No other request, no typeface, no database read.

## The files

```
translations/
  manifest.json                    every key the app asks for, with the mark of its English; and `client`
  hi/copy/today.json               one file for each language and each source file
  hi/data/guides/convergence.json
```

```json
{ "lang": "hi", "file": "copy/today", "entries": {
  "today.title": { "source": "7fca2ff1421477", "english": "Today", "text": "आज",
                   "status": "machine", "made": "2026-10-05 gemini-3.5-flash-lite" } } }
```

`status` is `machine` (a draft no person has read) or `reviewed`. A reviewed entry says who and when
(`"reviewed": "2026-10-12 by A. Sharma"`). A template carries the names of its placeholders (`"params": ["name"]`).
The app reads `source`, `text`, `status` and `params`, and nothing else.

`manifest.json` is written by `npx tsx scripts/i18n.ts count --write`. It decides three things: what the staff's
counts are counted against, which templates exist (a translation file cannot add one of its own), and what the
browser is given. `src/i18n/files.test.ts` fails when it is older than the words in the code.

## Staff: switching a language on

The Catalogue room (`/admin/catalogue`) has a Languages section, for a super admin and content staff. For each
language it shows how much is translated, how much a person has checked, how many drafts wait and how many
entries are of an older wording, and it sets the status:

| Status | Who is offered the language | What they see |
|---|---|---|
| Off | Nobody | English |
| In review | Staff only | Reviewed sentences in the language, everything else in English |
| On | Everyone | The same |

- Every change is written to the audit log (`admin.languages.status`, with what it was and what it became).
- A language cannot be switched on while no sentence of it has been checked by a person.
- **Urdu cannot be switched on yet.** It can be put in review. See "Right to left".
- Switching a language off takes effect at each family's next page: they are back in English, and their
  household keeps its choice for the day the language is switched on again.

The usual order: put the language in review, read the app in it as staff (the language menu then offers it to
staff), and switch it on when the screens a family meets first are reviewed.

## How a reviewer works

A reviewer is a person who reads the language as their own, and ideally knows how eye care is spoken about in
it. No part of a language is shown to a family before such a person has read it.

1. The reviewer is given a sheet (a CSV file every spreadsheet opens): one row for each sentence, with where it
   is from, the English, the draft, and what the machine noticed about it.
2. For each row they write "ok", or the corrected sentence. A row left alone stays a draft.
3. The returned sheet is taken in by the pipeline. Every row is checked again against the English as it is now;
   a row that changes a number, a unit, a placeholder or a name is not taken, and the reviewer is told which and
   why. The rows taken become `reviewed`, with the reviewer's name and the day.
4. The files are committed and released. The tests of this repository read every entry again.

The sheet and the import are part of the translation pipeline, which is not in this repository. Without it, a
translation file can be edited by hand in the format above; the same tests apply.

When the English of a sentence is edited, its translations stop being used that day (the mark no longer
matches) and are counted as "of an older wording" until they are drafted and reviewed again.

## How to add a language

1. Add it to `LANGS` and `LANGUAGE` in `src/i18n/languages.ts` (tag, own name, direction, script), and a
   typeface list for its script in `src/i18n/languages.css` if the script is new.
2. Add its words for each unit to `src/i18n/units.ts`. The tests insist on a word for every unit, and that no
   word serves two units of time.
3. Agree the fixed terms with its reviewer and add them to `src/i18n/terms.ts` ("weaker eye", "stronger eye",
   "check-up" and the rest). Until then the pipeline asks the translator to be consistent and checks nothing.
4. Put files under `translations/<language>/` and run `npx tsx scripts/i18n.ts check --lang <language>`.
5. Staff put it in review, then on.

## What is not translated, and why

| What | Why |
|---|---|
| The letters of a check-up: the tumbling E, letter pairs, the reading passages of the drills, the word on the Lifesaver card | They are the measurement. Their size and shape are the test; another script is another test, to be designed and checked on its own |
| The names of games and exercises, and `Eyes Opener` | A name is how a family, a counsellor and the research library find the same thing. It stays in English letters in every language |
| Citations and the titles of papers | They are quoted as published |
| Names of people and households, and what members write (notes, ideas, messages) | They are the member's own words |
| Dates, weekday names and numbers | Written with `Intl` for `en-IN`, in the digits 0 to 9 |
| The audit log and the notes of scheduled jobs | Written in English for everyone on the staff |
| The drawings of cue pictures and therapy scenes | A left and a right there mean an eye |

Words drawn inside a game scene (the score line, "It split") **are** translated, with a limit on their length;
the game kit shrinks a line that is still too long.

## Right to left

Urdu is written from right to left. What is done: `<html dir="rtl">`, the shared layout turned round
(`src/i18n/languages.css`: the shell, cards, tables, lists), therapy scenes, check-up charts and cue pictures
kept left to right, a number held together with its unit ("40 cm" is never drawn "cm 40"), and an English
sentence shown inside an Urdu page kept in its own order (`forDirection` in `runtime.ts`).

What is not done, seen on 5 October 2026 with a hand-written sample: the line charts of the check-up pages (axis
labels overlap and a date reads "Aug 31"), the breadcrumb of a game's page, and every screen's own styles that
say "left" or "right". Nobody who reads Urdu has looked at it.

So Urdu is held: `HELD_AT_REVIEW` in `src/i18n/languages.ts`. Staff can put it in review and read the app in it;
it cannot be switched on for families, and a stored "on" counts as "in review". Taking Urdu out of that list is
the whole change needed once a right-to-left pass is done.

The rules in `languages.css` that undo a rule of `src/app/globals.css` each name the rule they undo. They belong
in `globals.css` itself, as logical properties (`margin-inline-start` for `margin-left`); they are in a separate
sheet because `globals.css` is a shared file.

## Typefaces

The app's Latin face, Outfit, has no Indian script. Letters of another script are drawn with a face the device
already has: `languages.css` names, for each script, the faces that desktop Linux, Windows and Apple devices
carry, and then lets the device choose. Nothing is downloaded for them. Line heights are opened up for scripts
with marks above and below the line, letter-spacing and capitals are switched off outside Latin.

`LOAD_WEB_FONTS` in `src/i18n/languages.ts` would load Google's Noto face for the page's script instead. It is
off, and that path has never been looked at.

## Search engines and sharing

One address serves a page in every language; which one is the reader's cookie. A search engine sends no cookie,
so it reads and lists the English page, and there is one address for each page, so nothing is listed twice
(each public page names itself as canonical). `<html lang>` and `dir` say what the page is in. `/lang/*` is
closed to search engines.

The price of this: a translated page cannot be found by a search in that language, and a shared link opens in the
language of whoever opens it. Giving each language its own addresses (`/hi/...`, with links between the
versions) is a larger change, to be made if being found in Hindi matters.

A page's answer depends on a cookie, so no page may be given a public cache lifetime. Reading the header in the
root layout makes every page drawn on request; none is built ahead of time in one language.

## Commands

```bash
npx tsx scripts/i18n.ts count [--lang hi] [--write]   # how much there is, how far each language is; --write renews manifest.json
npx tsx scripts/i18n.ts check [--lang hi]             # every entry against the English as it is now
npx tsx scripts/i18n.ts scan                          # words read too early, compared against, or stored
npx tsx scripts/i18n.ts wrap [--write]                # put a new file of words inside texts(...)
npx tsx scripts/i18n.ts metadata [--write]            # turn a page's fixed title into one read for each request
npx vitest run src/i18n                               # every rule on this page
```

To look at machine drafts while developing: `/lang/dev-drafts?lang=hi&next=/today`, and `/lang/dev-drafts?off`
to stop. The page says on screen that drafts are shown. In production that address answers "not found" and the
switch is ignored everywhere.

| When this fails | Do this |
|---|---|
| `files.test.ts`: the list is older than the words | `npx tsx scripts/i18n.ts count --write` |
| `files.test.ts`: an entry breaks a rule | Fix the entry, or remove it; the message names it |
| `captures.test.ts`: a word read while a module loads | Read it inside the function that draws |
| `captures.test.ts`: a file of words not made with `texts` | `npx tsx scripts/i18n.ts wrap --write` |
| `next.test.ts` after an upgrade of Next.js | Read "The one place that reaches inside Next.js" and fix `runtime.ts` before releasing |

## Limits

- **A release must carry `translations/`.** The app reads the folder beside itself at run time. A container that
  holds only the built server has no translations and shows English everywhere; the Languages section then says
  the list is missing.
- **Words written straight into a page are not reached.** Everything in `src/copy` and the files above is; a
  string typed into a page or a component stays English in every language. A sweep of 22 pages with a pretend
  translation found about a fifth of the letters outside the mechanism: names, dates and numbers, pages that
  still read the catalogue directly (`game.purpose` instead of `gameWords(game).purpose`), community ideas, and
  hard-coded strings. Pages that read catalogue words for each request so far: Today, Train, the games and
  exercises lists and pages, a game's play page and manual, the check-up pages, Settings, Experiments.
- **Forty copy functions cannot be templates** because their wording depends on their values in a way a
  template cannot hold (`npx tsx scripts/i18n.ts count` lists how many). They show English. Among them are lines a
  member reads, such as the stop line of the check-up summary. Rewriting each as a plain sentence around its
  values brings it in.
- **The labels of the staff's activity list** are keyed by action names with dots in them and are not covered.
- **A household has one language.** Two guardians cannot read in two languages.
- **While a release is rolling out**, a page drawn by the new server can be given the old server's words for a
  moment. The browser then shows the words it was given and does not keep that file; the next page is right.
- **Statuses are kept in memory for half a minute** on each server, so a change by staff reaches every server
  within that time.
- **Cookies.** The language is carried in the entries `io_lang`, `io_lang_pass` and `io_lang_synced` of the one cookie
  `__session`, the only name Firebase Hosting passes on. `io_lang` is also written as a plain cookie of that name,
  because the page's own script compares it (`src/i18n/watch.tsx`); the server never relies on that copy.
- **Counting forms.** A sentence has one form for a number, with separate forms for 0 and 1 where the English has
  them. A language that needs more forms than that writes around it.
