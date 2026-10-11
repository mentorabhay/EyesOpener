// Eyes Opener: The short, readable form of a family's file: what the printable summary page shows.
/**
 * The short, readable form of a family's file: what the printable summary page shows.
 * A pure function of the file, so the page and the file can never disagree.
 */
import { PARTS, type PartKey } from "./tables";
import type { FamilyFile, Row } from "./export";

const when = (v: unknown): Date | null => (v instanceof Date ? v : typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v) : null);
const text = (v: unknown) => (typeof v === "string" ? v : "");
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export interface ProfileSummary {
  id: string; name: string; kind: string; birthYear: number | null; archived: boolean;
  programmes: { name: string; status: string; week: number }[];
  eye: { weakEye: string | null; strongContrast: number; at: Date | null } | null;
  checkUps: { key: string; name: string; n: number; first: Date | null; last: Date | null }[];
  sessions: number; minutes: number; stopped: number; days: number;
  care: number; plans: number; monitor: number;
  counsellors: { name: string; status: string }[];
  notes: { by: string; at: Date | null; body: string }[];
  stories: number; ideas: number; weekNotes: number; mail: number; lights: number;
  consent: { n: number; live: number }; safety: number;
}

export interface Summary {
  madeAt: Date;
  household: { name: string; locale: string; since: Date | null; exitPinSet: boolean; screens: number; groups: number; invites: number };
  people: { name: string; email: string; seat: string | null; since: Date | null }[];
  profiles: ProfileSummary[];
  parts: { key: PartKey; title: string; what: string; rows: number }[];
  total: number;
  leftOut: string[];
}

export function summarise(file: FamilyFile): Summary {
  const d = file.data, home: Row = d.household[0] ?? {};
  const of = (part: PartKey, profileId: string, column = "profileId") => d[part].filter((r) => r[column] === profileId);
  const profiles = d.profiles.map((p): ProfileSummary => {
    const id = text(p.id);
    const sessions = of("sessions", id), links = of("counsellorLinks", id), consent = of("consent", id);
    const eye = of("eyeSettings", id).filter((e) => e.isCurrent).at(-1);
    const results = of("checkUps", id);
    const linkIds = new Set(links.map((l) => l.id));
    return {
      id, name: text(p.displayName), kind: text(p.kind), birthYear: typeof p.birthYear === "number" ? p.birthYear : null, archived: !!p.archivedAt,
      programmes: of("programmes", id).map((e) => ({ name: file.names.programmes[text(e.programme)] ?? text(e.programme), status: text(e.status), week: num(e.week) })),
      eye: eye ? { weakEye: typeof eye.weakEye === "string" ? eye.weakEye : null, strongContrast: num(eye.strongContrast), at: when(eye.createdAt) } : null,
      checkUps: [...new Set(results.map((r) => text(r.testKey)))].map((key) => {
        const rows = results.filter((r) => r.testKey === key);
        return { key, name: file.names.checkUps[key]?.name ?? key, n: rows.length, first: when(rows[0]?.takenAt), last: when(rows.at(-1)?.takenAt) };
      }),
      sessions: sessions.length,
      minutes: Math.round(sessions.reduce((sum, s) => sum + num(s.minutes), 0)),
      stopped: sessions.filter((s) => s.endReason === "stop_rule").length,
      days: of("days", id).length, care: of("careLog", id).length, plans: of("carePlans", id).length, monitor: of("monitorSamples", id).length,
      counsellors: links.map((l) => ({ name: text(l.counsellorName), status: text(l.status) })),
      notes: d.counsellorNotes.filter((n) => linkIds.has(n.linkId)).map((n) => ({
        by: text(links.find((l) => l.id === n.linkId)?.counsellorName), at: when(n.createdAt), body: text(n.body),
      })),
      stories: of("stories", id).length, ideas: of("ideas", id).length, weekNotes: of("weekNotes", id).length,
      mail: of("mail", id, "toProfileId").length,
      lights: d.lights.filter((l) => l.fromProfileId === id || l.toProfileId === id).length,
      consent: { n: consent.length, live: consent.filter((c) => !c.revokedAt).length },
      safety: of("safetyAnswers", id).length,
    };
  });
  const parts = PARTS.map((key) => ({ key, title: file.README.parts[key].title, what: file.README.parts[key].what, rows: d[key].length }));
  return {
    madeAt: new Date(file.madeAt),
    household: {
      name: text(home.displayName), locale: text(home.locale), since: when(home.createdAt), exitPinSet: !!home.exitPinSet,
      screens: d.screens.length, groups: d.sponsorGroups.length, invites: d.invites.length,
    },
    people: d.people.map((p) => ({ name: text(p.displayName), email: text(p.email), seat: typeof p.seat === "string" ? p.seat : null, since: when(p.createdAt) })),
    profiles, parts, total: parts.reduce((sum, p) => sum + p.rows, 0), leftOut: file.README.leftOut,
  };
}
