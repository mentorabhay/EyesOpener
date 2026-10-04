import { describe, it, expect } from "vitest";
import { memberCan, isGuardianSeat, isSealedPath, staffCan, staffAreas, resolveStaffRole, sponsorCan, homeFor, MEMBER_ACTIONS, ADMIN_AREAS } from "./roles";

describe("household seats", () => {
  it("lets a guardian do everything", () => { for (const a of MEMBER_ACTIONS) expect(memberCan("guardian", a)).toBe(true); });
  it("keeps seat management with the first guardian", () => {
    expect(memberCan("co_guardian", "seats")).toBe(false);
    expect(memberCan("co_guardian", "consent")).toBe(true);
  });
  it("lets a cheer seat look and encourage, nothing else", () => {
    expect(MEMBER_ACTIONS.filter((a) => memberCan("circle", a))).toEqual(["view", "encourage"]);
    expect(isGuardianSeat("circle")).toBe(false);
  });
  it("gives nothing to a person with no seat", () => { expect(memberCan(null, "view")).toBe(false); });
  it("limits child mode to looking, training and tests, whoever is signed in", () => {
    expect(MEMBER_ACTIONS.filter((a) => memberCan("guardian", a, true))).toEqual(["view", "train", "test"]);
    expect(memberCan("circle", "train", true)).toBe(false);
  });
});

describe("child mode containment", () => {
  it("seals grown-up screens and their sub-pages", () => {
    for (const p of ["/settings", "/settings/triage", "/family", "/admin/moderation", "/counsellor", "/sponsor/groups", "/together/share", "/login"]) expect(isSealedPath(p)).toBe(true);
  });
  it("leaves the child's screens open", () => {
    for (const p of ["/today", "/train", "/train/games/firefly-catch/play", "/test/acuity/run", "/together", "/together/mail", "/settingsx"]) expect(isSealedPath(p)).toBe(false);
  });
});

describe("staff rooms", () => {
  it("opens every room to a super admin", () => { expect(staffAreas("super_admin")).toEqual([...ADMIN_AREAS]); });
  it("keeps ops out of staff management, the switchboard and stories", () => {
    expect(staffCan("ops", "moderation")).toBe(true);
    for (const a of ["staff", "switchboard", "stories"] as const) expect(staffCan("ops", a)).toBe(false);
  });
  it("gives content the overview, the catalogue and stories", () => { expect(staffAreas("content")).toEqual(["overview", "catalogue", "stories"]); });
  it("lets ops and content set the status of library items", () => { expect(staffCan("ops", "catalogue")).toBe(true); expect(staffCan("content", "catalogue")).toBe(true); });
  it("gives nothing without a role", () => { expect(staffAreas(null)).toEqual([]); });
  it("lets the database column win, and falls back to ADMIN_EMAILS", () => {
    expect(resolveStaffRole("ops", "owner@example.com", "owner@example.com")).toBe("ops");
    expect(resolveStaffRole(null, "Owner@Example.com", " owner@example.com , x@y.z")).toBe("super_admin");
    expect(resolveStaffRole(null, "someone@example.com", "owner@example.com")).toBeNull();
    expect(resolveStaffRole(null, "someone@example.com", "")).toBeNull();
  });
});

describe("sponsors and landing", () => {
  it("lets editors work on groups but not on the team", () => {
    expect(sponsorCan("editor", "edit_groups")).toBe(true); expect(sponsorCan("editor", "manage_team")).toBe(false);
    expect(sponsorCan("owner", "manage_team")).toBe(true); expect(sponsorCan(null, "view")).toBe(false);
  });
  it("sends each person to their own area", () => {
    const none = { seat: null, staff: null, counsellor: false, sponsor: false };
    expect(homeFor({ ...none, seat: "guardian" })).toBe("/today");
    expect(homeFor({ ...none, seat: "circle" })).toBe("/circle");
    expect(homeFor({ ...none, staff: "ops" })).toBe("/admin");
    expect(homeFor({ ...none, counsellor: true })).toBe("/counsellor");
    expect(homeFor({ ...none, sponsor: true })).toBe("/sponsor");
    expect(homeFor(none)).toBe("/login");
  });
});
