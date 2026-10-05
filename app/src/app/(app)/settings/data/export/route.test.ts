import { beforeEach, describe, expect, it, vi } from "vitest";

const getMember = vi.fn(), copyToDownload = vi.fn(), markDownloaded = vi.fn(), buildFamilyFile = vi.fn();
vi.mock("@/lib/session", () => ({ getMember: () => getMember(), todayKey: () => "2026-10-05" }));
vi.mock("@/lib/data/requests", () => ({ copyToDownload: (...a: unknown[]) => copyToDownload(...a), markDownloaded: (...a: unknown[]) => markDownloaded(...a) }));
vi.mock("@/lib/data/export", () => ({ buildFamilyFile: (...a: unknown[]) => buildFamilyFile(...a) }));

import { memberCan, type MemberAction, type Seat } from "@/lib/roles";
import { GET } from "./route";

const member = (seat: Seat, childMode = false) => ({
  account: { id: "household-1" }, user: { id: "user-1", email: "guardian@iopener.test" }, childMode,
  can: (a: MemberAction) => memberCan(seat, a, childMode),
});
const ready = { id: "request-1", accountId: "household-1" };

describe("downloading the family's copy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    copyToDownload.mockResolvedValue(ready);
    buildFamilyFile.mockResolvedValue({ format: "iopener-family-data", data: { sessions: [{ id: "s1" }] } });
  });

  const refused = async () => {
    const res = await GET();
    expect(res.status).toBe(404);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.text()).toBe("Not found\n");
    expect(buildFamilyFile).not.toHaveBeenCalled();
    expect(markDownloaded).not.toHaveBeenCalled();
  };

  it("answers not found when nobody is signed in", async () => {
    getMember.mockResolvedValue(null);
    await refused();
  });

  it("answers not found for a cheer seat, even when a copy is ready", async () => {
    getMember.mockResolvedValue(member("circle"));
    await refused();
  });

  it("answers not found in child mode, whoever is signed in", async () => {
    getMember.mockResolvedValue(member("guardian", true));
    await refused();
    /* Even if the seat rules were ever loosened, child mode alone closes the download. */
    getMember.mockResolvedValue({ ...member("guardian", true), can: () => true });
    await refused();
  });

  it("answers not found when no copy was asked for, or its days ran out", async () => {
    getMember.mockResolvedValue(member("guardian"));
    copyToDownload.mockResolvedValue(null);
    await refused();
  });

  it("gives a guardian and a co-guardian the file of their own household, taken from the sign-in and nowhere else", async () => {
    for (const seat of ["guardian", "co_guardian"] as const) {
      vi.clearAllMocks();
      const m = member(seat);
      getMember.mockResolvedValue(m);
      const res = await GET();
      expect(res.status).toBe(200);
      expect(copyToDownload).toHaveBeenCalledWith(m, expect.any(Date));
      expect(buildFamilyFile).toHaveBeenCalledWith("household-1", { id: "user-1", email: "guardian@iopener.test" }, expect.any(Date));
      expect(markDownloaded).toHaveBeenCalledWith("request-1", expect.any(Date));
      expect(JSON.parse(await res.text())).toMatchObject({ format: "iopener-family-data", data: { sessions: [{ id: "s1" }] } });
    }
    /* The handler reads nothing from the request: no address, query or header can name another household. */
    expect(GET.length).toBe(0);
  });

  it("sends the file as a download that is never stored along the way", async () => {
    getMember.mockResolvedValue(member("guardian"));
    const res = await GET();
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="iopener-family-data-2026-10-05.json"');
    expect(res.headers.get("cache-control")).toBe("private, no-store, max-age=0");
    expect(res.headers.get("x-robots-tag")).toContain("noindex");
  });

  it("answers not found if the household vanished between the check and the read", async () => {
    getMember.mockResolvedValue(member("guardian"));
    buildFamilyFile.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(404);
    expect(markDownloaded).not.toHaveBeenCalled();
  });
});
