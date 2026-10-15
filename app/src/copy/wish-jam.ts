/**
 * Words for Wish Jam: a guardian writes down what a child wishes a game were about, builders read the wishes on a
 * public list, and the child names the game that gets built.
 * The public list never holds a family name, a school, a city or a picture, and no line here asks for one.
 * Nothing here promises that a wish will be built, or that a game will help anyone's eyes.
 */
import type { AgeBand, GameKind, Love, NameStatus, Play, PublicState, StaffStep, TextProblem, WishRefusal, WishStatus } from "@/lib/wish-jam";
import { texts } from "@/i18n/texts";

const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;

export const wishJam = texts("copy/wish-jam", "wishJam", () => ({
  stats: { listed: "Wishes on the list", built: "Wishes built so far" },

  /** What the child loves. Keys: LOVES in src/lib/wish-jam.ts. */
  loves: {
    trains: "Trains", animals: "Animals", dinosaurs: "Dinosaurs", space: "Space and rockets", sea: "The sea and fish", cricket: "Cricket",
    football: "Football", cars: "Cars and trucks", music: "Music", dance: "Dance", cooking: "Cooking", gardens: "Gardens and flowers",
    birds: "Birds", robots: "Robots", stories: "Stories and fairy tales", festivals: "Festivals and lights",
  } satisfies Record<Love, string>,
  /** What the child likes to do in a game. */
  plays: {
    catch: "Catching things", steer: "Steering something", find: "Finding hidden things", match: "Matching pairs", build: "Building something", race: "Racing",
  } satisfies Record<Play, string>,
  /** The kind of game, by the families of the open game kit. */
  games: {
    any: "Any kind: the builder chooses",
    two_eye: "A two-eye game, played with red-cyan glasses",
    pull_in: "A game for pulling the eyes together, with red-cyan glasses",
    depth: "A depth game, with red-cyan glasses",
    no_glasses: "A game with no glasses: following and jumping with the eyes",
  } satisfies Record<GameKind, string>,
  band: (b: AgeBand) => `Ages ${b}`,

  how: {
    title: "How a wish becomes a game",
    steps: [
      { b: "You write the wish.", t: "Choose what your child loves from the lists and add one short line." },
      { b: "A person at Eyes Opener reads it.", t: "Nobody outside your family sees it before that." },
      { b: "It goes on the wish list.", t: "Developers and students read the list and pick a wish to build." },
      { b: "A builder makes the game.", t: "They work with the Eyes Opener team, never with your family. Nobody is given a way to reach you." },
      { b: "Your child tries it and names it.", t: "The team adds the game to the library once it meets the rules. Then your child gives it its name." },
    ],
    noPromise: "A wish may wait a long time, and some are never built. A built game is a game like any other in the library: nobody can promise what it does for anyone's eyes.",
    listLink: "See the public wish list",
  },

  form: {
    title: "Write a wish",
    child: "Whose wish is it?",
    loves: "What does your child love?",
    play: "What do they like to do in a game?",
    game: "What kind of game?",
    gameHint: "If you are not sure, leave it on \"Any kind\".",
    line: "One short line, if you like",
    lineHint: (max: number) => `Such as "Trains instead of blocks, with a station to stop at." Up to ${max} letters. No names, no school, no city.`,
    firstName: (name: string) => `Show the first name "${name}" beside the wish`,
    firstNameOne: "Show the child's first name beside the wish",
    firstNameHint: "Leave this off and the list says only \"a child\". A family name is never shown.",
    public: {
      title: "What the public list will show",
      points: [
        "The choices above, your short line, and an age band such as \"ages 4 to 6\".",
        "The first name, only if you tick the box.",
        "A short code, so a builder can say which wish they mean.",
      ],
      never: "It never shows a family name, a school, a city or a picture. This form has no place for them.",
    },
    submit: "Send the wish for review",
    saved: "The wish is waiting for a person at Eyes Opener. It goes on the list once they have read it.",
    noChild: "Every child of the household already has a wish on its way, or has no consent in place.",
    lookOnly: "Only a parent or guardian can write a wish, take it back or name the game.",
    tester: "A staff test household cannot make a wish, so the list holds members' wishes only.",
    blocked: "This wish cannot be sent because it could hurt someone. Nothing was saved.",
  },

  own: {
    title: (name: string) => `${name}'s wish`,
    status: {
      in_review: "Waiting for a person at Eyes Opener",
      listed: "On the wish list",
      matched: "A builder is working on it",
      built: "Built",
      blocked: "Not on the list",
    } satisfies Record<WishStatus, string>,
    next: {
      in_review: "Nobody outside your family can see it yet.",
      listed: "It is on the public list, waiting for a builder.",
      matched: "A builder has taken this wish on. Building a game takes time.",
      built: "The game exists. Your child can give it a name.",
      blocked: "This wish was not put on the list, or was taken off it. You can write another.",
    } satisfies Record<WishStatus, string>,
    code: (code: string) => `Wish ${code}`,
    sentOn: (day: string) => `Written on ${day}.`,
    shows: { loves: "Loves", play: "Likes to", game: "Kind of game", line: "In your words", who: "Shown as" },
    child: "A child",
    hidden: "Consent for this child is not in place, so the wish is off the public list until it is.",
    play: (game: string) => `Play ${game}`,
    checking: "The Eyes Opener team is still checking the game. It appears in the library after that.",
    back: {
      open: "Take the wish back",
      warn: "The wish is deleted and leaves the public list at once. If a builder has started, their work is not undone.",
      submit: "Take it back",
      saved: "The wish was taken back and deleted.",
    },
    earlier: "Earlier wishes",
    none: { title: "No wish yet", body: "A wish says what your child would love a game to be about." },
  },

  name: {
    title: "Name the game",
    lead: (child: string) => `${child} gives the game its name. What do they want to call it?`,
    field: "The game's name",
    hint: (max: number) => `A few words, up to ${max} letters. Not a person's name.`,
    submit: "Send the name for review",
    saved: "The name is waiting for a person at Eyes Opener.",
    status: {
      in_review: "The name is waiting for a person at Eyes Opener",
      approved: "Named",
      blocked: "That name could not be used. Offer another.",
    } satisfies Record<NameStatus, string>,
    named: (name: string) => `The game is called "${name}".`,
    waiting: (name: string) => `"${name}" is waiting for a person at Eyes Opener.`,
    blocked: "This name cannot be sent because it could hurt someone. Nothing was saved.",
  },

  /** What a child sees on a device in child mode. */
  mine: {
    title: "Your wish",
    none: { title: "Nothing here yet", body: "Ask a grown-up at home about this page." },
    lookOnly: "A grown-up at home writes the wish and types the name you choose.",
    next: {
      in_review: "A person at Eyes Opener is reading your wish.",
      listed: "Your wish is on the list. It is waiting for someone to build it.",
      matched: "Someone is building your game. That takes time.",
      built: "Your game is built. Think of a name for it, and tell a grown-up at home.",
      blocked: "This wish is not on the list.",
    } satisfies Record<WishStatus, string>,
  },

  problems: {
    length: "That is too long, or too short.",
    contact: "Leave out phone numbers, email addresses and links.",
    name: "Leave out your child's name and your family's name.",
    place: "Leave out the school and the class.",
    promise: "Leave out words such as cure. A game cannot promise that.",
    shape: "Use letters, digits and spaces only, and four words at most.",
  } satisfies Record<TextProblem, string>,

  refused: {
    not_allowed: "Only a parent or guardian can do this.",
    tester: "A staff test household cannot make a wish.",
    not_found: "That is not there any more.",
    not_child: "A wish is for a child of the household.",
    too_young: "Games on a screen start at age 4, so a wish for a game does too.",
    needs_consent: "A parent or guardian's consent for this child is not in place.",
    already: "This child already has a wish on its way. One at a time.",
    bad_choice: "Choose each answer from its list.",
    not_built: "The game is not built yet.",
    waiting: "A name is already waiting for a person at Eyes Opener.",
    named: "The game already has its name.",
  } satisfies Record<WishRefusal, string>,

  /* ───────────── the public page ───────────── */
  site: {
    meta: { title: "Wish Jam", description: "Build a game for one child's wish. Read the wishes families have shared, the rules of the open game kit, and how to take part." },
    hero: {
      kicker: "Wish Jam",
      title: "Build a game for one child's wish",
      lead: "Families write down what their child would love a game to be about. Developers and students pick a wish and build it with Eyes Opener's open game kit. The child tries the game and gives it its name.",
      cta: "Write to us about a wish",
      toList: "Read the wishes",
    },
    list: {
      kicker: "The wishes",
      title: "Every entry has a first player waiting",
      lead: "In the order they were approved. Nobody ranks them.",
      none: { title: "No wish is on the list yet", body: "Wishes appear here once a family has written one and a person at Eyes Opener has read it." },
      from: (name: string | null) => (name ? `${name}'s wish` : "A child's wish"),
      loves: "Loves",
      play: "Likes to",
      game: "Kind of game",
      code: (code: string) => `Wish ${code}`,
      state: {
        waiting: "Waiting for a builder", matched: "A builder is working on it", built: "Built", named: "Built and named",
      } satisfies Record<PublicState, string>,
      named: (name: string) => `The child named the game "${name}".`,
      sample: "Sample: not a real wish",
      count: (n: number) => many(n, "wish", "wishes"),
    },
    steps: {
      kicker: "Taking part",
      title: "From a wish to a game in five steps",
      items: [
        { title: "Pick a wish", body: "Note its code. One builder or one team for a wish." },
        { title: "Write to us", body: "Use the form below and put the code in your message. The team answers by email." },
        { title: "Build with the kit", body: "A game is one plain file on Eyes Opener's game kit. The kit handles the glasses, the contrast, the clock and the stop button." },
        { title: "The team checks it", body: "Every game is checked against the kit's rules. One that meets them is added to the library by the team." },
        { title: "The child names it", body: "The family tries the game, and the child gives it its name. We tell you what they chose." },
      ],
    },
    rules: {
      kicker: "The game kit",
      title: "The kit's rules, in short",
      lead: "A game that breaks one of these is not added. They are there because the players are children and people in treatment.",
      items: [
        { b: "Three inks only.", t: "One ink reaches the weaker eye, one the stronger eye, and one both. A game never sets a colour or a contrast itself." },
        { b: "The ink carries the task.", t: "In a two-eye game the thing to find or steer is in the weaker eye's ink, so the game cannot be scored with one eye alone." },
        { b: "Nothing flashes.", t: "Nothing switches on and off or swaps colours more than twice a second. No strobing and no reversing patterns." },
        { b: "A game never ends a session.", t: "No game over, no lives, no countdown to a failure. A miss is quiet and the level eases. The app owns the clock and the stop button." },
        { b: "Touch, and four arrows with OK.", t: "Every game is fully playable by touch and fully playable with a TV remote." },
        { b: "Difficulty follows the player.", t: "Levels change speed, number or spacing. They never change contrast." },
        { b: "One plain file.", t: "No pictures, no sound files, no timers and no chance of its own: the kit gives the game its time and its chance." },
        { b: "Plain words, honest claims.", t: "No emoji, and no line that says a game will fix anyone's eyes." },
      ],
      where: "The full rules are in the file docs/CONTRACT.md of Eyes Opener's open-source core, under \"Addendum: games (the kit)\".",
      get: "Write to us below and the team will tell you how to get the code.",
    },
    never: {
      kicker: "The family",
      title: "What a builder is never given",
      items: [
        "A family name, a school, a city or a picture. A wish does not hold them.",
        "A way to reach the family. Messages go through the Eyes Opener team, in both directions.",
        "Anything about the child's eyes. The wish says what kind of game is wanted, and nothing else.",
      ],
      adults: (age: number) => `The form is for adults. A student under ${age} takes part through a teacher or a parent, who writes in for the team.`,
      noPromise: "Building a game is no promise that it will be added to the library, and the team makes no promise about what any game does for anyone's eyes.",
    },
  },

  /* ───────────── the staff side, in the moderation room ───────────── */
  staff: {
    title: "Wish Jam",
    intro: "A new wish, and a name for a game, wait in the moderation room. Here you move an approved wish on. Builders write in through the Enquiries room: look for \"Wish Jam builder\".",
    cols: { wish: "Wish", from: "From", status: "Status", action: "Next step" },
    none: "No wish has been approved yet.",
    household: "Household",
    step: { match: "A builder has taken it on", unmatch: "The builder has stopped", built: "The game is built", unlist: "Take off the list" } satisfies Record<StaffStep, string>,
    stepOf: (step: string, code: string) => `${step}: wish ${code}`,
    unlistWarn: "The wish leaves the public list at once. The family sees that it is no longer listed.",
    unlistYes: "Yes, take it off",
    slug: "Library game (optional)",
    slugHint: "Only a game that is already in the library. Marking a wish as built adds no game: a game is added by the normal route.",
    slugNone: "Not in the library yet",
    tie: "Tie to this game",
    tied: (game: string) => `Tied to ${game}`,
    named: (name: string) => `Named "${name}"`,
    nameWaiting: (name: string) => `Name waiting for review: "${name}"`,
    saved: "Saved.",
    refused: "That step cannot be taken from where the wish stands now.",
    badGame: "That game is not in the library.",
    review: {
      wish: "Wish Jam wish",
      name: "Name for a Wish Jam game",
      by: "Household",
      child: "Child's first name, if shown",
      notShown: "Not shown",
      band: "Age band",
      unknownBand: "Not known",
      line: "Their short line",
      noLine: "No line",
      gameName: "The name offered",
      forWish: "For wish",
      check: "Before you approve: no family name, no school, no city, nothing that could point to this child.",
      note: "Approving puts it where people outside the household can read it. Removing keeps it inside the household.",
    },
  },
}));
