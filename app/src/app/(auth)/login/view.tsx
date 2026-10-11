// Eyes Opener: What the sign-in pages show. Plain components: everything they need arrives as props, so each page file only.
/**
 * What the sign-in pages show. Plain components: everything they need arrives as props, so each page file only
 * gathers the facts (who is signed in, what is set up, what holds the device) and hands them over.
 */
import Link from "next/link";
import type { ReactNode } from "react";
import { Card, Chip, PageHead } from "@/components/ui";
import { auth as demo } from "@/copy/auth";
import { common } from "@/copy/common";
import { signin as t } from "@/copy/signin";
import { demoSignIn } from "@/lib/actions";
import { signOutEverywhere, signOutHere, startFamilySpace } from "./actions";
import { FinishForm } from "./finish/form";
import { SignInForms } from "./forms";
import css from "./login.module.css";
import { marketing } from "@/copy/marketing";
import { Brand } from "../brand";

export interface DemoGroup { title: string; sub: string; people: { id: string; name: string; email: string; role: string; current: boolean }[] }
export interface Me { name: string; email: string; /** Their own area, or the welcome page when they have none yet. */ go: string }

const Frame = ({ wide, children }: { wide?: 560 | 860 | 1040; children: ReactNode }) => (
  <main className="page" style={{ maxWidth: wide ?? 560, marginInline: "auto" }}>
    {children}
    <p className={`muted small ${css.below}`}>{common.notMedical}</p>
  </main>
);

/** The seeded people of the demo. */
function DemoPeople({ groups }: { groups: DemoGroup[] }) {
  return (
    <div className="bento">
      {groups.map((g) => (
        <Card key={g.title} title={g.title} span={6}>
          <p className="muted small">{g.sub}</p>
          <div>
            {g.people.map((p) => (
              <form className="ins" key={p.id + p.role} action={demoSignIn}>
                <input type="hidden" name="userId" value={p.id} />
                <div className="tx"><b>{p.name}</b><div className="sub">{p.role} · {p.email}</div></div>
                {p.current ? <Chip tone="ok">{demo.current}</Chip> : <button className="btn btn-sm" type="submit">{demo.signIn}</button>}
              </form>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/** For a person who signed in with Google or an email link: who they are, the way to their pages, and signing out. */
function SignedIn({ me }: { me: Me }) {
  return (
    <Card title={t.me.title}>
      <div className="stack">
        <p>{t.me.as(me.name, me.email)}</p>
        <div className="row"><Link className="btn btn-g" href={me.go}>{t.me.go}</Link></div>
        <form action={signOutHere} className="row">
          <button className="btn btn-d">{t.me.out}</button><span className="muted small">{t.me.outHint}</span>
        </form>
        <form action={signOutEverywhere} className="stack">
          <div className="row"><button className="btn btn-gh">{t.me.everywhere}</button></div>
          <p className="muted small">{t.me.everywhereHint}</p>
        </form>
        <p className="muted small">{t.me.lasts}</p>
      </div>
    </Card>
  );
}

export function LoginView(p: {
  /** Null when sign-in is not set up. `google` is null when only the email link is offered. */
  signIn: { google: { clientId: string; script: string } | null; code?: boolean } | null;
  /** Null when the demo sign-in is off, or not opened in this browser. */
  demo: DemoGroup[] | null;
  /** The demo is on but needs the access phrase here (SITE_LOCK_SCOPE=demo): a link to the phrase page. */
  demoLocked?: boolean;
  /** The person who signed in for real, if anyone. */
  me: Me | null;
  /** The device is in child mode and nobody it can show the app for is signed in. */
  held: boolean;
  next: string | null;
  done?: string;
  why?: string;
}) {
  const notices = (
    <>
      {p.held && !p.why && <p className="notice" data-b="warn" role="note">{t.held}</p>}
      {p.done && <p className="notice" data-b="ok" role="status">{p.done}</p>}
      {p.why && <p className="notice" data-b="warn" role="alert">{p.why}</p>}
    </>
  );

  /* The demo alone: nothing to sign in with, so the page is the list of seeded people, as it always was. */
  if (p.demo && !p.signIn && !p.me) {
    return (
      <Frame wide={1040}>
        <PageHead title={demo.demoTitle} sub={demo.demoSub} />
        {(p.held || p.done || p.why) && <div className="stack" style={{ marginBottom: 14 }}>{notices}</div>}
        <DemoPeople groups={p.demo} />
      </Frame>
    );
  }

  const nothing = !p.signIn && !p.me;
  const m = marketing.login;
  return (
    <Frame wide={1040}>
      <div className={css.split}>
        <Brand />
        <div>
          <PageHead title={t.title} sub={nothing ? t.notSetUp : p.me ? undefined : t.sub} />
          <div className={`stack ${css.col}`}>
            {notices}
            {p.me ? <SignedIn me={p.me} /> : p.signIn && <Card><SignInForms google={p.signIn.google} next={p.next} code={p.signIn.code} /></Card>}
            {p.signIn && !p.me && (
              <p className={`small ${css.links}`}>
                <span>{m.newHere} <Link href="/register">{m.register}</Link></span>
                <Link href="/login/help">{m.trouble}</Link>
              </p>
            )}
            {!nothing && <p className="muted small">{t.children}</p>}
            {p.signIn && !p.me && !p.held && <p className="muted small">{t.join.text} <Link href="/join">{t.join.link}</Link>.</p>}
          </div>
        </div>
      </div>
      {p.demoLocked && !p.me && (
        <p className={`small muted ${css.below}`}>{demo.demoLocked} <Link href="/gate?next=/login">{demo.demoOpen}</Link></p>
      )}
      {p.demo && (
        <section className={css.below} aria-labelledby="demo-title">
          <header className={css.second}><h2 id="demo-title">{demo.demoTitle}</h2><p className="muted">{demo.demoSub}</p></header>
          <DemoPeople groups={p.demo} />
        </section>
      )}
    </Frame>
  );
}

export function FinishView(p: {
  setUp: boolean;
  /** The one-time code of the link, or null when the address of the page did not carry a whole link. */
  code: string | null;
  /** The address this device remembers asking for, if it is the device that asked. */
  known: string | null;
  held: boolean;
  next: string | null;
}) {
  return (
    <Frame>
      <PageHead title={t.finish.title} sub={!p.setUp ? t.notSetUp : p.code ? t.finish.sub : undefined} />
      {p.setUp && (
        <div className={`stack ${css.col}`}>
          {p.held && <p className="notice" data-b="warn" role="note">{t.held}</p>}
          <Card>
            {p.code ? <FinishForm code={p.code} known={p.known} next={p.next} /> : (
              <div className="stack">
                <p className="notice" data-b="warn" role="alert">{t.refused.bad_link}</p>
                <div className="row"><Link className="btn btn-g" href="/login">{t.finish.askAgain}</Link></div>
              </div>
            )}
          </Card>
          <p className="muted small">{t.children}</p>
        </div>
      )}
    </Frame>
  );
}

export function WelcomeView({ me }: { me: { name: string; email: string } }) {
  const w = t.welcome;
  return (
    <Frame wide={860}>
      <PageHead title={w.title(me.name)} sub={w.sub} />
      <div className="bento">
        <Card title={w.start.title} span={6}>
          <form action={startFamilySpace} className={css.choice}>
            <p>{w.start.body}</p>
            <div className={`row ${css.end}`}><button className="btn btn-g">{w.start.submit}</button></div>
          </form>
        </Card>
        <Card title={w.join.title} span={6}>
          <div className={css.choice}>
            <p>{w.join.body}</p>
            <div className={`row ${css.end}`}><Link className="btn btn-d" href="/join">{w.join.link}</Link></div>
          </div>
        </Card>
      </div>
      <form action={signOutHere} className={`row ${css.below}`}>
        <span className="muted small">{t.me.as(me.name, me.email)}</span><button className="btn btn-gh btn-sm">{t.me.out}</button>
      </form>
    </Frame>
  );
}
