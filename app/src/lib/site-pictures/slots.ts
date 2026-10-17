// Eyes Opener: The picture slots of the public site: where a picture can go, its shape, and the sizes made of it.
/**
 * A slot is one place on a public page where a picture may stand. Until staff approve a picture for it, the page shows
 * what it showed before (its drawing, or nothing), so an empty slot never leaves a hole.
 * The words staff read about each slot, and the scene a generated picture starts from, are in src/copy/pictures.ts.
 */
export const SLOT_IDS = [
  "home-hero", "home-family", "home-outdoors", "home-tv", "home-closing",
  "how-setup", "how-practice", "safety-doctor", "programmes-hero", "about-hero",
  "counsellors-hero", "sponsors-hero",
] as const;
export type SlotId = (typeof SLOT_IDS)[number];

export interface Slot {
  id: SlotId;
  /** The page it is on, as an address. */
  page: string;
  /** Width over height of the shown frame. The picture is cut to it around its focal point. */
  aspect: number;
  /** Large pictures drift slightly on scroll when motion is on (the parallax setting sets how far). */
  parallax: boolean;
  /** At home, or away from it (a lane, a clinic, a classroom): which look the picture is asked for. */
  place: "home" | "away";
  /** Where the subject should sit, 0 to 1 from the left and from the top: the starting focal point of a new picture. */
  focus: [number, number];
}

export const SLOTS: readonly Slot[] = [
  { id: "home-hero", page: "/", aspect: 16 / 9, parallax: true, place: "home", focus: [0.58, 0.42] },
  { id: "home-family", page: "/", aspect: 4 / 3, parallax: false, place: "home", focus: [0.5, 0.45] },
  { id: "home-outdoors", page: "/", aspect: 4 / 3, parallax: false, place: "away", focus: [0.45, 0.5] },
  { id: "home-tv", page: "/", aspect: 16 / 9, parallax: true, place: "home", focus: [0.45, 0.55] },
  { id: "home-closing", page: "/", aspect: 16 / 9, parallax: true, place: "home", focus: [0.5, 0.5] },
  { id: "how-setup", page: "/how-it-works", aspect: 4 / 3, parallax: false, place: "home", focus: [0.55, 0.5] },
  { id: "how-practice", page: "/how-it-works", aspect: 4 / 3, parallax: false, place: "home", focus: [0.5, 0.45] },
  { id: "safety-doctor", page: "/safety", aspect: 4 / 3, parallax: false, place: "away", focus: [0.55, 0.45] },
  { id: "programmes-hero", page: "/programmes", aspect: 16 / 9, parallax: true, place: "home", focus: [0.5, 0.4] },
  { id: "about-hero", page: "/about", aspect: 16 / 9, parallax: true, place: "home", focus: [0.5, 0.5] },
  { id: "counsellors-hero", page: "/for-counsellors", aspect: 16 / 9, parallax: true, place: "away", focus: [0.45, 0.45] },
  { id: "sponsors-hero", page: "/for-sponsors", aspect: 16 / 9, parallax: true, place: "away", focus: [0.5, 0.5] },
];

export const slotOf = (id: string): Slot | undefined => SLOTS.find((s) => s.id === id);

/** How a frame is described to a photographer or an image model, and the least size a photo for it should have. */
export function frameOf(slot: Slot): { shape: "16:9" | "4:3"; least: [number, number] } {
  return slot.aspect > 1.55 ? { shape: "16:9", least: [2400, 1350] } : { shape: "4:3", least: [2400, 1800] };
}

/** The widths made of every picture, smallest first. A picture narrower than one is not made larger. */
export const WIDTHS = [640, 1280, 1920] as const;
/** The largest file staff may send (the proxy keeps at most 10 MB of a request). The room makes a larger picture smaller before sending. */
export const MAX_UPLOAD = 9 * 1024 * 1024;

export const KINDS = ["photo", "archival", "drawn", "generated"] as const;
export type PictureKind = (typeof KINDS)[number];

/** The widths that exist for a picture of this width: every standard width it reaches, or its own width when it reaches none. */
export const widthsFor = (width: number): number[] => {
  const w = WIDTHS.filter((x) => x <= width);
  return w.length ? [...w] : [Math.round(width)];
};

/** The address of one size of a picture. Ids and sizes never change their bytes, so the address can be kept for a year. */
export const picAddress = (id: string, width: number) => `/pic/${id}/${width}.webp`;

/** A focal point kept inside the picture. */
export const focal = (n: unknown): number => (typeof n === "number" && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);
