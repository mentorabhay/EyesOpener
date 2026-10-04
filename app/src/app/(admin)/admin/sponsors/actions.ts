"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { moveSponsor, type SponsorMove } from "@/lib/admin";
import { audit, requireStaff } from "@/lib/auth";

async function move(formData: FormData, step: SponsorMove) {
  const viewer = await requireStaff("sponsors");
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const row = await moveSponsor(id.data, step, viewer.user.id);
  if (row) await audit(viewer, `admin.sponsors.${step}`, row.id, { name: row.name, status: row.status });
  revalidatePath("/admin", "layout");
}

/** A sponsor waiting for approval becomes approved. */
export async function approve(formData: FormData) { await move(formData, "approve"); }

/** An approved sponsor is suspended: its people lose the sponsor portal. */
export async function suspend(formData: FormData) { await move(formData, "suspend"); }

/** A suspended sponsor is approved again. */
export async function restore(formData: FormData) { await move(formData, "restore"); }
