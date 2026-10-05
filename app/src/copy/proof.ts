/**
 * Words for Proof of Help: what a shared idea has done, measured and not applauded.
 * A pooled result from members is a signal, never proof. Nothing here may say more than the numbers do,
 * promise that an idea helps, or name a member to another family.
 */
const people = (n: number) => (n === 1 ? "1 member" : `${n} members`);

/** "your idea" on a family's own list, "this idea" on the list everyone sees. */
type Whose = "your" | "this";

export const proof = {
  rule: "There are no likes, no followers and no list of people here. An idea earns its place by what was measured when members tried it.",

  stats: { ideas: "Ideas your family shared", joined: "Members who joined them", tried: "Members who tried them, in a result" },
  noResultYet: "No result yet",

  own: {
    title: "What your family's ideas did",
    none: "Nobody in your family has shared an idea yet. An idea starts as a story of what helped you.",
    share: "Share what helped you",
    sharedAs: (name: string) => `Shared as ${name}`,
    open: "Open the idea",
  },

  /** One sentence for where an idea stands. Each says only what its numbers support. */
  stage: {
    waiting: "A person is reading this idea. Nothing is counted until it is published.",
    not_published: "This idea was not published, so nobody has tried it.",
    published: "It is published. Nobody has joined its experiment yet.",
    being_tested: (joined: number, tried: number, control: number, min: number) =>
      `${people(joined)} joined its experiment. ${tried} finished trying it, and ${control} finished in the group that carried on as usual. A result is shown when ${min} in each group have finished.`,
  },

  result: {
    lead: (tried: number, whose: Whose) => `${people(tried)} tried ${whose} idea and finished both check-ups.`,
    lean: {
      better: "As a group, their check-up changed for the better by more than the group that carried on as usual.",
      unclear: "So far there is no clear difference between them and the group that carried on as usual. Finding that out is a help too.",
      worse: "As a group, they did worse than the group that carried on as usual. A person has been asked to look at the idea again.",
    },
    compared: (control: number) => `Compared with ${people(control)} who carried on as usual.`,
    joined: (n: number) => `${people(n)} joined its experiment in all.`,
    honest: "This is an early signal from members who chose their own group. It is not proof, and it does not show that the idea treats anything.",
  },
  reviewed: "An eye-care professional has read the idea and the results.",
  trialled: "The idea has been tested in a formal research trial.",

  how: {
    title: "How standing works here",
    points: [
      "Standing belongs to an idea, not to a person. Nobody is ranked.",
      "The only thing counted is members who tried the idea and took the check-up before and after.",
      "No number is shown for whether an idea helps until enough members in both groups have finished.",
      "Nobody's own result is shown to anyone else, and no family is named to another family.",
    ],
  },

  all: {
    title: "Ideas with a result so far",
    sub: "Every published idea that enough members have finished. They are listed by their step on the trust ladder, then by date. Never by the size of a number.",
    none: "No idea has a result yet. A result needs enough members to finish in both groups.",
    yours: "From your family",
  },
};
