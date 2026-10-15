"use server";
import { assist } from "@/lib/assist/extra";
import type { ExamParagraph } from "@/lib/assist/types";
import { requireMember } from "@/lib/session";
import { examFacts, summaryData } from "./facts";

/**
 * Asks the assistant for one plain-words paragraph about the numbers of the summary page.
 * The numbers are read again here, on the server: nothing the browser sends goes into the paragraph.
 * Nothing is stored. A grown-up asks for it; child mode and cheer seats cannot.
 * In an edition with no assistant this answers "none" and the page does not offer it.
 */
export async function plainWords(): Promise<ExamParagraph> {
  const m = await requireMember();
  if (!assist.available || m.childMode || !m.can("test")) return { ok: false, why: "none" };
  const facts = examFacts(m, await summaryData(m));
  if (facts.results.length === 0) return { ok: false, why: "nothing" };
  return assist.examParagraph(m, facts).catch((): ExamParagraph => ({ ok: false, why: "failed" }));
}
