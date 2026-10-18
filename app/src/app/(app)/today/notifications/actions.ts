"use server";
import { revalidatePath } from "next/cache";
import { markRead } from "@/lib/notify/service";
import { requireMember } from "@/lib/session";

export async function readOne(formData: FormData) {
  const m = await requireMember();
  const id = String(formData.get("id") ?? "");
  if (/^[0-9a-f-]{36}$/.test(id)) await markRead(m.user.id, id);
  revalidatePath("/", "layout");
}

export async function readAll() {
  const m = await requireMember();
  await markRead(m.user.id);
  revalidatePath("/", "layout");
}
