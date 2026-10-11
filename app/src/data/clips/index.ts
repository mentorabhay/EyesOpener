// Eyes Opener: Every clip of the catalogue with how it is played. See types.ts.
/**
 * Every clip of the catalogue with how it is played. See types.ts.
 */
import { clips, type Clip } from "../index";
import { CALIBRATION } from "./calibration";
import { MEASUREMENT } from "./measurement";
import type { ClipDef, OfferedClip } from "./types";

export * from "./types";
export { CLIP_TESTS, UNITS, clipTest, type ClipTest, type Unit } from "./keys";
export { LOOKS, type Look, type LookOption, type LookQuestion, type Tone } from "./looks";
export { SETS, SET_KEYS, isSetKey, type SetKey } from "./sets";

export const CLIP_DEFS: ClipDef[] = [...CALIBRATION, ...MEASUREMENT];

const defs = new Map(CLIP_DEFS.map((d) => [d.code, d]));
const lines = new Map(clips.map((c) => [c.code, c]));

export const clipDef = (code: string): ClipDef | undefined => defs.get(code);
/** The catalogue's line for a code: its title, what it measures, its length and its group. */
export const clipLine = (code: string): Clip | undefined => lines.get(code);

/** A clip with its catalogue line. */
export interface ClipEntry { line: Clip; def: ClipDef }
export const CLIPS: ClipEntry[] = clips.flatMap((line) => { const def = defs.get(line.code); return def ? [{ line, def }] : []; });
export const OFFERED: OfferedClip[] = CLIP_DEFS.filter((d): d is OfferedClip => d.offered);
export const isCalibration = (code: string) => code.startsWith("C");
export const clipGroups: string[] = [...new Set(clips.map((c) => c.group))];
