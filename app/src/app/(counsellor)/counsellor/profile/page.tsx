import type { Metadata } from "next";
import { Card, PageHead, Void } from "@/components/ui";
import { counsellor as t, day } from "@/copy/counsellor";
import { requireCounsellor } from "@/lib/auth";

export const metadata: Metadata = { title: t.profile.title };

export default async function CounsellorProfile() {
  const { user } = await requireCounsellor();
  const p = t.profile;
  return (
    <>
      <PageHead title={p.title} sub={p.sub} />
      <div className="bento">
        <Card span={7}>
          <dl className="kv">
            <div><dt>{p.rows.name}</dt><dd>{user.displayName}</dd></div>
            <div><dt>{p.rows.email}</dt><dd style={{ overflowWrap: "anywhere" }}>{user.email}<small>{p.about}</small></dd></div>
            <div><dt>{p.rows.verified}</dt><dd>{user.counsellorVerifiedAt ? day(user.counsellorVerifiedAt) : <Void />}</dd></div>
          </dl>
          <p className="muted small">{p.change}</p>
        </Card>
      </div>
    </>
  );
}
