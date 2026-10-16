// Eyes Opener: Words of the marketing parts of the site: the short tags and benefit cards on the landing page, the demo game.
/**
 * Words of the marketing parts of the site: the short tags and benefit cards on the landing page, the demo game
 * (/try), and the Register and "Can't sign in?" pages. Plain words a school student can follow; one idea per line.
 * Nothing here may promise to treat or cure, and every number is true.
 */
import { texts } from "@/i18n/texts";

export const marketing = texts("copy/marketing", "marketing", () => ({
  tags: {
    title: "Small habits. Two eyes. One team.",
    lead: "Short practice that fits a busy day, for children and grown-ups.",
    list: ["Eye fitness at home", "Games, not chores", "Check-ups in minutes", "Made for families", "Built on published research", "Private by default"],
    cards: [
      { head: "Ten minutes is a start", body: "Short sessions on most days. The app keeps the clock, so nobody plays too long." },
      { head: "Play with both eyes", body: "Red-cyan glasses give each eye its own part of the game. The brain puts them together." },
      { head: "See the change", body: "Check-ups at home, a calendar of practice, and a file to take to the eye doctor." },
      { head: "One family account", body: "A grown-up sets it up. Children get their own profile, closed with a PIN." },
      { head: "On the screens you have", body: "In the browser today. The phone and TV apps are being tested." },
    ],
    safe: { head: "Safe first", body: (max: number) => `A stop button in every game. Safety questions before training. Never more than ${max} minutes a day.` },
    cta: "Play the 60-second demo",
    register: "Create a family account",
  },

  demo: {
    metaTitle: "Try a game",
    kicker: "Free demo",
    title: "Try a game in 60 seconds",
    lead: "No sign-in. Nothing is saved. Catch the fireflies and leave the moths.",
    howTitle: "How to play",
    how: [
      "Press Start.",
      "Tap a firefly to catch it, or move the ring with the arrow keys and press Enter.",
      "Leave the moths alone.",
      "The game gets harder after three catches in a row, and easier after two misses.",
    ],
    glassesTitle: "Do I need glasses?",
    glasses: "Not for this demo. In the real app you wear red-cyan glasses. The fireflies go to the weaker eye and the moths to the stronger eye. So both eyes have to work together.",
    start: "Start",
    again: "Play again",
    stop: "Stop",
    left: (s: number) => `${s} s left`,
    score: (n: number) => `Caught: ${n}`,
    done: (n: number) => `Time is up. You caught ${n}.`,
    nextTitle: "Like it?",
    next: (games: number, exercises: number) => `The app has ${games} games and ${exercises} exercises, with check-ups at home and a plan for each eye.`,
    register: "Create a family account",
    check: "Start the two-minute check",
    note: "This demo is only a taste. It is not a test of your eyes and it does not train them.",
    scene: "Demo game: Firefly Catch",
  },

  register: {
    title: "Create your family account",
    sub: "Free. One account for the whole household. A grown-up signs up; children get their own profile inside it.",
    steps: [
      "Sign up with Google, or with your email address.",
      "Choose a name for your household.",
      "Add a profile for each person, then do the two-minute check.",
    ],
    noPassword: "There is no password to make or remember. With email, we send you a link each time.",
    have: "Already have an account?",
    login: "Log in",
    children: "Under 18? Ask a parent or guardian to sign up and add you.",
  },

  help: {
    title: "Can't sign in?",
    sub: "Eyes Opener has no passwords, so there is nothing to forget or reset. Here is what to do instead.",
    sendTitle: "Send me a new sign-in link",
    sendBody: "Type the email address you use with Eyes Opener. A new link arrives in a minute or two. Open it on this device.",
    faq: [
      { q: "The link did not arrive", a: "Look in your spam or promotions folder. Wait two minutes, then ask for a new link. Each new link replaces the old one." },
      { q: "The link says it has run out", a: "A link works once and for a short time. Ask for a new one below." },
      { q: "I opened the link on another phone or computer", a: "Open it on the device where you asked for it, or type your email again when the page asks." },
      { q: "I signed up with Google", a: "Use \"Sign in with Google\" on the Log in page, with the same Google account." },
      { q: "My child cannot sign in", a: "Children do not sign in. A grown-up signs in and opens the child's profile; child mode is closed with a PIN." },
      { q: "None of this works", a: "Wait a few minutes and try again, or sign in with Google instead. Never send a sign-in link to anyone." },
    ],
    back: "Back to Log in",
  },

  brand: {
    title: "Two eyes. One team.",
    lead: "A fitness app for your eyes, for the whole family.",
    points: ["Short games at home", "Check-ups in minutes", "A stop button in every game", "No passwords to remember"],
  },

  login: {
    newHere: "New here?",
    register: "Create a family account",
    trouble: "Can't sign in?",
  },
}));
