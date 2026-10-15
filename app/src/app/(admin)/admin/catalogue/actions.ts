"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { audit, requireStaff } from "@/lib/auth";
import { libraryItems, setAllStatuses, setItemStatus } from "@/lib/catalogue";
import { ITEM_KINDS, STATUSES } from "@/lib/status";

const One = z.object({ kind: z.enum(ITEM_KINDS), slug: z.string().min(1).max(80), status: z.enum(STATUSES) });

/** Every screen that lists or opens library items reads the status, so all of them are refreshed. */
const refresh = () => { revalidatePath("/admin", "layout"); revalidatePath("/train", "layout"); revalidatePath("/library"); };

/** Sets who may use one game, one exercise or the cinema. */
export async function setStatus(formData: FormData) {
  const viewer = await requireStaff("catalogue");
  const parsed = One.safeParse({ kind: formData.get("kind"), slug: formData.get("slug"), status: formData.get("status") });
  if (!parsed.success) return;
  const { kind, slug, status } = parsed.data;
  if (!(await setItemStatus(kind, slug, status))) return;
  const name = libraryItems().find((i) => i.kind === kind && i.slug === slug)?.name ?? slug;
  await audit(viewer, "admin.catalogue.status", `${kind}:${slug}`, { status, name });
  refresh();
}

/** Opens everything, or sets every item to the status the evidence framework recommends. */
export async function setAll(formData: FormData) {
  const viewer = await requireStaff("catalogue");
  const to = z.enum(["open", "recommended"]).safeParse(formData.get("to"));
  if (!to.success) return;
  const notOpen = await setAllStatuses(to.data);
  await audit(viewer, to.data === "open" ? "admin.catalogue.all_open" : "admin.catalogue.all_recommended", "library", { notOpen });
  refresh();
}
