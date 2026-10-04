import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { StateForm } from "@/components/together/StateForm";
import { Btn, Card, PageHead } from "@/components/ui";
import { join as t } from "@/copy/family";
import { db, schema } from "@/db";
import { requireViewer } from "@/lib/auth";
import { joinHousehold } from "./actions";

export const metadata: Metadata = { title: t.title };

export default async function JoinPage() {
  const viewer = await requireViewer();
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
                <input id="invite-code" type="text" name="code" required maxLength={20} autoComplete="off" autoCapitalize="characters" />
              </div>
            </StateForm>
          )}
        </Card>
      </div>
    </main>
  );
}
