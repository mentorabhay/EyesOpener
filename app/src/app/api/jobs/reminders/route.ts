/**
 * POST /api/jobs/reminders with the header `x-job-secret`: sends every reminder that is due now, in the app and by
 * email (src/lib/notify/service.ts). Safe to call as often as wanted; a reminder fires at most once a local day.
 * How often a scheduler calls it is the owner's choice (the plan allows three scheduler jobs). Anything else, a wrong
 * secret, or no secret set answers "not found". The answer holds counts only.
 */
import { jobSecretMatches } from "@/lib/jobs";
import { sendDueReminders } from "@/lib/notify/service";

export const dynamic = "force-dynamic";
const notFound = () => new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export async function POST(req: Request) {
  if (!jobSecretMatches(req.headers.get("x-job-secret"))) return notFound();
  const counts = await sendDueReminders();
  return Response.json({ ok: true, counts }, { headers: { "cache-control": "no-store" } });
}

export const GET = notFound;
