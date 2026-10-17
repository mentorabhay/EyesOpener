// Words for the picture slots: what each slot is for, as staff read it, and the scene a generated picture starts from.
import type { SlotId } from "@/lib/site-pictures/slots";
import { texts } from "@/i18n/texts";

export const pictures = texts("copy/pictures", "pictures", () => ({
  illustration: "Illustration",
  /** Shown to staff beside a slot, and the start of the words a generated picture is made from. */
  slots: {
    "home-hero": { name: "Home page, top", scene: "A mother and her son of about 8 sit at the dining table of a flat in Delhi. The boy wears red-cyan glasses and looks at a laptop. Evening light comes in from a window." },
    "home-family": { name: "Home page, practice together", scene: "A father and his daughter sit close on a sofa with a tablet. The girl wears red-cyan glasses. A steel tumbler of water stands on a side table." },
    "home-outdoors": { name: "Home page, time outside", scene: "Two children play badminton in the lane outside a house in Lucknow. It is late afternoon and sunny. A scooter is parked by the gate." },
    "home-tv": { name: "Home page, the two-eye cinema", scene: "A family of four watch television together in the living room. The child sits on a floor cushion in front and wears red-cyan glasses." },
    "home-closing": { name: "Home page, closing", scene: "A grandmother and her grandson laugh together on a charpai on the roof of their home. A tulsi plant and washing on a line are behind them." },
    "how-setup": { name: "How it works, setting up", scene: "A father holds a bank card against a laptop screen on a study table, to measure it. His child watches beside him." },
    "how-practice": { name: "How it works, daily practice", scene: "A girl of about 10 plays a game on a laptop at the small desk in her room. She wears red-cyan glasses. School books are stacked beside her." },
    "safety-doctor": { name: "Safety, the eye doctor first", scene: "An Indian eye doctor in a small clinic gently checks a young child's eyes with a light. The mother sits beside them." },
    "programmes-hero": { name: "Programmes, top", scene: "A mother and her son tick a paper chart on the fridge in their kitchen. Magnets and a calendar are on the fridge door." },
    "about-hero": { name: "About, top", scene: "Three generations of a family are in the front room of their home in Jaipur. The grandfather reads the paper. The children sit on the floor." },
    "counsellors-hero": { name: "For counsellors, top", scene: "An optometrist in a small practice looks at results on a tablet. An eye chart hangs on the wall behind her." },
    "sponsors-hero": { name: "For sponsors, top", scene: "A government school classroom in a small town. Children in uniform sit at wooden desks, and a teacher stands at the blackboard." },
  } satisfies Record<SlotId, { name: string; scene: string }>,
  /** Added to every scene, so the pictures look like real homes and not a hotel or an advert. */
  style: "A real photo in soft window light. A real Indian home, lived in and a little untidy. Plain furniture and everyday things in view. People in home clothes, not posing. No logos and no writing. Not a hotel or a showroom.",
}));
