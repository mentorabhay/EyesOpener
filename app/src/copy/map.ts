/**
 * Words for Light the Map: a drawing of India that lights up as families join.
 * Only the first three digits of a PIN code are ever asked for. An area with few families is shown to nobody,
 * and nobody is named. The welcome lines are a fixed list: nobody types a welcome.
 */
import type { MapRefusal, WelcomeKey } from "@/lib/map";

const families = (n: number) => (n === 1 ? "1 family" : `${n} families`);
const areas = (n: number) => (n === 1 ? "1 area" : `${n} areas`);

export const map = {
  stats: { lit: "Areas lit", families: "Families in lit areas" },
  tooFew: "No area is lit yet, so there is no number",
  families,

  drawing: {
    title: "The map",
    label: (lit: number, tiles: number) => `A drawing of India in ${tiles} tiles. ${lit === 0 ? "No tile is lit yet." : lit === 1 ? "1 tile is lit." : `${lit} tiles are lit.`}`,
    about: "A simple drawing, not to scale. Each tile stands for the PIN codes that start with the numbers on it. A tile lights up when it holds at least one lit area.",
    key: { lit: "Lit: it holds a lit area", dark: "Not lit yet", yours: "Ringed: your family's tile" },
    range: (from: number, to: number) => (from === to ? `${from}` : `${from} to ${to}`),
    tile: (name: string, range: string, lit: number) => `${name}, PIN codes that start with ${range}: ${lit === 0 ? "not lit yet" : `${areas(lit)} lit`}`,
  },

  list: {
    title: "Lit areas",
    none: "No area is lit yet. An area lights up when enough families are on it.",
    area: (digits: string) => `PIN codes that start with ${digits}`,
    rule: (min: number) => `An area is shown only when at least ${families(min)} are on it. Smaller areas are not on the map and have no number.`,
  },

  yours: {
    title: "Your family's area",
    area: (digits: string, region: string) => `PIN codes that start with ${digits}. ${region}.`,
    lit: (n: number) => `Your area is lit. ${families(n)} are on it.`,
    dark: (min: number) => `Your area is not lit yet. It lights up when ${families(min)} are on it. Until then nobody can see it, and it has no number.`,
    since: (day: string) => `On the map since ${day}.`,
    viewOnly: "Only a parent or guardian can put your family on the map or take it off.",
    notOn: "Your family is not on the map.",
  },

  join: {
    title: "Put your family on the map",
    what: "Joining lights your area for everyone, once enough families are on it. Nobody sees your family, your name or where you live.",
    field: "The first three digits of your PIN code",
    hint: "Three digits only, such as 411. Do not type the whole PIN code.",
    kept: [
      "IOpener keeps the three digits and nothing else about where you are. They cover a whole district or a large part of a city, never a street.",
      "Your area is shown only when enough families are on it.",
      "You can leave the map at any time. Your three digits are then deleted.",
    ],
    submit: "Join the map",
    joined: "Your family is on the map.",
    tester: "A staff test household is not put on the map, so the map shows members only.",
    problem: {
      format: "Type exactly three digits: the first three of your PIN code, and no more.",
      army: "PIN codes that start with 9 belong to the army post. They do not say where a place is, so they cannot go on the map.",
      unknown: "No PIN code starts with those digits. Check the first three digits and try again.",
    },
  },

  lamp: {
    title: "You are the lamp-lighter",
    what: "Your family was the first on the map in this area. That lets you do one thing: choose a welcome for the families who join after you.",
    onlyThis: "Being first gives nothing else. If your family leaves the map, the next family becomes the lamp-lighter.",
    pick: "Your welcome",
    none: "No welcome",
    hint: "Families who join your area after you see the line you choose. It never shows your name.",
    submit: "Save the welcome",
    saved: "Your welcome is saved.",
    cleared: "Your welcome was taken away.",
    from: "A welcome from the lamp-lighter of your area",
    fromNote: "The lamp-lighter is the family that joined your area first. They chose this line for whoever came next.",
  },

  /** The fixed list of welcome lines. Keys are in src/lib/map.ts. */
  welcome: {
    hello: "Welcome. We are glad you are here.",
    not_alone: "You are not alone in this. We are in your area too.",
    small_steps: "Small steps, every day. We are doing the same.",
    first_week: "The first week is the hardest part. Keep going.",
    wave: "A wave from a family in your area.",
  } satisfies Record<WelcomeKey, string>,

  leave: {
    open: "Leave the map",
    warn: "Your three digits are deleted. If your family was the lamp-lighter, that passes to the next family. You can join again later.",
    submit: "Leave the map",
    done: "Your family is off the map. Your three digits were deleted.",
  },

  refused: {
    not_allowed: "Only a parent or guardian can do this.",
    tester: "A staff test household is not put on the map, so the map shows members only.",
    already: "Your family is already on the map. Leave it first to change the area.",
    not_on_map: "Your family is not on the map.",
    not_first: "Only the lamp-lighter of an area can choose its welcome.",
    bad_line: "Choose a welcome from the list.",
  } satisfies Record<MapRefusal, string>,
};
