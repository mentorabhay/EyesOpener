// Eyes Opener: Words for the show-up league.
/**
 * Words for the show-up league.
 * A league ranks teams only by showing up. Nothing here may praise a score, a speed or extra minutes,
 * and nothing may single out the team with the fewest days.
 */

/**
 * The only names a team can have. A team is never named by a member, and never after a person, a family or a place
 * a family could be found by. A league uses each name once.
 */
import { texts } from "@/i18n/texts";

export const TEAM_NAMES = [
  "Team Mango", "Starfish", "Kite Club", "Night Owls", "Kingfishers", "Fireflies", "Paper Boats", "Marigolds",
  "Peacocks", "River Otters", "Lanterns", "Blue Hills", "Sparrows", "Sea Turtles", "Jasmine", "Rainbows",
  "Banyan Tree", "Dragonflies", "Lotus Pond", "Morning Stars", "Monsoon Clouds", "Tamarind", "Coconut Grove", "Mountain Goats",
] as const;

const days = (n: number) => (n === 1 ? "1 day" : `${n} days`);

export const league = texts("copy/league", "league", () => ({
  title: "Show-up league",
  /** What counts as a day, in one plain sentence. */
  rule: "A day counts when the day's practice minutes are done. Scores, speed, levels and extra minutes never count.",
  /** The name stored with a league. The page shows the programme and the ages instead. */
  storedName: "Show-up league",

  bands: { "4 to 7": "ages 4 to 7", "8 to 12": "ages 8 to 12", "13 to 17": "ages 13 to 17", adults: "adults" } as Record<string, string>,
  leagueOf: (programme: string, band: string) => `${programme} league, ${band}`,

  table: {
    title: "This week's table",
    weekOf: (day: string) => `Week starting ${day}`,
    place: "Place",
    team: "Team",
    days: "Days finished",
    daysOf: (done: number, possible: number) => `${done} of ${possible}`,
    members: (n: number) => (n === 1 ? "1 member" : `${n} members`),
    yours: "Your team",
    yourPlace: "Your team's place",
    shared: "shared",
    tie: "Teams with the same number of days share a place.",
    empty: "No team has days to count yet",
    emptyWhy: "A new member's days start counting on a Monday. The table fills from then.",
  },

  team: {
    title: "Your team",
    ownDays: (name: string, n: number) => `${name} has finished ${days(n)} this week.`,
    startsOn: (name: string, day: string) => `${name}'s days start counting for the team on Monday, ${day}.`,
    notCounted: (name: string) => `${name}'s days are not counted for the team right now.`,
    otherProgramme: (name: string) => `This team is in the league of a programme ${name} has left. Ask for a different team to move to the league of the new programme.`,
    waiting: "Your team joins the table on Monday.",
    leave: "Leave the team",
    leaveHint: "You can join again at any time. If you join again in the same week, you go back to this team if it still has room.",
    change: "Ask for a different team",
    changeHint: "You can do this once a week. You are given a team with room. You cannot pick one. Your days start counting there on the next Monday.",
    changeLater: (day: string) => `You changed team this week. You can ask again from Monday, ${day}.`,
  },

  join: {
    title: (name: string) => `A team for ${name}`,
    offer: (name: string, programme: string, band: string) => `${name} can join a team in the ${programme} league for ${band}.`,
    points: [
      "You are given a team with room. Nobody picks a team, and nobody is placed by skill.",
      "Brothers and sisters on the same programme and in the same age group share a team.",
      "Other families see the team's name and how many members it has. They never see a name from your family.",
      "Your days start counting on a Monday. If today is not a Monday, they start on the next one.",
    ],
    submit: "Join a team",
  },

  /** Why the active profile is not offered a team. One plain explanation each. */
  blocked: {
    no_programme: (name: string) => `${name} is not on a programme. The league counts the days a programme's practice was finished, so there is no team to join yet.`,
    no_daily_minutes: (name: string) => `${name}'s programme has no practice minutes set for each day, so there are no days to count. There is no team to join.`,
    too_young: (name: string) => `Children under 4 do not train on a screen, so there is no league for ${name}.`,
    needs_consent: (name: string) => `${name} can join a team once a parent or guardian has given consent for ${name}.`,
    tester: () => "This is a staff test household. It does not join teams, so that a test never changes a real table.",
  },
  links: { programme: "Choose a programme", family: "Open Family" },

  cannot: "Only a parent or guardian can join, leave or change a team.",

  /** What an action answers when it does nothing. */
  errors: {
    already: "This profile is already on a team.",
    not_on_team: "This profile is not on a team.",
    too_soon: (day: string) => `You changed team this week. You can ask again from Monday, ${day}.`,
    failed: "That did not work. Nothing was changed. Please try again.",
  },
  /** Shown once at the top of the page after an action. */
  done: {
    joined: (name: string, team: string) => `${name} is now on ${team}.`,
    left: (name: string) => `${name} has left the team.`,
    changed: (name: string, team: string) => `${name} has moved to ${team}.`,
  },

  history: {
    title: "Your team's past weeks",
    week: "Week starting",
    days: "Days finished",
    place: "Place",
    placeOf: (place: number, teams: number) => `${place} of ${teams}`,
    none: "Past weeks appear here after your first full week on the team.",
    since: "Only the weeks since you joined are shown.",
  },

  family: {
    title: "Your family in the league",
    on: (name: string, team: string) => `${name} is on ${team}.`,
    see: (name: string) => `See ${name}'s table`,
  },

  how: {
    title: "How the league works",
    points: [
      "A day counts when the day's practice minutes are done.",
      "Rest days never count against a team. Extra minutes and extra days add nothing.",
      "A day you stop because you feel unwell is never a missed day. Nobody on the team can see it.",
      "A team's days are the share of the asked days that its members finished. A big team has no advantage over a small one.",
      "Every Monday the table starts again from zero. There are no prizes, and nothing is carried over.",
      "A team is a name and a number of members. Nobody outside your family sees your name.",
    ],
  },

  /** For staff, in the list of scheduled jobs. */
  jobs: {
    week: "Closes every league week that has ended, with its final days, and opens this week's row for every team.",
    days: "Takes members off teams they may no longer be on, and brings this week's days up to date for every team.",
    done: "done",
  },
}));
