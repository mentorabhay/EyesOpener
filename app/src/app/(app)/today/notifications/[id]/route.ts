/**
 * GET /today/notifications/<id>: opens a notice. It is marked read and the page it leads to opens (lib/notify/service.ts
 * openNotice). The bell, the notices page and the browser's own notices all lead here.
 */
import { NextResponse } from "next/server";
import { openNotice } from "@/lib/notify/service";
import { getMember } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const m = await getMember();
  const to = m && /^[0-9a-f-]{36}$/.test(id) ? await openNotice(m.user.id, id) : m ? "/today/notifications" : "/login";
  return NextResponse.redirect(new URL(to, req.url), 303);
}
