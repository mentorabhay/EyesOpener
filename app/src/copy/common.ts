/** Words shared by every screen. Each area keeps its own file in this folder. */
import { texts } from "@/i18n/texts";

export const common = texts("copy/common", "common", () => ({
  product: "Eyes Opener",
  tagline: "Eye care you can do at home, built on published research.",
  nav: {
    track: "Track", test: "Test", train: "Train", together: "Together",
    today: "Today", checkups: "Check-ups", games: "Games", exercises: "Exercises", cinema: "Two-eye cinema",
    community: "Community", league: "League", settings: "Settings", onboarding: "Setup",
    family: "Family", circle: "Cheer seat", admin: "Admin console", counsellor: "Counsellor portal", sponsor: "Sponsor portal",
    switchPerson: "Sign in as someone else", childMode: "Child mode", leaveChildMode: "Child mode · grown-up? Tap to leave", grownUp: "Grown-up",
    you: "You", otherAreas: "Your other areas", account: "Your account",
    menu: "Main menu", tabs: "Main", skip: "Skip to the page",
  },
  /** The frame around every signed-in page (src/components/shell): the top bar, the folding menu, search, the tabs and the footer. */
  shell: {
    collapse: "Fold the menu", expand: "Open the menu", home: "Back to Today",
    menu: {
      open: "Your account and profiles",
      using: "Using the app as",
      switchTo: (name: string) => `Switch to ${name}`,
      account: "Your account", family: "Family", settings: "Settings", signOut: "Sign out",
      child: (age: number | null) => (age === null ? "Child" : `Child, ${age}`),
      adult: "Grown-up",
    },
    theme: {
      label: "Light or dark",
      switchTo: { light: "Switch to light", dark: "Switch to dark" },
      names: { light: "Light", dark: "Dark", auto: "As this device" },
      hint: "Kept on this device. \"As this device\" follows the light or dark setting of your phone or computer.",
    },
    you: "Your settings",
    tabs: { today: "Today", checkups: "Check-ups", train: "Train", together: "Together", you: "You", kids: "Home", grownUp: "Grown-up" },
    search: {
      label: "Search", open: "Search", close: "Close search",
      placeholder: "Search games, exercises, check-ups and pages",
      short: "Search",
      none: (q: string) => `Nothing found for "${q}". Try fewer or other words.`,
      hint: "Type a few letters of a game, an exercise, a check-up or a page.",
      groups: { page: "Pages", game: "Games", exercise: "Exercises", checkup: "Check-ups" } as Record<string, string>,
    },
    footer: {
      copyright: (year: number) => `© ${year} Eyes Opener. All rights reserved.`,
      label: "About Eyes Opener",
      links: { privacy: "Privacy", terms: "Terms", children: "Children's data", safety: "Safety", evidence: "Evidence" },
    },
  },
  /** Words a screen reader says for shapes on the page. */
  spoken: {
    breadcrumb: "Where you are",
    filter: "Filter",
    notMeasured: "Not measured yet",
    notMeasuredOf: (label: string) => `${label}: not measured yet`,
    percentOf: (label: string, p: number) => `${label}: ${p} percent`,
    rings: (rest: number, train: number, light: number) => `Rest ${rest} percent, train ${train} percent, light ${light} percent`,
  },
  notMedical: "Eyes Opener is not a medical device. It does not diagnose, treat or cure any condition.",
  tester: "Staff test household. Every game, exercise and film opens here whatever its status, and the daily limits are off. Nothing here is counted with families.",
  testerLink: "Set the status of each item",
  lens: {
    label: "Check the scene without glasses",
    none: "As on screen", weak: "Weaker eye sees", strong: "Stronger eye sees", joined: "Eyes joined",
    note: {
      weak: "This is what the weaker eye gets through its lens. It is for checking. To play, choose \"As on screen\" and put the glasses on.",
      strong: "This is what the stronger eye gets through its lens, at your setting. It is for checking. To play, choose \"As on screen\" and put the glasses on.",
      joined: "Practice view for when you have no glasses: the two pictures are drawn as one, the way joined eyes see them. Nothing is trained in this view.",
    },
  },
  gameScene: "Game scene. Tap or click in it, or use the arrow keys and Space. The words under the scene say how to play.",
  demo: "Demo family",
}));
