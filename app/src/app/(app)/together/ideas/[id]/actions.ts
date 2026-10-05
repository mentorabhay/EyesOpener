"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/together/StateForm";
import { experiments } from "@/copy/experiments";
import { together } from "@/copy/together";
import { mayJoin, protocolById } from "@/lib/community";
import { joinExperiment as join } from "@/lib/experiment-data";
import { requireMember } from "@/lib/session";

const t = together.idea;
const x = experiments.join;

/**
 * Joins the active profile to an idea's open experiment, in the group the member picked: trying the idea, or
 * carrying on as usual. Nobody is put in a group by chance. One enrolment per profile.
 */
export async function joinExperiment(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("share")) return { ok: false, message: together.cannot.share };
  const arm = z.enum(["tried", "control"]).safeParse(form.get("arm"));
  if (!arm.success) return { ok: false, message: x.pickFirst };
  const found = await protocolById(String(form.get("protocolId") ?? ""), m.profile.id);
  if (!found || found.protocol.status !== "published" || found.experiment?.status !== "open") return { ok: false, message: t.gone };
  if (!(await mayJoin(m))) return { ok: false, message: x.needsConsent(m.profile.displayName) };
  const outcome = await join(m, found.experiment.id, found.protocol.id, arm.data);
  revalidatePath("/together", "layout");
  if (outcome === "joined") return { ok: true, message: x.joined, href: "/together/experiments", hrefLabel: x.open };
  return { ok: false, message: outcome === "left_before" ? x.leftBefore : x.already };
}
