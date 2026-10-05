import type { Metadata } from "next";
import { GatheringNote, GatheringRows, gatheringHeading } from "@/components/gatherings/review";
import { Btn, Card, Chip, Empty, PageHead } from "@/components/ui";
import { admin as t, ageText } from "@/copy/admin";
import { discovery } from "@/copy/discovery";
import { gatherings } from "@/copy/gatherings";
import { programmeBySlug, testByKey } from "@/data";
import { openModeration, type ModerationEntry } from "@/lib/admin";
import { requireStaff } from "@/lib/auth";
import css from "../admin.module.css";
import { Code, Confirm } from "../parts";
import { approve, remove } from "./actions";

const m = t.moderation;
export const metadata: Metadata = { title: t.rooms.moderation.name };

/** What an AI check left on the item, in words. It is stored as free-form data, so every shape is handled. */
function flagLines(flag: unknown): string[] {
  if (flag === null || flag === undefined) return [];
  if (typeof flag !== "object") return [String(flag)];
  return Object.entries(flag).map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`);
}

function Item({ entry: { item, subject, hazards } }: { entry: ModerationEntry }) {
  const kind = m.kind[item.kind] ?? m.otherKind;
  const name = subject.kind === "protocol" ? subject.title : subject.kind === "gathering" ? gatheringHeading(subject) : kind;
  const flags = flagLines(item.aiFlag);
  return (
    <Card title={name} span={6} as="article" right={<>{subject.kind === "protocol" && <Chip>{kind}</Chip>}<Chip tone="warn">{m.waiting(ageText(item.createdAt))}</Chip></>}>
      <dl className="kv">
        <div><dt>{m.reason}</dt><dd>{item.reason}</dd></div>
        {subject.kind === "protocol" && (
          <>
            <div><dt>{m.by}</dt><dd>{subject.author}</dd></div>
            <div><dt>{m.fields.forWhom}</dt><dd>{subject.forWhom}</dd></div>
            <div><dt>{m.fields.doWhat}</dt><dd>{subject.doWhat}</dd></div>
            <div><dt>{m.fields.howMuch}</dt><dd>{subject.howMuch}</dd></div>
            <div><dt>{m.fields.weeks}</dt><dd className="tnum">{m.weeks(subject.weeks)}</dd></div>
            <div><dt>{m.fields.moves}</dt><dd>{testByKey(subject.moves)?.name ?? subject.moves}</dd></div>
          </>
        )}
        {subject.kind === "note" && (
          <>
            <div><dt>{m.by}</dt><dd>{subject.author}</dd></div>
            <div><dt>{m.note.programme}</dt><dd>{programmeBySlug(subject.programme)?.name ?? subject.programme}</dd></div>
            <div><dt>{m.note.week}</dt><dd className="tnum">{subject.week}</dd></div>
            <div><dt>{m.note.signature}</dt><dd>{subject.signature}</dd></div>
          </>
        )}
        {subject.kind === "mail" && <div><dt>{m.mail.from}</dt><dd>{subject.fromName}</dd></div>}
        {subject.kind === "other" && <div><dt>{m.other.id}</dt><dd><Code>{subject.refId}</Code></dd></div>}
        {subject.kind === "gathering" && <GatheringRows subject={subject} />}
      </dl>

      {subject.kind === "protocol" && subject.story && <div className="stack"><h3 className="small muted">{m.fields.story}</h3><p className={css.quote}>{subject.story}</p></div>}
      {(subject.kind === "note" || subject.kind === "mail") && <p className={css.quote}>{subject.body}</p>}
      {subject.kind === "missing" && <p className="notice" data-b="warn">{m.missing}</p>}
      {subject.kind === "mail" && <p className="muted small">{m.mail.onlyItem}</p>}
      {subject.kind === "other" && <p className="muted small">{m.other.onlyItem}</p>}
      {subject.kind === "gathering" && <GatheringNote subject={subject} />}

      {flags.length > 0 && (
        <div className="notice stack" data-b="warn">
          <b>{m.aiFlag}</b>
          <ul style={{ margin: 0, paddingLeft: 18 }}>{flags.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      )}

      {hazards && (
        <div className="notice stack" data-b={hazards.length ? "danger" : "ok"}>
          <b>{m.screen.title}</b>
          {hazards.length ? (
            <>
              <p>{m.screen.hit}</p>
              <ul style={{ margin: 0, paddingLeft: 18 }}>{hazards.map((h) => <li key={h.id}>{h.reason} <span className="muted small">{m.screen.found(h.found)}</span></li>)}</ul>
            </>
          ) : <p>{m.screen.clear}</p>}
        </div>
      )}

      {m.approveNote[subject.kind] && <p className="muted small">{m.approveNote[subject.kind]}</p>}
      <div className="row">
        {subject.kind !== "missing" && (
          <form action={approve}>
            <input type="hidden" name="id" value={item.id} />
            <button className="btn btn-sm btn-d" aria-label={m.approveOf(name)}>{m.approve}</button>
          </form>
        )}
        <Confirm ask={m.remove} warn={m.removeWarn}>
          <form action={remove}>
            <input type="hidden" name="id" value={item.id} />
            <button className="btn btn-sm btn-d">{m.removeYes}</button>
          </form>
        </Confirm>
      </div>
    </Card>
  );
}

export default async function ModerationPage() {
  await requireStaff("moderation");
  const entries = await openModeration();
  return (
    <>
      <PageHead title={t.rooms.moderation.name} sub={m.sub} crumb={[{ href: "/admin", label: t.back }]} stats={[{ value: entries.length, label: m.stat }]} />
      {/* The Discovery Board's question list is kept in this room (package "people"). */}
      <div className="row"><Btn href="/admin/moderation/discovery">{discovery.staff.link}</Btn><Btn href="/admin/moderation/gatherings">{gatherings.staff.link}</Btn></div>
      {entries.length
        ? <div className="bento">{entries.map((entry) => <Item key={entry.item.id} entry={entry} />)}</div>
        : <Empty title={m.empty.title}><span>{m.empty.body}</span></Empty>}
    </>
  );
}
