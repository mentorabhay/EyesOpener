"use client";
import { useRef, useState, useTransition } from "react";
import { assistCopy } from "@/copy/assist";
import { together } from "@/copy/together";
import type { IdeaFields } from "@/lib/assist/types";
import { readStory, type StoryReading } from "./actions";

const t = assistCopy.share;
const TEXT_FIELDS = ["title", "forWhom", "doWhat", "howMuch"] as const;

/** Writes the suggested lines into the form. A line the member already wrote is left alone; true when one was. */
function fill(form: HTMLFormElement, fields: IdeaFields): boolean {
  const at = (name: string) => form.elements.namedItem(name) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  let kept = false;
  for (const name of TEXT_FIELDS) {
    const el = at(name);
    if (!el || !fields[name]) continue;
    if (el.value.trim()) kept = true; else el.value = fields[name];
  }
  const weeks = at("weeks"), moves = at("moves");
  if (weeks && fields.weeks !== null) weeks.value = String(fields.weeks);
  if (moves && fields.moves !== null) moves.value = fields.moves;
  return kept;
}

/**
 * The part of the share form an assistant adds: it reads the story, suggests the lines and lists ideas that say
 * something similar. It only fills in the form. The member reads, changes and sends it; nothing is saved here.
 * It is drawn only in an edition that has an assistant.
 */
export function ShareHelper() {
  const box = useRef<HTMLDivElement>(null);
  const [reading, setReading] = useState<StoryReading | null>(null);
  const [kept, setKept] = useState(false);
  const [pending, start] = useTransition();
  const s = reading?.suggestion;

  function read() {
    const form = box.current?.closest("form") ?? null;
    const story = (form?.elements.namedItem("story") as HTMLTextAreaElement | null)?.value ?? "";
    start(async () => {
      const got = await readStory(story);
      setReading(got);
      setKept(form && got.suggestion.ok ? fill(form, got.suggestion.fields) : false);
    });
  }

  return (
    <div ref={box} className="notice stack">
      <b>{t.title}</b>
      <span className="small">{t.what}</span>
      <div className="row"><button type="button" className="btn btn-sm btn-d" onClick={read} disabled={pending}>{pending ? t.working : t.button}</button></div>
      <input type="hidden" name="assisted" value={s?.ok ? "1" : ""} />
      <div role="status" className="stack">
        {s?.ok && (
          <>
            <p><b>{t.done}</b></p>
            {s.standIn && <p className="small">{assistCopy.standIn}</p>}
            {kept && <p className="small">{t.kept}</p>}
            {s.gaps.length > 0 && <ul style={{ margin: 0, paddingLeft: 18 }}>{s.gaps.map((g) => <li key={g}>{t.gaps[g]}</li>)}</ul>}
          </>
        )}
        {s && !s.ok && s.why === "short" && <p>{t.short}</p>}
        {s && !s.ok && s.why === "refused" && (
          <>
            <p><b>{t.refused[s.refusal]}</b></p>
            {s.reasons.length > 0 && <ul style={{ margin: 0, paddingLeft: 18 }}>{s.reasons.map((r) => <li key={r}>{r}</li>)}</ul>}
            {s.refusal === "not_an_idea" ? null : <p className="small">{together.shareForm.rules}</p>}
          </>
        )}
        {s && !s.ok && s.why !== "short" && s.why !== "refused" && s.why !== "none" && <p>{assistCopy.closed[s.why]} {t.still}</p>}
        {reading && reading.similar.length > 0 && (
          <div className="stack">
            <b>{t.similar.title}</b>
            <span className="small">{t.similar.what}{reading.similar.some((i) => i.standIn) ? ` ${assistCopy.standIn}` : ""}</span>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {reading.similar.map((i) => (
                <li key={i.id}>
                  <a href={`/together/ideas/${i.id}`} target="_blank" rel="noopener">{i.title}</a> <span className="small muted">{i.forWhom} ({t.similar.opens})</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
