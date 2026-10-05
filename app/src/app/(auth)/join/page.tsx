import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { StateForm } from "@/components/together/StateForm";
import { Btn, Card, PageHead } from "@/components/ui";
import { join as t } from "@/copy/family";
import { db, schema } from "@/db";
import { getViewer } from "@/lib/auth";
import { joinHousehold } from "./actions";

export const generateMetadata = (): Metadata => ({ title: t.title, robots: { index: false, follow: false } });

/** An invite code as it may arrive in a link: letters and digits only, so nothing else rides along into the sign-in page's address. */
const tidy = (code: string | undefined) => (code ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 20);

export default async function JoinPage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const code = tidy((await searchParams).code);
  const viewer = await getViewer();
  /* Nobody signed in: sign in first, then come straight back here with the code still filled in. */
  if (!viewer) redirect(`/login?next=${encodeURIComponent(code ? `/join?code=${code}` : "/join")}`);
  const [household] = viewer.user.accountId
    ? await db.select({ name: schema.account.displayName }).from(schema.account).where(eq(schema.account.id, viewer.user.accountId)).limit(1)
    : [];

  return (
    <main className="page" style={{ maxWidth: 560, marginInline: "auto" }}>
      <PageHead title={t.title} sub={t.sub} />
      <div className="bento">
        <Card>
          {household ? (
            <>
              <p>{t.already(household.name)}</p>
              <div className="row"><Btn href={viewer.home}>{t.home}</Btn></div>
            </>
          ) : (
            <StateForm action={joinHousehold} submit={t.submit} primary>
              <div className="field">
                <label htmlFor="invite-code">{t.code}</label>
                <input id="invite-code" type="text" name="code" required maxLength={20} autoComplete="off" autoCapitalize="characters" defaultValue={code} />
              </div>
            </StateForm>
          )}
        </Card>
      </div>
      {!household && viewer.real && viewer.home === "/login" && <p className="muted small" style={{ marginTop: 14 }}>{t.noCode} <Link href="/login/welcome">{t.startOwn}</Link>.</p>}
    </main>
  );
}
