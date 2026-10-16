// Eyes Opener: register: making a family account. It is the same Google or email-link sign-in as Log in (Eyes Opener has no.
import { mailSettings } from "@/lib/signin/mail";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, PageHead } from "@/components/ui";
import { common } from "@/copy/common";
import { marketing } from "@/copy/marketing";
import { signin } from "@/copy/signin";
import { getViewer } from "@/lib/auth";
import { signInSettings } from "@/lib/signin/settings";
import { Brand } from "../brand";
import { SignInForms } from "../login/forms";
import css from "../login/login.module.css";

export const generateMetadata = (): Metadata => ({ title: marketing.register.title, description: marketing.register.sub });

/**
 * /register: making a family account. It is the same Google or email-link sign-in as Log in (Eyes Opener has no
 * passwords): a first sign-in makes the person, and the welcome page then starts their household.
 */
export default async function RegisterPage() {
  const t = marketing.register;
  const viewer = await getViewer();
  if (viewer?.real) redirect(viewer.home === "/login" ? "/login/welcome" : viewer.home);
  const settings = signInSettings();
  return (
    <main className="page" style={{ maxWidth: 1040, marginInline: "auto" }}>
      <div className={css.split}>
        <Brand />
        <div>
          <PageHead title={t.title} sub={t.sub} />
          <div className={`stack ${css.col}`}>
            <ol className={css.steps}>{t.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            {settings
              ? <Card><SignInForms google={settings.googleClientId ? { clientId: settings.googleClientId, script: settings.endpoints.gsi } : null} next={null} code={!!mailSettings()} /></Card>
              : <p className="notice" data-b="warn">{signin.notSetUp}</p>}
            <p className="muted small">{t.noPassword}</p>
            <p className="small">{t.have} <Link href="/login">{t.login}</Link></p>
            <p className="muted small">{t.children}</p>
          </div>
        </div>
      </div>
      <p className={`muted small ${css.below}`}>{common.notMedical}</p>
    </main>
  );
}
