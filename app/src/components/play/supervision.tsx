// Eyes Opener: "What supervision adds", in brief: what the trial had, what a therapist does, what the counsellor does in the app. .
import { train as t } from "@/copy/train";
import type { Supervision } from "@/data/supervision";
import css from "./guide.module.css";

/** "What supervision adds", in brief: what the trial had, what a therapist does, what the counsellor does in the app. */
export function SupervisionNote({ s }: { s: Supervision }) {
  const x = t.supervision;
  return (
    <>
      <p>{s.trial}</p>
      <p className="small muted">{x.does}</p>
      <ul className={css.list}>{s.does.map((line) => <li key={line}>{line}</li>)}</ul>
      <p className="small">{s.inApp}</p>
      {s.sources.length > 0 && <ol className={css.sources}>{s.sources.map((src) => <li key={src.url}><a href={src.url} target="_blank" rel="noreferrer noopener">{src.label}</a></li>)}</ol>}
    </>
  );
}
