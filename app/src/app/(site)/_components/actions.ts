"use server";
/**
 * The enquiry form on the public site. Anyone may post it, so it trusts nothing:
 * every field is checked with zod, a hidden field catches robots, and one email address may write only a few times a day.
 * It stores the message for the staff room. It sends no email and signs nobody in.
 */
import { revalidatePath } from "next/cache";
import { site as t } from "@/copy/site";
import { ENQUIRY_DAILY_LIMIT, ENQUIRY_MAX, ENQUIRY_MIN_AGE, readEnquiry, saveEnquiry, type EnquiryField } from "@/lib/site";

export type EnquiryAnswer = { ok: boolean; message: string; problems?: string[]; fields?: EnquiryField[] } | null;

const e = t.enquiry;
const problemText: Record<EnquiryField, string> = {
  name: e.problems.name(ENQUIRY_MAX.name),
  organisation: e.problems.organisation(ENQUIRY_MAX.organisation),
  email: e.problems.email,
  kind: e.problems.kind,
  message: e.problems.message(ENQUIRY_MAX.message),
  adult: e.problems.adult(ENQUIRY_MIN_AGE),
};
/** The order the fields appear in the form, so the problems are listed top to bottom. */
const FIELD_ORDER: EnquiryField[] = ["name", "organisation", "email", "kind", "message", "adult"];

export async function sendEnquiry(_prev: EnquiryAnswer, form: FormData): Promise<EnquiryAnswer> {
  /* Text fields only: a file sent in place of a field is dropped. */
  const fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const read = readEnquiry(fields);
  if (!read.ok) {
    const bad = FIELD_ORDER.filter((f) => read.fields.includes(f));
    return { ok: false, message: e.result.invalid, problems: bad.map((f) => problemText[f]), fields: bad };
  }
  /* A robot filled the hidden field. It is told all went well, and nothing is stored. */
  if (read.robot) return { ok: true, message: e.result.sent };
  try {
    const saved = await saveEnquiry(read.data);
    if (saved === "limit") return { ok: false, message: e.result.limit(ENQUIRY_DAILY_LIMIT) };
  } catch {
    return { ok: false, message: e.result.failed };
  }
  revalidatePath("/admin", "layout");
  return { ok: true, message: e.result.sent };
}
