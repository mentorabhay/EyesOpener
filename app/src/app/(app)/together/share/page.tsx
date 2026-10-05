import type { Metadata } from "next";
import { Card, PageHead } from "@/components/ui";
import { StateForm } from "@/components/together/StateForm";
import { together } from "@/copy/together";
import { tests } from "@/data";
import { assist } from "@/lib/assist/extra";
import { requireMember } from "@/lib/session";
import { shareIdea } from "./actions";
import { ShareHelper } from "./helper";

const t = together.shareForm;
export const metadata: Metadata = { title: t.title };

export default async function SharePage() {
  const m = await requireMember();
  /* Only an edition with an assistant offers to suggest the lines, and only while it can answer. */
  const helper = assist.available && m.can("share") && (await assist.ready("idea").catch(() => false));
  return (
    <>
      <PageHead title={t.title} sub={t.sub} crumb={[together.crumb]} />
      <div className="bento">
        <Card span={8}>
          {!m.can("share") ? <p className="notice">{together.cannot.share}</p> : (
            <>
              <p className="notice">{t.rules}</p>
              <StateForm action={shareIdea} submit={t.submit} primary>
                <div className="field">
                  <label htmlFor="story">{t.story}</label>
                  <textarea id="story" name="story" required minLength={20} maxLength={2000} rows={6} aria-describedby="story-hint" />
                  <span id="story-hint" className="muted small">{t.storyHint}</span>
                </div>
                {helper && <ShareHelper />}
                <div className="field"><label htmlFor="title">{t.name}</label><input id="title" name="title" type="text" required minLength={3} maxLength={80} /></div>
                <div className="field"><label htmlFor="forWhom">{t.forWhom}</label><input id="forWhom" name="forWhom" type="text" required minLength={3} maxLength={200} /></div>
                <div className="field"><label htmlFor="doWhat">{t.doWhat}</label><textarea id="doWhat" name="doWhat" required minLength={3} maxLength={400} rows={3} /></div>
                <div className="field">
                  <label htmlFor="howMuch">{t.howMuch}</label>
                  <input id="howMuch" name="howMuch" type="text" required minLength={3} maxLength={200} aria-describedby="howMuch-hint" />
                  <span id="howMuch-hint" className="muted small">{t.howMuchHint}</span>
                </div>
                <div className="field"><label htmlFor="weeks">{t.weeks}</label><input id="weeks" name="weeks" type="number" required min={1} max={12} step={1} defaultValue={4} /></div>
                <div className="field">
                  <label htmlFor="moves">{t.moves}</label>
                  <select id="moves" name="moves" required>
                    {tests.map((x) => <option key={x.key} value={x.key}>{x.name}: {x.what}</option>)}
                  </select>
                </div>
              </StateForm>
            </>
          )}
        </Card>
      </div>
    </>
  );
}
