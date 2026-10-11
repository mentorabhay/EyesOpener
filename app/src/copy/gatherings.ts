// Eyes Opener: Words for the one staff page the four gatherings share (Lights On Hour, Cinema Club, Class Mission, Wish Jam).
/**
 * Words for the one staff page the four gatherings share (Lights On Hour, Cinema Club, Class Mission, Wish Jam).
 * It is kept in the moderation room. Each idea's own words are in its own file.
 */
import { texts } from "@/i18n/texts";

export const gatherings = texts("copy/gatherings", "gatherings", () => ({
  staff: {
    link: "Gatherings: the hour, clubs and wishes",
    title: "Gatherings",
    sub: "Set the Lights On Hour, keep the list of Cinema Clubs, and move Wish Jam wishes on.",
    back: "Moderation",
    stats: { clubs: "Clubs listed", wishes: "Wishes on the list", waiting: "Waiting in the moderation room" },
    mission: {
      title: "Class Mission",
      body: "There is nothing for staff to do here. A guardian gives a child the mission, and the app keeps only that and the day it was run. No staff page shows who has one.",
    },
  },
}));
