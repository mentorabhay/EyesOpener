// Eyes Opener: Blocks shared by the pages for counsellors and for sponsors: what a role sees, the steps to take part, the form. .
/** Blocks shared by the pages for counsellors and for sponsors: what a role sees, the steps to take part, the form. */
import { site as t } from "@/copy/site";
import { ENQUIRY_KINDS, ENQUIRY_MAX, ENQUIRY_MIN_AGE, HONEYPOT_FIELD, type EnquiryKind } from "@/lib/site";
import { EnquiryForm } from "./enquiry-form";
import { Head, Section } from "./parts";

export function SeesAndNot({ can, cannot }: { can: { title: string; items: string[] }; cannot: { title: string; items: string[] } }) {
  return (
    <div className="s-grid two">
      <article className="s-card s-reveal">
        <h3>{can.title}</h3>
        <ul className="s-points yes">{can.items.map((line) => <li key={line}><span>{line}</span></li>)}</ul>
      </article>
      <article className="s-card s-reveal">
        <h3>{cannot.title}</h3>
        <ul className="s-points no">{cannot.items.map((line) => <li key={line}><span>{line}</span></li>)}</ul>
      </article>
    </div>
  );
}

export function TakePart({ id, kicker, title, items }: { id: string; kicker: string; title: string; items: { title: string; body: string }[] }) {
  return (
    <Section id={id} alt>
      <Head id={id} kicker={kicker} title={title} />
      <ol className="s-steps across">
        {items.map((s) => <li key={s.title} className="s-reveal"><h3>{s.title}</h3><p>{s.body}</p></li>)}
      </ol>
    </Section>
  );
}

export function WriteToUs({ kind }: { kind: EnquiryKind }) {
  return (
    <section className="s-section" id="write" aria-labelledby="write-h">
      <div className="s-wrap narrow">
        <div className="s-head">
          <p className="s-kicker">{t.enquiry.kicker}</p>
          <h2 id="write-h">{t.enquiry.title}</h2>
          <p className="s-lead">{t.enquiry.lead}</p>
        </div>
        <div className="s-card"><EnquiryForm kind={kind} rules={{ kinds: ENQUIRY_KINDS, max: ENQUIRY_MAX, minAge: ENQUIRY_MIN_AGE, trap: HONEYPOT_FIELD }} /></div>
      </div>
    </section>
  );
}
