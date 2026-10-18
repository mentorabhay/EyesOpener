import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Btn, Card, PageHead } from "@/components/ui";
import { signin as t } from "@/copy/signin";
import { getViewer } from "@/lib/auth";
import { mayTryOut } from "@/lib/session";
import { startOwnSpace } from "../actions";

export const generateMetadata = (): Metadata => ({ title: t.own.title, robots: { index: false, follow: false } });

/**
 * /login/own: a counsellor, a sponsor's person or a staff member starts a household for their own eyes (Ved, 18 October
 * 2026). Anyone else answers "not found"; a person who has one is offered to open it.
 */
export default async function OwnSpacePage() {
  const viewer = await getViewer();
  if (!viewer || !mayTryOut(viewer)) notFound();
  const has = !!viewer.user.accountId && !!viewer.seat;
  return (
    <main className="page" style={{ maxWidth: 620, marginInline: "auto" }}>
      <PageHead title={t.own.title} sub={t.own.sub} />
      <Card>
        {has ? (
          <><p>{t.own.has}</p><div className="row"><Btn href="/today" kind="g">{t.own.open}</Btn></div></>
        ) : (
          <>
            <ul>{t.own.points.map((p) => <li key={p}>{p}</li>)}</ul>
            <form action={startOwnSpace} className="row">
              <button type="submit" className="btn btn-g">{t.own.submit}</button>
              <Btn href={viewer.home}>{t.own.back}</Btn>
            </form>
          </>
        )}
      </Card>
    </main>
  );
}
