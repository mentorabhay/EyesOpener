/** Words of the account page (/account): who is signed in, their roles, their household, and signing out. */
import { texts } from "@/i18n/texts";

export const account = texts("copy/account", "account", () => ({
  title: "Your account",
  sub: "Who is signed in on this device, what you can do, and where your settings are.",
  you: "You",
  name: "Your name",
  nameHint: "Shown to your household and, if you link one, to your counsellor. Never to other families.",
  save: "Save",
  saved: "Saved.",
  badName: "Use 1 to 60 letters.",
  email: "Email",
  how: { real: "Signed in with Google or an emailed code", demo: "Signed in as a demo person" },
  demoCopy: (tester: string) => `This is ${tester}'s own copy of the demo family. Nothing here mixes with anyone else's.`,
  roles: "What you can do",
  household: "Your household",
  profiles: (n: number) => (n === 1 ? "1 profile" : `${n} profiles`),
  manageFamily: "Manage the family",
  areas: "Your other areas",
  settings: "Settings",
  links: {
    screen: { label: "This screen and the glasses", text: "Size, colours and the leak check" },
    reminders: { label: "Reminders", text: "When each person is reminded, and how" },
    notifications: { label: "Notifications", text: "What came in, and showing them on this computer" },
    data: { label: "Your family's data", text: "Download a copy, or delete it" },
    all: { label: "All settings", text: "Programmes, eye settings, language and more" },
  },
  signingOut: "Signing out",
  signOut: "Sign out on this device",
  signOutAll: "Sign out on every device",
  signOutAllHint: "Ends every session of yours, on phones and TVs too.",
}));
