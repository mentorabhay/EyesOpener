// Eyes Opener: Switching a language on: who may, what is refused, and what is written down.
/**
 * Switching a language on: who may, what is refused, and what is written down.
 * Only a super admin and content staff may change a status; every change goes to the audit log with what it was
 * and what it became; a language with no sentence checked by a person cannot be switched on for families.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  viewer: null as { staff: string | null; user: { id: string } } | null,
  statuses: {} as Record<string, string>, set: [] as [string, string][], audits: [] as unknown[][],
}));
vi.mock("next/cache", () => ({ revalidatePath: () => undefined }));
vi.mock("next/navigation", () => ({ redirect: (to: string) => { throw new Error(`moved to ${to}`); } }));
vi.mock("@/lib/auth", () => ({
  /* the real gate: anyone who may not use the Catalogue room gets "not found" */
  requireStaff: async (area: string) => {
    const rooms: Record<string, string[]> = { ops: ["catalogue"], content: ["catalogue"] };
    if (!h.viewer?.staff || !(h.viewer.staff === "super_admin" || rooms[h.viewer.staff]?.includes(area))) throw new Error("not found");
    return h.viewer;
  },
  audit: async (...a: unknown[]) => { h.audits.push(a); },
}));
vi.mock("@/i18n/status", () => ({
  langStatuses: async () => h.statuses,
  setLangStatus: async (lang: string, status: string) => { h.set.push([lang, status]); h.statuses = { ...h.statuses, [lang]: status }; return true; },
}));

import { mark } from "@/i18n/mark";
import { readTranslationsFrom } from "@/i18n/runtime";
import { mayManageLanguages } from "./languages";
import { setLanguageStatus } from "./languages-actions";

const form = (lang: string, status: string) => { const f = new FormData(); f.set("lang", lang); f.set("status", status); return f; };
const staff = (role: string | null) => { h.viewer = role === undefined ? null : { staff: role, user: { id: "staff-1" } }; };

let dir = "";
beforeAll(() => {
  dir = mkdtempSync(path.join(tmpdir(), "io-lang-staff-"));
  const put = (lang: string, status: string) => {
    mkdirSync(path.join(dir, lang, "copy"), { recursive: true });
    writeFileSync(path.join(dir, lang, "copy", "today.json"), JSON.stringify({ lang, file: "copy/today", entries: { "today.title": { source: mark("Today"), text: "x", status } } }));
  };
  put("hi", "reviewed"); put("ta", "machine");
  writeFileSync(path.join(dir, "manifest.json"), JSON.stringify({ made: "2026-10-05", units: 1, chars: 5, files: { "copy/today": { "today.title": mark("Today") } } }));
  readTranslationsFrom(dir);
});
afterAll(() => { readTranslationsFrom(undefined); rmSync(dir, { recursive: true, force: true }); });
beforeEach(() => { h.statuses = {}; h.set.length = 0; h.audits.length = 0; staff("super_admin"); });

describe("the status of a language", () => {
  it("is changed by a super admin and by content staff, and written to the audit log", async () => {
    for (const role of ["super_admin", "content"]) {
      h.statuses = {}; h.set.length = 0; h.audits.length = 0; staff(role);
      await expect(setLanguageStatus(form("hi", "review"))).rejects.toThrow("moved to /admin/catalogue#languages");
      expect(h.set).toEqual([["hi", "review"]]);
      expect(h.audits).toEqual([[h.viewer, "admin.languages.status", "hi", { name: "Hindi", from: "off", to: "review" }]]);
    }
  });
  it("is not changed by ops, who may use the room but do not answer for what families read", async () => {
    staff("ops");
    await setLanguageStatus(form("hi", "on"));
    expect(h.set).toEqual([]);
    expect(h.audits).toEqual([]);
    expect(mayManageLanguages("ops")).toBe(false);
    expect(mayManageLanguages("content")).toBe(true);
    expect(mayManageLanguages(null)).toBe(false);
  });
  it("is not found for anyone who is not staff", async () => {
    h.viewer = null;
    await expect(setLanguageStatus(form("hi", "on"))).rejects.toThrow("not found");
    staff(null);
    await expect(setLanguageStatus(form("hi", "on"))).rejects.toThrow("not found");
    expect(h.set).toEqual([]);
  });
  it("refuses English, an unknown language and an unknown status", async () => {
    for (const [lang, status] of [["en", "off"], ["xx", "on"], ["hi", "published"], ["hi;drafts", "on"], ["", ""]]) {
      await expect(setLanguageStatus(form(lang, status)), `${lang} ${status}`).rejects.toThrow("moved to /admin/catalogue?languages=unknown#languages");
    }
    expect(h.set).toEqual([]);
    expect(h.audits).toEqual([]);
  });
  it("cannot be switched on while no sentence has been checked by a person, and can be put in review", async () => {
    await expect(setLanguageStatus(form("ta", "on"))).rejects.toThrow("moved to /admin/catalogue?languages=nothing#languages");
    await expect(setLanguageStatus(form("bn", "on"))).rejects.toThrow("languages=nothing");
    expect(h.set).toEqual([]);
    await expect(setLanguageStatus(form("ta", "review"))).rejects.toThrow("moved to /admin/catalogue#languages");
    expect(h.set).toEqual([["ta", "review"]]);
  });
  it("cannot switch Urdu on for families while it is held back, and can put it in review", async () => {
    await expect(setLanguageStatus(form("ur", "on"))).rejects.toThrow("moved to /admin/catalogue?languages=held#languages");
    expect(h.set).toEqual([]);
    expect(h.audits).toEqual([]);
    await expect(setLanguageStatus(form("ur", "review"))).rejects.toThrow("moved to /admin/catalogue#languages");
    expect(h.set).toEqual([["ur", "review"]]);
  });
  it("can be switched on once a person has checked some of it, and switched off again", async () => {
    await expect(setLanguageStatus(form("hi", "on"))).rejects.toThrow("moved to /admin/catalogue#languages");
    await expect(setLanguageStatus(form("hi", "off"))).rejects.toThrow("moved to /admin/catalogue#languages");
    expect(h.set).toEqual([["hi", "on"], ["hi", "off"]]);
    expect(h.audits.map((a) => a[3])).toEqual([{ name: "Hindi", from: "off", to: "on" }, { name: "Hindi", from: "on", to: "off" }]);
  });
  it("writes nothing when the status is already what was asked for", async () => {
    h.statuses = { hi: "review" };
    await setLanguageStatus(form("hi", "review"));
    expect(h.set).toEqual([]);
    expect(h.audits).toEqual([]);
  });
});
