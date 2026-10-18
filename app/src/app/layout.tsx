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
import { common } from "@/copy/common";
import { THEME_BOOT } from "@/components/shell/theme";
import { scriptNonce } from "@/lib/nonce";

export async function generateMetadata(): Promise<Metadata> {
  const { brand } = await readDesign();
  return {
    title: { default: brand.name, template: `%s · ${brand.name}` },
    description: common.tagline,
  };
}
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  /* The language this request is drawn in (docs/LANGUAGES.md): the same one for every word on the page. */
  const l = await pageLanguage();
  /* The look and feel from the admin room (src/lib/design): validated colours and numbers only, defaults if none. */
  const design = await readDesign();
  const nonce = await scriptNonce();
  return (
    <html lang={l.tag} dir={l.dir} data-script={l.script} {...designAttrs(design)} suppressHydrationWarning>
      {/* No <head> of our own (audit U1, 18 October 2026). React wakes a <head> wrongly when one of its parts is still
          on its way in the page data (a long text is sent as its own piece): it starts the head twice, loses its place,
          and then redraws the whole page in the browser. Next.js writes the head itself; what was ours sits at the top
          of <body>, which React wakes safely: the colour script still runs before anything is drawn, the look and feel
          comes after the style sheets as before, the font sheet is lifted into the head by React (precedence), and
          next/script puts a beforeInteractive script in the head wherever it is written. */}
      <body>
        {/* light or dark as chosen on this device, before anything is drawn (components/shell/theme.tsx) */}
        <script nonce={nonce} dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
        <style id="eo-design" dangerouslySetInnerHTML={{ __html: designCss(design) }} />
        <LanguageHead l={l} />
        {/* The page's own words in its language, loaded before the page comes alive so the browser draws what the server sent. */}
        {l.words && <Script id="io-lang-words" strategy="beforeInteractive" src={l.words} />}
        <LanguageBody l={l} />{children}
      </body>
    </html>
  );
}
