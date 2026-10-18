/**
 * The eye-care chat: POST /api/assistant with the header `x-iopener-assistant: 1` and
 * `{ topic: "eyes" | "app", question, history }`. Open to visitors and members; a device in child mode is refused.
 *
 * The fixed rules run first (src/lib/assist/chat-rules.ts): a question that names an emergency sign gets the fixed
 * emergency answer and no model reads it. Everything else goes to the edition's assistant, which counts it against
 * the household's share for the day (a visitor's network has a smaller one). Nothing of the conversation is kept.
 * In an edition with no assistant, and for any other request, the address answers "not found".
 */
import { headers } from "next/headers";
import { assist } from "@/lib/assist/extra";
import { isTopic, tidyHistory, tidyQuestion, urgentSign } from "@/lib/assist/chat-rules";
import { getMember } from "@/lib/session";
import { networkAddress } from "@/lib/signin/limit";

export const dynamic = "force-dynamic";
const notFound = () => new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
const ok = (b: unknown) => Response.json(b, { headers: { "cache-control": "no-store" } });

export async function POST(req: Request) {
  if (!assist.available || req.headers.get("x-iopener-assistant") !== "1" || req.headers.get("sec-fetch-site") === "cross-site") return notFound();
  const body = (await req.json().catch(() => null)) as { topic?: unknown; question?: unknown; history?: unknown } | null;
  const question = tidyQuestion(body?.question);
  if (!body || !isTopic(body.topic) || !question) return ok({ ok: false, why: "failed" });

  const member = await getMember();
  if (member?.childMode) return notFound();

  const sign = urgentSign(question);
  if (sign) return ok({ ok: true, urgent: sign });

  const hops = Number.parseInt(process.env.SIGNIN_PROXY_HOPS ?? "0", 10);
  const network = networkAddress((await headers()).get("x-forwarded-for"), Number.isInteger(hops) && hops >= 0 && hops <= 5 ? hops : 0);
  const answer = await assist.chat({ member, network }, body.topic, question, tidyHistory(body.history));
  return ok(answer);
}
