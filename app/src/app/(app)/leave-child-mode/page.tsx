import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { StateForm } from "@/components/together/StateForm";
import { Card, PageHead } from "@/components/ui";
import { leave as t } from "@/copy/family";
import { requireMember } from "@/lib/session";
import { leaveChildMode } from "./actions";

export const metadata: Metadata = { title: t.title };

export default async function LeaveChildModePage() {
  const m = await requireMember();
  if (!m.childMode) redirect(m.viewer.home);
  return (
    <>
      <PageHead title={t.title} sub={t.sub} />
      <div className="bento">
        <Card span={6}>
          <StateForm action={leaveChildMode} submit={t.submit} primary>
            <div className="field">
              <label htmlFor="exit-pin">{t.pin}</label>
              <input id="exit-pin" className="input" type="password" name="pin" inputMode="numeric" pattern="[0-9]{4,6}" maxLength={6} required autoComplete="off" />
            </div>
          </StateForm>
        </Card>
      </div>
    </>
  );
}
