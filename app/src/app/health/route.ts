/**
 * Answers "ok" without touching the database. For the host's health checks and for smoke tests.
 * The path is /health, not /healthz: Cloud Run keeps paths ending in "z" for itself.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response("ok\n", { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
}
