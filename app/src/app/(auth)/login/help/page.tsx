import { mailSettings } from "@/lib/signin/mail";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHead } from "@/components/ui";
import { common } from "@/copy/common";
import { marketing } from "@/copy/marketing";
import { signin } from "@/copy/signin";
import { signInSettings } from "@/lib/signin/settings";
import { Brand } from "../../brand";
import { SignInForms } from "../forms";
import css from "../login.module.css";

export const generateMetadata = (): Metadata => ({ title: marketing.help.title, robots: { index: false, follow: false } });

/** /login/help: "Can't sign in?" IOpener has no passwords, so this sends a fresh email link and answers the usual snags. */
export default function SignInHelp() {
  const t = marketing.help;
  const settings = signInSettings();
  return (
    <main className="page" style={{ maxWidth: 1040, marginInline: "auto" }}>
      <div className={css.split}>
        <Brand />
        <div>
          <PageHead title={t.title} sub={t.sub} />
          <div className={`stack ${css.col}`}>
            <Card title={t.sendTitle}>
              <p className="small">{t.sendBody}</p>
              {settings ? <SignInForms google={null} next={null} code={!!mailSettings()} /> : <p className="notice" data-b="warn">{signin.notSetUp}</p>}
            </Card>
            <div className="stack">
              {t.faq.map((f) => (
                <details key={f.q} className="card" style={{ padding: "12px 16px" }}>
                  <summary><b>{f.q}</b></summary>
                  <p className="small" style={{ marginTop: 8 }}>{f.a}</p>
                </details>
              ))}
            </div>
            <p className="small"><Link href="/login">{t.back}</Link></p>
          </div>
        </div>
      </div>
      <p className={`muted small ${css.below}`}>{common.notMedical}</p>
    </main>
  );
}
