// Eyes Opener: Words for Cinema Club: the host kit (a guide and a session sheet to print, and the group screen), the honest.
/**
 * Words for Cinema Club: the host kit (a guide and a session sheet to print, and the group screen), the honest
 * limits of a shared screen, and the list of clubs.
 * A club night is company. No line here calls it practice or treatment, promises a result, or asks a host to
 * judge a child's eyes. A club keeps no list of children: the sheet is paper and has no place for a name.
 */
import type { ClubStatus, ListingRefusal, PlaceKind } from "@/lib/cinema-club";
import { texts } from "@/i18n/texts";

const many = (n: number, one: string, more: string) => `${n} ${n === 1 ? one : more}`;
export const CLUB_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

/** The numbers the kit prints. They come from the cinema's own rules (src/components/film/chapters.ts, src/lib/cinema-club.ts). */
export interface KitNumbers { chapters: number; chapterMinutes: number; breakSeconds: number; filmMinutes: number; breakMetres: number; dayCap: number }

export const cinemaClub = texts("copy/cinema-club", "cinemaClub", () => ({
  nav: "Cinema Club",
  stats: { clubs: "Clubs listed", film: "Minutes of film in one club hour" },

  about: {
    title: "What a club night is",
    points: [
      "A volunteer shows a film once a week at a school, a library, a community hall or a clinic.",
      "One screen, a box of red-cyan glasses, and families who come with their children.",
      "Children who have no TV at home can take part, and families meet in person.",
    ],
    notTitle: "What it is not",
    not: [
      "It is not anyone's practice. A club hour uses none of a child's daily minutes and is not written to any record.",
      "It is not a clinic. Nobody is checked, measured or advised there.",
      "It keeps no list. IOpener does not know who came to a club.",
    ],
  },

  kit: {
    title: "The host kit",
    lead: "Everything a volunteer needs to host one evening.",
    guide: { name: "Host guide", what: "What you need, how to set up the screen, the glasses, and what a host never does. To print." },
    sheet: { name: "Session sheet", what: "One page to tick off on the evening. To print." },
    screen: { name: "Group screen", what: "Plays your film for a room: chapters, eye breaks, and a stop after one hour." },
    open: "Open",
    guardiansOnly: "The host kit opens for a parent or guardian. Hosting is a grown-up's job.",
    back: "Cinema Club",
    print: "Print",
    printHint: "Use A4 paper. Colour is not needed.",
  },

  /* ───────────── the honest limits ───────────── */
  limits: {
    title: "What a shared screen cannot do",
    lead: "Read this before you host. It is the most important part of the kit.",
    points: (n: KitNumbers) => [
      { b: "At home, the film is set for one child.", t: "The two-eye cinema dims the picture for the stronger eye. How much comes from that child's own check-up, on their own measured screen, from their own seat." },
      { b: "A room has many children.", t: "Each has a different setting. Some have a weaker left eye, some a weaker right eye, and some have no weaker eye at all. One screen cannot be right for all of them." },
      { b: "So the group screen dims nothing.", t: "It shows the same full picture to both eyes. This is the setting the app uses for anyone whose eyes it has not measured." },
      { b: "That makes the club hour company, not practice.", t: "It does not train anyone's eyes, it does not count as anyone's daily minutes, and nothing about it is saved. No trial has tested a group film hour: the trials tested one child at their own setting." },
      { b: "A child's own practice stays their own.", t: `It happens at home, at their own setting, inside their family's plan. A family that practises on a club day keeps the day's two-eye practice within its plan, and never over ${n.dayCap} minutes.` },
      { b: "Nobody needs the glasses to see the film.", t: "At this setting the whole film is there for both eyes, with the glasses or without. They are offered so that every child in the room wears the same thing." },
    ],
    own: {
      title: "If a family wants their child's own practice on the club's screen",
      body: "They can use the screen before or after the film. A parent or guardian signs in to their own family's account, and the child's own setting is used. Only that child wears glasses for it. The host does not sign in for them, does not start it for them and does not change any setting.",
    },
  },

  /* ───────────── the host guide ───────────── */
  guide: {
    title: "Cinema Club host guide",
    sub: "For the volunteer who hosts. Read all of it once, and keep the session sheet beside you on the evening.",
    sections: (n: KitNumbers) => [
      {
        id: "need", title: "1. What you need",
        items: [
          "A room in a public place: a school, a library, a community hall or a clinic. Never a private home.",
          "The say-so of whoever runs the place.",
          "A second grown-up in the room for the whole evening. A host is never alone with a child.",
          "Every child comes with a parent or guardian, who stays in the building.",
          "One screen that everyone can see, and a laptop, tablet or phone that can show IOpener on it.",
          "Red-cyan glasses for everyone who wants a pair, and a few spare. Clean wipes, or soap and water.",
          "A film you are allowed to show to a group, saved on the device. The film stays on your device: IOpener sends it nowhere.",
          "The session sheet, printed.",
        ],
      },
      {
        id: "film", title: "2. Choose the film",
        items: [
          "Show only a film you have the right to show to a group. A film bought for watching at home may not be allowed. Ask the place: many schools and libraries know the rule.",
          "Choose a calm film that suits the youngest child in the room.",
          "IOpener cannot see what is in your film. Do not choose one with flashing lights or strobing scenes.",
          `The group screen stops after ${n.filmMinutes} minutes of film. Pick a film that length, or a place to stop.`,
        ],
      },
      {
        id: "screen", title: "3. Set up the screen",
        steps: [
          "Sign in to IOpener on your device. Open Cinema Club, then Group screen.",
          "Press \"Try with the test reel\" to check the picture and the sound. It lasts 90 seconds.",
          "Connect the device to the big screen. Press Full screen. The picture should fill the screen without being stretched.",
          "Put the seats two to three metres from a TV, square in front of it as far as the room allows. Nobody sits right under the screen.",
          "Leave some light on. The room should be dim, not dark.",
          "Choose your film and press Play.",
        ],
      },
      {
        id: "breaks", title: "4. Chapters and eye breaks",
        items: [
          `The screen plays the film in chapters of ${n.chapterMinutes} minutes. After each chapter it pauses by itself for an eye break of at least ${n.breakSeconds} seconds.`,
          `In a break everyone takes the glasses off and looks at something far away, ${n.breakMetres} metres or more: out of a window, or across the hall. Lead it out loud.`,
          "The film waits until the countdown ends. A break can be longer, never shorter.",
          `After ${many(n.chapters, "chapter", "chapters")} the screen stops. That is the club hour. Do not start it again the same evening.`,
          "A child may stop watching, rest or leave at any time. Nobody is asked to sit through it.",
        ],
      },
      {
        id: "glasses", title: "5. The glasses",
        items: [
          "A child who uses IOpener at home wears the glasses as at home: the cyan (blue-green) lens over the weaker eye. Their own grown-up knows which eye that is. You do not decide it, and you do not ask why.",
          "Everyone else can wear them either way round. On the group screen both ways show the whole film.",
          "A child who wears their own glasses keeps them on underneath.",
          "A child who wears a patch keeps it exactly as their eye doctor said. Never ask for it to come off or to be moved.",
          "Nobody has to wear the glasses. The film can be seen without them.",
        ],
      },
      {
        id: "clean", title: "6. Keeping the glasses clean",
        items: [
          "One pair for one person for the whole evening. Pairs are not passed from child to child during the film.",
          "Afterwards wipe every pair, lenses and frame, with a clean wipe or with soap and water. Let them dry before the box is closed.",
          "Cardboard glasses cannot be washed. Let each child keep their pair, or throw it away.",
          "A child with a red, sore or sticky eye does not use the club's glasses that evening. Tell their grown-up quietly. Do not say what it might be.",
        ],
      },
      {
        id: "unwell", title: "7. If a child feels unwell",
        lead: "Stop for that child at once if they say, or you see, any of these: double vision that stays, a headache, eye pain, feeling dizzy, feeling sick.",
        steps: [
          "Glasses off. The child stops watching and sits somewhere quiet with the lights on.",
          "Tell their parent or guardian straight away.",
          "The child does not go back to the film that evening.",
          "If it does not pass with rest, the family sees an eye doctor. For anything sudden or strong, they get medical help the same day.",
          "If more than one child feels unwell, stop the film for everyone.",
          "Tick the box on the session sheet. Write no name.",
        ],
        after: "A child who has fits set off by flashing lights comes only if their own doctor has agreed. That is the family's decision, not the host's.",
      },
      {
        id: "never", title: "8. What a host never does",
        items: [
          "Never says what is wrong with a child's eyes, and never says that a child's eyes are fine. A host cannot tell either.",
          "Never changes a patch, glasses or drops plan, and never gives advice about one. That belongs to the child's eye doctor.",
          "Never changes a setting in a family's account, and never starts a child's own practice for them.",
          "Never types a child's name into IOpener. A club has no list of children in the app, and the session sheet has no place for a name.",
          "Never takes photographs of the children, and never posts who came.",
          "Never is alone with a child.",
          "Never promises that the film will help anyone's eyes.",
          "Never asks for money. A club night is free, and nothing is sold at it.",
          "Never hosts in a private home.",
        ],
      },
    ],
    foot: "IOpener is not a medical device. A club night does not diagnose, treat or cure any condition, and it does not replace an eye exam or anything an eye doctor prescribed.",
  },

  /* ───────────── the session sheet ───────────── */
  sheet: {
    title: "Cinema Club session sheet",
    sub: "One sheet for one evening. Tick as you go.",
    noNames: "Write no child's name on this sheet.",
    fields: { place: "Place", date: "Date", host: "Host", second: "Second grown-up" },
    before: {
      title: "Before the film",
      items: (n: KitNumbers) => [
        "The place has agreed to the evening.",
        "Two grown-ups are in the room.",
        "The group screen was tried with the test reel: picture and sound are right.",
        "The film may be shown to a group, and has no flashing scenes.",
        "Seats are two to three metres from the screen. Some light is left on.",
        "The glasses are clean. Pairs in the box:",
        `Everyone was told: a break after each ${n.chapterMinutes} minutes, glasses off, look far away.`,
      ],
    },
    chapters: {
      title: "During the film",
      cols: { chapter: "Chapter", watched: "Watched", rest: "Eye break taken" },
      row: (i: number) => `Chapter ${i}`,
      lastBreak: "The hour ends here",
      note: (n: KitNumbers) => `The screen pauses by itself after each chapter of ${n.chapterMinutes} minutes, and stops after chapter ${n.chapters}.`,
    },
    after: {
      title: "After the film",
      items: [
        "Every pair of glasses was wiped and left to dry.",
        "Pairs back in the box:",
        "Nobody felt unwell.",
        "Someone felt unwell. They stopped watching and their grown-up was told.",
      ],
      count: "How many came (numbers only)",
      children: "Children",
      grownUps: "Grown-ups",
    },
    never: "A host never says what is wrong with a child's eyes, never changes a patch, glasses or drops plan, and never types a child's name into IOpener.",
  },

  /* ───────────── the group screen ───────────── */
  screen: {
    title: "Group screen",
    sub: "One film for a room. The same full picture goes to both eyes, in chapters with eye breaks.",
    region: "Group film player",
    notPractice: "This is not practice. Nothing here is saved, and it uses nobody's daily minutes.",
    setting: "Group setting: full picture for both eyes. No child's own setting is used.",
    choose: "Choose a film from this device",
    chooseAgain: "Choose another film",
    reel: "Try with the test reel",
    reelName: "IOpener's test reel",
    onDevice: "The film stays on this device. IOpener does not send it anywhere and does not keep its name.",
    none: "No film chosen yet.",
    notVideo: "That file is not a video. Choose a video file.",
    cannot: "This browser cannot play this film. Most browsers play films saved as MP4 or WebM.",
    play: "Play",
    pause: "Pause",
    full: "Full screen",
    leaveFull: "Leave full screen",
    picture: "The film for the room. Space or OK plays and pauses.",
    chapter: (i: number, of: number) => `Chapter ${i} of ${of}`,
    toBreak: (left: string) => `eye break in ${left}`,
    hourLeft: (left: string) => `${left} of the club hour left`,
    rest: {
      title: "Eye break",
      finished: (i: number) => `Chapter ${i} is finished.`,
      look: (metres: number) => `Everyone: glasses off. Look at something far away, ${metres} metres or more.`,
      countdown: "Break time left",
      seconds: (n: number) => many(n, "second", "seconds"),
      wait: "The film waits until the countdown ends.",
      over: "The break is over. Glasses back on for those who want them.",
      carryOn: "Carry on with the film",
      end: "End the evening here",
    },
    over: {
      title: "The club hour is over",
      body: (minutes: number) => `${minutes} minutes of film have been shown. The film stays stopped. Wipe the glasses and tick the session sheet.`,
      ended: "The evening was ended here. The film stays stopped.",
      again: "Start a new evening",
    },
    how: {
      title: "How the group screen works",
      lines: (n: KitNumbers) => [
        `The film plays in chapters of ${n.chapterMinutes} minutes.`,
        `After each chapter it pauses for an eye break of at least ${n.breakSeconds} seconds.`,
        `After ${many(n.chapters, "chapter", "chapters")} it stops: ${n.filmMinutes} minutes of film is one club hour.`,
        "The clock runs only while the film plays.",
      ],
    },
    unwell: "If a child feels unwell: glasses off, stop watching, tell their grown-up. The steps are in the host guide.",
  },

  /* ───────────── the list of clubs ───────────── */
  list: {
    title: "Clubs you can go to",
    none: { title: "No club is listed yet", body: "A club appears here when a sponsor or the IOpener team lists one." },
    when: (weekday: number, time: string) => `Every ${CLUB_WEEKDAYS[weekday]} at ${time}`,
    kind: { school: "School", library: "Library", community_hall: "Community hall", clinic: "Clinic" } satisfies Record<PlaceKind, string>,
    sample: "Sample: not a real club",
    rule: "A listing shows a place and a time, and nothing else. It is made by a sponsor or by the IOpener team, and a person at IOpener reads it first. A private home is never listed.",
    ask: "Ask at the place before you go: a club can miss a week. Every child comes with a parent or guardian.",
  },

  /* ───────────── a sponsor's own listings ───────────── */
  sponsor: {
    title: "Cinema Club",
    sub: "Host a weekly film hour at your school, library, hall or clinic, and list it so families can find it.",
    counts: "IOpener keeps no record of who comes to a club, so there are no numbers of families here. The paper session sheet is yours.",
    kitTitle: "The host kit",
    yours: "Your clubs",
    none: "You have not listed a club yet.",
    status: { in_review: "Waiting for a person at IOpener", listed: "Listed", removed: "Not listed", closed: "Closed" } satisfies Record<ClubStatus, string>,
    close: "Close this club",
    closeOf: (name: string) => `Close the club at ${name}`,
    closeWarn: "The club leaves the list at once. You can list it again later.",
    closeYes: "Yes, close it",
    add: {
      title: "List a club",
      kind: "Kind of place",
      name: "Name of the place, with its town",
      nameHint: "The name people know it by, such as \"Kothrud Public Library, Pune\". No street address, no phone number, and never a home.",
      weekday: "Day of the week",
      time: "Starts at (India time)",
      submit: "Send for review",
      saved: "Your club is waiting for a person at IOpener. It is listed once they have read it.",
      staffSaved: "The club is listed.",
      viewOnly: "Your sponsor is still waiting for approval, so it cannot list a club yet.",
    },
    refused: {
      not_approved: "Your sponsor has to be approved before it can list a club.",
      too_many: "You already have as many clubs listed or waiting as one sponsor can have. Close one first.",
      kind: "Choose the kind of place from the list.",
      day: "Choose a day of the week.",
      time: "Choose a starting time from the list.",
      length: "Type the name of the place with its town, between 6 and 80 letters.",
      home: "A club is never listed at a private home. Type the name of a public place: a school, a library, a hall or a clinic.",
      contact: "Leave out phone numbers, email addresses and links. A listing shows a place and a time only.",
      hazard: "This name cannot be listed because it could hurt someone. Nothing was saved.",
    } satisfies Record<ListingRefusal | "hazard", string>,
  },

  /* ───────────── the staff side, in the moderation room ───────────── */
  staff: {
    title: "Cinema Club listings",
    intro: "A listing a sponsor sends waits in the moderation room. A listing you add here is shown at once. Either way it is a public place and a time, never a home.",
    by: "Listed by",
    team: "The IOpener team",
    cols: { place: "Place", when: "When", by: "Listed by", status: "Status" },
    none: "No club has been listed yet.",
    remove: "Take off the list",
    removeOf: (name: string) => `Take the club at ${name} off the list`,
    removeWarn: "Families stop seeing this club at once. The sponsor is not sent a message.",
    removeYes: "Yes, take it off",
    review: {
      kind: "Cinema Club listing",
      place: "Place",
      placeKind: "Kind of place",
      when: "When",
      by: "Listed by",
      check: "Before you approve: is this a public place, not a home? Does the name carry no person's name, phone number or street address?",
      note: "Approving shows the club to families. Removing keeps it off the list.",
    },
  },
}));
