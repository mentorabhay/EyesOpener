import type { Metadata } from "next";
import type { ReactNode } from "react";
import { common } from "@/copy/common";
import { site as t } from "@/copy/site";
import { getViewer } from "@/lib/auth";
import { SHARE_IMAGE, siteUrl } from "@/lib/site";
import { DiagramMotion } from "@/components/diagram/motion";
import { Dock } from "@/components/assistant/dock";
import { assist } from "@/lib/assist/extra";
import { Reveal } from "./_components/reveal";
import { SiteFooter } from "./_components/site-footer";
import { SiteNav } from "./_components/site-nav";
import "./site.css";

export const generateMetadata = (): Metadata => ({
  metadataBase: new URL(siteUrl()),
  openGraph: { siteName: t.name, type: "website", locale: "en_IN", title: t.name, description: common.tagline, images: [SHARE_IMAGE] },
  twitter: { card: "summary_large_image", title: t.name, description: common.tagline, images: [SHARE_IMAGE.url] },
});

/**
 * The public site: the landing page, the stories and the pages about Eyes Opener, inside one navigation and footer.
 * Nothing here needs a sign-in. The viewer is read only to choose between "Sign in" and "Open the app".
 * Each page brings its own <main>; the wrapper below is where the skip link lands.
 */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  return (
    <>
      <a className="s-skip" href="#page">{t.skip}</a>
      <SiteNav home={viewer?.home ?? null} />
      <div id="page" className="s-main" tabIndex={-1}>{children}</div>
      <SiteFooter />
      <Reveal />
      <DiagramMotion />
      <Dock chat={assist.available} place="site" />
    </>
  );
}
