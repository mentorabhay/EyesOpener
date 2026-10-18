"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { account as t } from "@/copy/account";
import { db, schema } from "@/db";
import { requireMember } from "@/lib/session";

export type NameState = { ok: boolean; message: string } | null;

/** Changes the signed-in person's own name. Never in child mode. */
export async function renameMe(_: NameState, form: FormData): Promise<NameState> {
  const m = await requireMember();
  if (m.childMode) return { ok: false, message: t.badName };
  const name = String(form.get("name") ?? "").replace(/\s+/g, " ").trim();
  if (!name || name.length > 60) return { ok: false, message: t.badName };
  await db.update(schema.appUser).set({ displayName: name }).where(eq(schema.appUser.id, m.user.id));
  revalidatePath("/", "layout");
  return { ok: true, message: t.saved };
}
