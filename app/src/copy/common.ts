/** Words shared by every screen. Each area keeps its own file in this folder. */
import { texts } from "@/i18n/texts";

export const common = texts("copy/common", "common", () => ({
  product: "IOpener",
  tagline: "Eye care you can do at home, built on published research.",
  nav: {
    track: "Track", test: "Test", train: "Train", together: "Together",
    today: "Today", checkups: "Check-ups", games: "Games", exercises: "Exercises", cinema: "Two-eye cinema",
    community: "Community", league: "League", settings: "Settings", onboarding: "Onboarding",
    family: "Family", circle: "Cheer seat", admin: "Admin console", counsellor: "Counsellor portal", sponsor: "Sponsor portal",
    switchPerson: "Sign in as someone else", childMode: "Child mode", leaveChildMode: "Child mode · grown-up? Tap to leave", grownUp: "Grown-up",
    you: "You", otherAreas: "Your other areas",
  },
  notMedical: "IOpener is not a medical device. It does not diagnose, treat or cure any condition.",
  tester: "Staff test household. Every game, exercise and film opens here whatever its status, and the daily limits are off. Nothing here is counted with families.",
  testerLink: "Set the status of each item",
  lens: {
    label: "Check the scene without glasses",
    none: "As on screen", weak: "Weaker eye sees", strong: "Stronger eye sees", joined: "Eyes joined",
    note: {
      weak: "This is what the eye behind the cyan lens gets. It is for checking. To play, choose \"As on screen\" and put the glasses on.",
      strong: "This is what the eye behind the red lens gets, at your setting. It is for checking. To play, choose \"As on screen\" and put the glasses on.",
      joined: "Practice view for when you have no glasses: the two pictures are drawn as one, the way joined eyes see them. Nothing is trained in this view.",
    },
  },
  gameScene: "Game scene. Tap or click in it, or use the arrow keys and Space. The words under the scene say how to play.",
  demo: "Demo family",
}));
