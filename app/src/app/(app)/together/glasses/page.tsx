import type { Metadata } from "next";
import { Card, Chip, PageHead } from "@/components/ui";
import { together } from "@/copy/together";
import { ideaBySlug } from "@/data";
import { dayText, glassesLog } from "@/lib/community";
import { requireMember } from "@/lib/session";

const t = together.glasses;
const idea = ideaBySlug("travelling-glasses")!;
export const metadata: Metadata = { title: idea.name };

export default async function GlassesPage() {
  const m = await requireMember();
  const found = await glassesLog(m.profile.id);
  if (!found) {
    return (
      <>
        <PageHead title={idea.name} sub={idea.what} crumb={[together.crumb]} />
        <p className="notice">{t.noPair}</p>
      </>
    );
  }
  const { pair, legs } = found;
  const mine = legs.findLastIndex((l) => l.profileId === m.profile.id);
  const before = legs[mine - 1];

  return (
    <>
      <PageHead
        title={idea.name} sub={idea.what} crumb={[together.crumb]}
        stats={[{ value: pair.code, label: t.stats.pair }, { value: legs.length, label: t.stats.wearers }]}
      />
      <div className="bento">
        {before && (
          <Card title={t.passedOn(before.displayName)} span={5} tone="grad">
            {before.note ? <blockquote style={{ margin: 0 }}>{before.note}</blockquote> : <p className="muted">{t.noNote}</p>}
          </Card>
        )}
        <Card title={t.logbook} span={7}>
          <ol style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {legs.map((l, i) => (
              <li className="ins" key={l.id}>
                <div className="tx">
                  <b>{l.displayName}</b>{i === mine && ` (${t.you})`}, {l.city}
                  <div className="sub">{t.span(dayText(l.startedAt), l.finishedAt && dayText(l.finishedAt))}</div>
                  {l.note && <div className="sub">{l.note}</div>}
                </div>
                <Chip tone={l.status === "wearing" ? "ok" : "plain"}>{t.status[l.status] ?? l.status}</Chip>
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}
