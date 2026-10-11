// Eyes Opener: The address a scheduler calls: POST /api/jobs/daily and POST /api/jobs/weekly, with the header `x-job-secret`.
/**
 * The address a scheduler calls: POST /api/jobs/daily and POST /api/jobs/weekly, with the header `x-job-secret`.
 * Anything else, a wrong secret, or no secret set on the server answers "not found".
 * The answer holds job names and counts only.
 */
import { isCadence, jobSecretMatches, runJobs } from "@/lib/jobs";

export const dynamic = "force-dynamic";

const notFound = () => new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });

export async function POST(req: Request, { params }: { params: Promise<{ cadence: string }> }) {
  const { cadence } = await params;
  if (!isCadence(cadence) || !jobSecretMatches(req.headers.get("x-job-secret"))) return notFound();
  const results = await runJobs(cadence);
  return Response.json({ cadence, ok: results.every((r) => r.ok), results }, { status: results.every((r) => r.ok) ? 200 : 500, headers: { "cache-control": "no-store" } });
}

export const GET = notFound;
