import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { common } from "@/copy/common";
import { gate as t } from "@/copy/gate";
import Link from "next/link";
import { lockScope, safeNext, siteLock } from "@/lib/gate";
import { GateForm } from "./form";

export const generateMetadata = (): Metadata => ({ title: t.title, robots: { index: false, follow: false } });

/** The one page a locked site shows. With no lock set it does not exist: it sends people to the home page. */
export default async function GatePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const asked = (await searchParams).next;
  const demoOnly = lockScope() === "demo";
  /* with the lock on the demo only, the phrase leads back to the sign-in page, where the demo people now show */
  const next = demoOnly && !asked ? "/login" : safeNext(asked);
  if (!siteLock()) redirect(next);
  return (
    <main className="page" style={{ marginInline: "auto", maxWidth: 460, paddingTop: 72 }}>
      <section className="c stack">
        <header><p className="muted small">{common.product}</p><h1 style={{ marginBlock: 4 }}>{demoOnly ? t.demoTitle : t.title}</h1></header>
        <p>{demoOnly ? t.demoBody : t.body}</p>
        <GateForm next={next} />
        {demoOnly && <p className="small"><Link href="/login">{t.demoBack}</Link></p>}
        <p className="muted small">{t.note}</p>
      </section>
    </main>
  );
}
