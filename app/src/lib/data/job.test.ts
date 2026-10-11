// Eyes Opener: Unit and regression test suite verifying job functionality.
import { describe, expect, it } from "vitest";
import { data, dataAdmin } from "@/copy/data";
import { site } from "@/copy/site";
import { JOBS } from "@/lib/jobs";
import { JOB_NAME } from "./requests";
import { COPY_DAYS, WAIT_DAYS } from "./state";

describe("the data requests job", () => {
  const job = JOBS.find((j) => j.name === JOB_NAME);

  it("is one of the daily jobs, and says in a plain sentence what it does", () => {
    expect(JOBS.filter((j) => j.name === JOB_NAME)).toHaveLength(1);
    expect(job?.cadence).toBe("daily");
    expect(job?.what).toContain(`${WAIT_DAYS} days`);
  });

  it("has a label in the staff room for every count it reports", () => {
    expect(Object.keys(dataAdmin.job.counts).sort()).toEqual(["copiesClosed", "copiesReady", "datesSet", "failed", "householdsDeleted", "kept", "profilesDeleted", "signInsLeft", "signInsRemoved"]);
  });
});

describe("what families are told", () => {
  const legal = JSON.stringify([site.legal.privacy, site.legal.children]);

  it("names the same waiting time on the privacy page, the children's data page and in Settings", () => {
    const rights = site.legal.privacy.sections.find((s) => s.id === "rights")!, child = site.legal.children.sections.find((s) => s.id === "rights")!;
    expect(JSON.stringify(rights)).toContain(`Nothing is deleted for ${WAIT_DAYS} days`);
    expect(JSON.stringify(child)).toContain(`waits ${WAIT_DAYS} days`);
    expect(data.all.warn).toContain(`Nothing is deleted for ${WAIT_DAYS} days`);
    expect(data.one.warn).toContain(`Nothing is deleted for ${WAIT_DAYS} days`);
    expect(data.copy.note).toContain(`After ${COPY_DAYS} days`);
  });

  it("no longer says the copy and the deletion are handled by hand or still being built", () => {
    expect(legal).not.toMatch(/by hand/);
    for (const page of [site.legal.privacy, site.legal.children]) {
      expect(JSON.stringify(page.sections.find((s) => s.id === "rights"))).not.toMatch(/being built/);
    }
  });

  it("says a family's copy includes a counsellor's notes, on both pages", () => {
    expect(JSON.stringify(site.legal.privacy.sections.find((s) => s.id === "rights"))).toMatch(/notes a linked counsellor wrote/);
    expect(JSON.stringify(site.legal.children.sections.find((s) => s.id === "rights"))).toMatch(/notes a linked counsellor wrote/);
  });
});
