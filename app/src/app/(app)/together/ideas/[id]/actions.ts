"use server";
import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/together/StateForm";
import { together } from "@/copy/together";
import { db, schema } from "@/db";
import { mayJoin, protocolById } from "@/lib/community";
import { requireMember } from "@/lib/session";

const t = together.idea;

/** Joins the active profile to an idea's open experiment, in the group that tries it. One enrolment per profile. */
export async function joinExperiment(_: FormState, form: FormData): Promise<FormState> {
  const m = await requireMember();
  if (!m.can("share")) return { ok: false, message: together.cannot.share };
  const found = await protocolById(String(form.get("protocolId") ?? ""), m.profile.id);
  if (!found || found.protocol.status !== "published" || found.experiment?.status !== "open") return { ok: false, message: t.gone };
  if (!(await mayJoin(m))) return { ok: false, message: t.needsConsent(m.profile.displayName) };
  const [row] = await db.insert(schema.experimentEnrolment)
    .values({ experimentId: found.experiment.id, profileId: m.profile.id, arm: "tried" })
    .onConflictDoNothing().returning({ id: schema.experimentEnrolment.id });
  revalidatePath(`/together/ideas/${found.protocol.id}`);
  revalidatePath("/together");
  return row ? { ok: true, message: t.joinedNow } : { ok: false, message: t.alreadyJoined };
}
