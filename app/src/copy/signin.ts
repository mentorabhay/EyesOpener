// Eyes Opener: Words for signing in, the email link, the welcome step and signing out. .
/** Words for signing in, the email link, the welcome step and signing out. */
import type { Refusal } from "@/lib/signin/flow";
import { SESSION_DAYS, TRUSTED_HOURS } from "@/lib/signin/lengths";
import { texts } from "@/i18n/texts";

const askUs = "This email address is already tied to a different sign-in at IOpener, so we did not sign you in. IOpener staff have to check and free it first.";

export const signin = texts("copy/signin", "signin", () => ({
  title: "Sign in",
  sub: "Grown-ups sign in here. There is no password to remember.",
  notSetUp: "Sign-in is not set up yet.",
  children: "Children do not sign in. A child uses a profile inside a grown-up's account, on the grown-up's device.",

  google: {
    title: "With Google",
    loading: "Loading the Google button.",
    failed: "The Google button could not load. Use the email link instead.",
    working: "Signing you in.",
  },
  or: "or",
  link: {
    title: "With an email link",
    label: "Your email address",
    hint: "We email you a link. Open it to sign in.",
    send: "Email me a sign-in link",
    sending: "Sending",
  },
  sent: {
    title: "Check your email",
    look: (email: string) => `Look for an email from IOpener at ${email}. It can take a minute.`,
    open: "Open the link in it on this device. On another device you will be asked for your email address again.",
    several: "Only a few links go to one address in an hour. If you asked more than once, use the newest email.",
    none: "No email? Look in the spam folder first.",
    again: "Send it again",
    other: "Use a different address",
  },
  code: {
    title: "With a code by email",
    hint: "We email you a six-digit code. Type it here to sign in.",
    send: "Email me a code",
    sentTitle: "Type the code",
    look: (email: string) => `We emailed a six-digit code to ${email}. It can take a minute.`,
    works: (minutes: number) => `The code works once, for ${minutes} minutes. Only the newest code works.`,
    label: "Six-digit code",
    enter: "Sign in",
    entering: "Checking",
    again: "Send a new code",
    other: "Use a different address",
  },
  mail: {
    subject: (code: string) => `${code} is your IOpener sign-in code`,
    intro: "Your IOpener sign-in code is",
    use: (minutes: number) => `Type it on the sign-in page. It works once, for ${minutes} minutes.`,
    ignore: "If you did not ask for it, you can ignore this email. Nobody can sign in without the code.",
    note: "IOpener is not a medical device. It does not diagnose, treat or cure any condition.",
  },
  join: { text: "Has a guardian given you an invite code?", link: "Join their family" },

  held: "This device is in child mode. A grown-up of this child's family signs in to carry on. Child mode stays on until a grown-up types the exit PIN.",

  finish: {
    title: "Finish signing in",
    sub: "You opened a sign-in link.",
    known: (email: string) => `Signing you in as ${email}.`,
    working: "Signing you in.",
    submit: "Finish signing in",
    elsewhere: "This link was opened on a different device or app from the one that asked for it. To keep your account safe, type the email address the link was sent to.",
    label: "Email address the link was sent to",
    askAgain: "Ask for a new link",
  },

  me: {
    title: "You are signed in",
    as: (name: string, email: string) => `${name}, ${email}`,
    go: "Go to your pages",
    out: "Sign out",
    outHint: "Signs you out on this device.",
    everywhere: "Sign out on every device",
    everywhereHint: "Use this when a device is lost, or when you left yourself signed in somewhere. Every device asks for sign-in again.",
    lasts: `You stay signed in on a device for ${SESSION_DAYS} days. Staff, counsellors and sponsors are asked again after ${TRUSTED_HOURS} hours.`,
  },
  done: {
    out: "You are signed out on this device.",
    everywhere: "You are signed out on every device.",
  } as Record<string, string>,

  welcome: {
    title: (name: string) => `Welcome, ${name}`,
    sub: "You are signed in. One more step.",
    start: {
      title: "Start a family space",
      body: "A family space holds your own profile and your children's profiles, with their check-ups and practice. You look after it as its guardian. IOpener then measures your screen and your eyes.",
      submit: "Start my family space",
    },
    join: {
      title: "Join a family",
      body: "Has a guardian given you an invite code? Then join their family space. Do not start one of your own.",
      link: "I have an invite code",
    },
    household: (person: string) => `${person.trim().split(/\s+/)[0] || "My"}'s family`,
  },

  refused: {
    not_set_up: "Sign-in is not set up yet.",
    slow_down: "Too many tries from this network. Wait a few minutes and try again.",
    unavailable: "We could not reach the sign-in service just now. Try again in a minute.",
    not_confirmed: "We could not confirm this sign-in. Please try again.",
    email_unverified: "This account's email address has not been confirmed, so IOpener cannot use it. Sign in with the email link instead.",
    google_refused: "Google did not accept that sign-in. Please try again.",
    other_method: "Google could not confirm this address for IOpener. Sign in with the email link instead.",
    disabled: "This sign-in has been switched off.",
    bad_link: "This sign-in link is not complete. Ask for a new one.",
    need_address: "Type the email address this link was sent to.",
    link_expired: "This link is too old or was used already. A link works once. Ask for a new one.",
    wrong_address: "That is not the address this link was sent to. Check it and try again.",
    child_mode: "This device is in child mode. Only a grown-up of this child's family can sign in on it. A grown-up leaves child mode with the exit PIN first.",
    unverified: "This account's email address has not been confirmed, so IOpener cannot use it.",
    other_sign_in: askUs,
    address_in_use: askUs,
    unclear: askUs,
    demo: "That address belongs to the demo family. Nobody signs in to it.",
    code_wrong: "That code is not right. Check the newest email and type the six digits again.",
    code_expired: "That code is too old, was used already, or had too many wrong tries. Ask for a new one.",
  } satisfies Record<Refusal, string>,
  slowDown: (minutes: number) => `Too many tries from this network. Wait about ${minutes} ${minutes === 1 ? "minute" : "minutes"} and try again.`,
  badAddress: "That does not look like an email address.",
  notSent: "We could not send the email just now. Try again in a minute.",
}));
