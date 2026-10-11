// Eyes Opener: Where a language is chosen: the card in Settings and the menu at the foot of the public site. Server parts.
/**
 * Where a language is chosen: the card in Settings and the menu at the foot of the public site. Server parts.
 * Only languages offered to this person are listed: English, those staff have switched on, and for staff those
 * in review. The form itself is src/i18n/choose.tsx.
 */
import { jar as cookieJar } from "@/lib/cookie-jar";
import { Card } from "@/components/ui";
import { languages as t } from "@/copy/languages";
import { getViewer } from "@/lib/auth";
import { ChooseLanguage, type Offered } from "./choose";
import { draftsAllowed, DRAFTS_COOKIE, offeredLangs, statusOfLang } from "./decide";
import { LANGS, LANGUAGE, SOURCE } from "./languages";
import { current } from "./runtime";
import { langStatuses } from "./status";

/** The languages this person may choose, each with its own name. */
async function offeredNow(staff: boolean): Promise<{ offered: Offered[]; preview: boolean }> {
  const [statuses, jar] = await Promise.all([langStatuses(), cookieJar()]);
  /* the development switch for drafts lists every language, for the developer's own browser only */
  const preview = draftsAllowed(process.env.NODE_ENV === "production", jar.get(DRAFTS_COOKIE)?.value);
  const list = preview ? [...LANGS] : offeredLangs(statuses, staff);
  return { preview, offered: list.map((l) => ({ lang: l, name: LANGUAGE[l].own, review: !preview && l !== SOURCE && statusOfLang(statuses, l) === "review" })) };
}

/** The card in Settings. A guardian chooses for the household; everyone else can see what is chosen. */
export async function LanguageCard({ canChange, staff, span = 6 }: { canChange: boolean; staff: boolean; span?: 5 | 6 | 7 | 12 }) {
  const { offered, preview } = await offeredNow(staff), now = current().lang, c = t.choose;
  return (
    <Card title={c.title} span={span}>
      {offered.length < 2 ? <p className="muted small">{c.onlyEnglish}</p> : canChange ? (
        <>
          <p className="muted small">{c.sub} {c.childFollows}</p>
          <ChooseLanguage offered={offered} now={now} />
          <p className="muted small">{c.mixed} {c.notTranslated}</p>
        </>
      ) : (
        <>
          <dl className="kv"><div><dt>{c.label}</dt><dd lang={now}>{LANGUAGE[now].own}</dd></div></dl>
          <p className="muted small">{c.guardianOnly}</p>
        </>
      )}
      {preview && <p className="notice" data-b="warn">{c.drafts}</p>}
    </Card>
  );
}

/** The menu at the foot of the public site. Nothing is drawn while English is the only language offered. */
export async function SiteLanguage() {
  const viewer = await getViewer();
  const { offered } = await offeredNow(!!viewer?.staff);
  if (offered.length < 2) return null;
  return <ChooseLanguage offered={offered} now={current().lang} compact />;
}
