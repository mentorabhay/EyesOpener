"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/auth";
import { setEnquiryStatus } from "@/lib/site";

const Move = z.object({ id: z.uuid(), to: z.enum(["answered", "closed"]) });

/** Records that a person answered or closed an enquiry. It sends nothing to the person who wrote. */
export async function markEnquiry(formData: FormData) {
  const viewer = await requireStaff("enquiries");
  const parsed = Move.safeParse({ id: formData.get("id"), to: formData.get("to") });
  if (!parsed.success) return;
  const row = await setEnquiryStatus(parsed.data.id, parsed.data.to, viewer.user.id);
  /* The audit trail names the organisation or the kind, never the message or the email address. */
  if (row) await audit(viewer, `admin.enquiries.${parsed.data.to}`, row.id, { kind: row.kind, name: row.organisation || row.name });
  revalidatePath("/admin", "layout");
}
