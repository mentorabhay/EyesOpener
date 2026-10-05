import type { Metadata } from "next";
import { Card, Chip, Empty, PageHead } from "@/components/ui";
import { admin as a } from "@/copy/admin";
import { dayTime, site } from "@/copy/site";
import { requireStaff } from "@/lib/auth";
import { enquiries, nextEnquiryStatuses, type EnquiryStatus } from "@/lib/site";
import css from "../admin.module.css";
import { markEnquiry } from "./actions";

const t = site.admin.enquiries;
export const generateMetadata = (): Metadata => ({ title: a.rooms.enquiries.name });

type Row = Awaited<ReturnType<typeof enquiries>>["open"][number];

const statusOf = (s: string): EnquiryStatus => (s === "answered" || s === "closed" ? s : "new");
const tone = { new: "warn", answered: "ok", closed: "plain" } as const;

function Enquiry({ q }: { q: Row }) {
  const status = statusOf(q.status);
  const next = nextEnquiryStatuses(status).filter((s): s is "answered" | "closed" => s !== "new");
  return (
    <article className="ins">
      <div className="tx stack">
        <div className="row">
          <b>{t.from(q.name, q.organisation)}</b>
          <Chip>{t.kind[q.kind] ?? q.kind}</Chip>
          <Chip tone={tone[status]}>{t.status[status]}</Chip>
        </div>
        <p className={css.quote}>{q.message}</p>
        <p className="sub">
          <a href={`mailto:${q.email}`} aria-label={t.emailOf(q.name)}>{q.email}</a>
          {" · "}{t.sent(dayTime(q.createdAt))}
          {status !== "new" && <>{" · "}{t.by(q.handler)}</>}
        </p>
        {next.length > 0 && (
          <div className="row">
            {next.map((to) => (
              <form key={to} action={markEnquiry}>
                <input type="hidden" name="id" value={q.id} />
                <input type="hidden" name="to" value={to} />
                <button className={`btn btn-sm${to === "answered" ? " btn-d" : ""}`} aria-label={t.markOf[to](q.name)}>{t.mark[to]}</button>
              </form>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export default async function EnquiriesPage() {
  await requireStaff("enquiries");
  const { open, handled } = await enquiries();
  return (
    <>
      <PageHead title={a.rooms.enquiries.name} sub={t.sub} crumb={[{ href: "/admin", label: a.back }]} stats={[{ value: open.length, label: t.stat }]} />
      <div className="bento">
        <Card title={t.open} span={12}>
          {open.length ? <div>{open.map((q) => <Enquiry key={q.id} q={q} />)}</div> : <Empty title={t.emptyOpen.title}><span>{t.emptyOpen.body}</span></Empty>}
          <p className="muted small">{t.note}</p>
        </Card>
        <Card title={t.handled} span={12}>
          {handled.length ? <div>{handled.map((q) => <Enquiry key={q.id} q={q} />)}</div> : <p className="muted">{t.emptyHandled}</p>}
        </Card>
      </div>
    </>
  );
}
