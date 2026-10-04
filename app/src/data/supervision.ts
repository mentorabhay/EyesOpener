/**
 * What supervision is supposed to do, in brief. Shown wherever the evidence label says "with supervision"
 * or the evidence framework recommends a counsellor (level 2).
 * The figures come from the trials named; the list of what a therapist does is what those trials describe.
 */
import { mechanismOf } from "@/data";
import type { Source } from "@/data/guides/types";

export interface Supervision {
  /** One or two sentences: what the trial behind this method had, and what happened without it. */
  trial: string;
  /** What a therapist or counsellor does that the app cannot. */
  does: string[];
  /** What the counsellor can do inside IOpener. */
  inApp: string;
  sources: Source[];
}

const DOES = [
  "Checks what the app cannot see. The app only knows what you tell it; a therapist watches the eyes and measures them.",
  "Decides whether this practice suits this person at all, and where to start.",
  "Sets how much to do, and steps it up or down as the weeks go by.",
  "Shows how each drill is done and corrects it when it goes wrong.",
  "Watches for symptoms, and stops or changes the plan when they come.",
  "Keeps the practice going. A visit every week is a reason to do the home part.",
];
const IN_APP = "In IOpener a verified counsellor links to the member, sets the daily minutes of a counsellor-led programme, reads the member's results and leaves notes. IOpener itself never sets a dose.";

const CITT: Source = {
  label: "Convergence Insufficiency Treatment Trial Study Group, 2008, Archives of Ophthalmology: four treatments compared in 221 children aged 9 to 17",
  url: "https://pubmed.ncbi.nlm.nih.gov/18852411/",
};
const KINETICS: Source = {
  label: "Scheiman and others for the same trial group, 2010, Optometry and Vision Science: the home practice the trial set, and what it counted as normal",
  url: "https://pubmed.ncbi.nlm.nih.gov/20543758/",
};
const CONCUSS: Source = {
  label: "Alvarez and others, 2025, British Journal of Sports Medicine: CONCUSS randomised clinical trial of vergence and accommodative therapy with movement for concussion-related convergence insufficiency",
  url: "https://pmc.ncbi.nlm.nih.gov/articles/PMC12591301/",
};
const SQUINT: Source = {
  label: "Ma and others, 2024, Ophthalmic and Physiological Optics: randomised trial of clinic vergence and anti-suppression therapy for intermittent exotropia",
  url: "https://pubmed.ncbi.nlm.nih.gov/38146812/",
};
const STROKE: Source = {
  label: "Pollock and others, 2019, Cochrane Database of Systematic Reviews: interventions for visual field defects in people with stroke",
  url: "https://pubmed.ncbi.nlm.nih.gov/31120142/",
};

const BY_MECHANISM: Record<string, Pick<Supervision, "trial" | "sources">> = {
  verg: {
    trial: "In the trial behind this method, children saw a therapist every week for 12 weeks and practised at home for 15 minutes a day on 5 days a week: 73 in 100 succeeded or improved. Computer practice at home with no therapist helped 33 in 100, about the same as pretend therapy.",
    sources: [CITT, KINETICS],
  },
  focus: {
    trial: "Focus drills were part of the same therapy: a therapist every week for 12 weeks, with home practice in between. They were not tested alone.",
    sources: [CITT],
  },
  recov: {
    trial: "In the trial behind this method, people aged 11 to 25 had six weeks of sessions with a therapist: symptoms improved in 79 in 100, against 13 in 100 of those still waiting.",
    sources: [CONCUSS],
  },
  anti: {
    trial: "The trial behind this method was done in a clinic, with a therapist present at each session. Nobody has tested this practice done alone at home.",
    sources: [SQUINT],
  },
  scan: {
    trial: "After a stroke, a hospital team or eye clinic first measures which part of the side vision is lost. Practice like this is built on that measurement.",
    sources: [STROKE],
  },
  read: {
    trial: "After a stroke, a hospital team or eye clinic first measures which part of the side vision is lost. Practice like this is built on that measurement.",
    sources: [STROKE],
  },
};

/**
 * The supervision brief for an item, or null when none applies. It applies when the method's evidence label is
 * "strong with supervision", or when the item is level 2 (recommended as counsellor-led).
 */
export function supervisionFor(mechanism: string, level: number): Supervision | null {
  const withSupervision = mechanismOf(mechanism)?.evidence === "sup";
  if (!withSupervision && level < 2) return null;
  const own = BY_MECHANISM[mechanism];
  return {
    trial: own?.trial ?? "The evidence framework recommends this with a counsellor, because it was tested with a therapist present or not tested at home at all.",
    does: DOES,
    inApp: IN_APP,
    sources: own?.sources ?? [],
  };
}
