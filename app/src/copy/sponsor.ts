/** Words for the sponsor portal. */
import { SPONSOR_MIN_GROUP } from "@/lib/roles";
import { texts } from "@/i18n/texts";

export const day = (d: Date) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: "Asia/Kolkata" }).format(d);

export const sponsor = texts("copy/sponsor", "sponsor", () => ({
  area: "Sponsor portal",
  role: { owner: "Owner", editor: "Editor" },
  nav: { title: "Your organisation", overview: "Overview", groups: "Groups", glasses: "Glasses", team: "Team", other: "Your other areas", family: "Family app", admin: "Admin console", counsellor: "Counsellor portal" },
  status: { pending: "Waiting for the Eyes Opener team", approved: "Approved", suspended: "Paused" },

  /** Shown wherever a count would cover too few households to be safe to show. */
  few: {
    title: "Not enough families yet",
    body: `Numbers show once ${SPONSOR_MIN_GROUP} households have joined. Smaller counts stay hidden so that no family can be picked out.`,
  },

  home: {
    sub: "Counts for your groups. You never see a family's name, results or sessions.",
    waiting: {
      title: "Waiting for the Eyes Opener team",
      body: "The Eyes Opener team is checking your organisation. When it is approved, your groups and numbers show here. You do not need to do anything.",
    },
    families: {
      title: "Families in your groups",
      joined: "households joined",
      active: "Households active in the last 7 days",
      activeHint: "Active means someone in the household practised, took a screen break or logged outdoor time.",
      steady: "Households that practised on 4 or more of the last 7 days",
      days: "Practice days in the last 7 days",
      daysHint: "Each day a household practised counts once.",
      of: (n: number, total: number) => `${n} of ${total}`,
      groups: "See your groups",
    },
    glasses: {
      title: "Glasses you donated",
      pairs: "Pairs donated",
      finished: "Journeys finished with those pairs",
      hint: "A journey is one child wearing a pair to the end of the programme.",
      link: "See your pairs",
    },
  },

  groups: {
    title: "Groups",
    sub: "A group is a join code you give to families. A family types the code to join.",
    list: "Your groups",
    none: { title: "No groups yet", body: "Open a group and share its code with your families." },
    code: "Join code",
    line: (opened: string) => `Opened on ${opened}`,
    households: (n: number) => (n === 1 ? "1 household joined" : `${n} households joined`),
    open: "Open",
    closed: "Closed",
    closedNote: "A closed group takes no new families. Families already in it stay.",
    close: "Close",
    reopen: "Open again",
    closeOf: (name: string) => `Close the group ${name}`,
    reopenOf: (name: string) => `Open the group ${name} again`,
    create: {
      title: "Open a new group",
      name: "Group name",
      hint: "For example a class, a camp or a year.",
      go: "Open group",
      done: (code: string) => `Group opened. Its join code is ${code}.`,
      invalid: "Give the group a name of 2 to 60 letters.",
      failed: "The group could not be opened. Try again.",
    },
  },

  glasses: {
    title: "Glasses",
    sub: "Pairs of red and cyan glasses you donated. Each pair travels from child to child.",
    list: "Your pairs",
    none: { title: "No pairs yet", body: "Register a pair with the code printed on it." },
    code: "Pair code",
    worn: (n: number) => (n === 0 ? "No child has worn it yet" : n === 1 ? "1 child has worn it" : `${n} children have worn it`),
    status: { new: "Not given out yet", wearing: "Being worn now", passed_on: "Waiting for the next child", finished: "Journey finished" } as Record<string, string>,
    register: {
      title: "Register a new pair",
      code: "Code on the pair",
      hint: "4 to 8 letters or digits.",
      go: "Register pair",
      result: { done: "Pair registered.", invalid: "The code must be 4 to 8 letters or digits.", taken: "A pair with this code is already registered." },
    },
  },

  team: {
    title: "Team",
    sub: "People who can use this portal for your organisation. Owners manage the team. Editors manage groups and glasses.",
    list: "People on the team",
    you: "You",
    lastOwner: "The only owner. Add another owner before changing this.",
    makeOwner: "Make owner",
    makeEditor: "Make editor",
    remove: "Remove",
    makeOwnerOf: (name: string) => `Make ${name} an owner`,
    makeEditorOf: (name: string) => `Make ${name} an editor`,
    removeOf: (name: string) => `Remove ${name} from the team`,
    result: { done: "Saved.", last_owner: "A team needs at least one owner.", not_found: "This person is not on the team." },
    add: {
      title: "Add a person",
      about: "The person must already have signed in to Eyes Opener once.",
      email: "Their email",
      role: "Role",
      go: "Add to team",
      result: { done: "Added to the team.", invalid: "Type a full email address.", not_found: "No Eyes Opener person has this email.", already: "This person is already on the team." },
    },
  },
}));
