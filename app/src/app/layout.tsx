import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
/* Outfit, served from this site (no request to another host; the weights the design uses). */
import "@fontsource/outfit/400.css";
import "@fontsource/outfit/500.css";
import "@fontsource/outfit/600.css";
import "@fontsource/outfit/700.css";
import "./globals.css";
import { LanguageBody, LanguageHead, pageLanguage } from "@/i18n/html";
import { designAttrs, designCss } from "@/lib/design/config";
import { readDesign } from "@/lib/design/read";

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await readDesign();
  return {
    title: { default: brand.name, template: `%s · ${brand.name}` },
    description: "Eye care you can do at home, built on published research. Free, with an open-source core.",
  };
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  /* The language this request is drawn in (docs/LANGUAGES.md): the same one for every word on the page. */
  const l = await pageLanguage();
  /* The look and feel from the admin room (src/lib/design): validated colours and numbers only, defaults if none. */
  const design = await readDesign();
  return (
    <html lang={l.tag} dir={l.dir} data-script={l.script} {...designAttrs(design)}>
      <head>
        <style id="eo-design" dangerouslySetInnerHTML={{ __html: designCss(design) }} />
        <LanguageHead l={l} />
        {/* The page's own words in its language, loaded before the page comes alive so the browser draws what the server sent. */}
        {l.words && <Script id="io-lang-words" strategy="beforeInteractive" src={l.words} />}
      </head>
      <body><LanguageBody l={l} />{children}</body>
    </html>
  );
}
