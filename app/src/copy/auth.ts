import { texts } from "@/i18n/texts";

export const auth = texts("copy/auth", "auth", () => ({
  title: "Sign in",
  demoTitle: "Demo sign-in",
  demoSub: "Pick a person to see their side of Eyes Opener. Each has their own pages and their own limits.",
  demoLocked: "Demo people are for those given an access phrase.",
  demoOpen: "Type the phrase",
  groups: {
    household: { title: "A family", sub: "Guardians manage the household. A cheer seat can look and encourage." },
    staff: { title: "Eyes Opener staff", sub: "The admin console. Each role sees only its rooms." },
    counsellor: { title: "Eye counsellors", sub: "Professionals a family links to. Ops checks them first." },
    sponsor: { title: "Sponsors", sub: "Organisations that support families. They see counts, never a member." },
  },
  seat: { guardian: "Guardian", co_guardian: "Co-guardian", circle: "Cheer seat" },
  staff: { super_admin: "Super admin", ops: "Ops team", content: "Content" },
  counsellor: { verified: "Verified counsellor", waiting: "Waiting for checks" },
  sponsor: { approved: "Sponsor, approved", pending: "Sponsor, waiting for approval", suspended: "Sponsor, suspended" },
  current: "Signed in",
  tester: {
    label: "Your name",
    hint: "Each person trying the demo gets their own copy of this family, so their readings never mix with anyone else's. Type the same name next time to come back to your copy.",
    placeholder: "For example: Ved",
    need: "Type your name first, so you get your own copy of the family.",
    bad: "Use letters, numbers and spaces, up to 40.",
    failed: "Your copy of the family could not be made. Please try again.",
    copies: (names: string) => `Copies so far: ${names}.`,
    household: (family: string, tester: string) => `${family} (${tester}'s copy)`,
    using: (tester: string) => `Demo copy for ${tester}`,
  },
  signIn: "Sign in",
}));
