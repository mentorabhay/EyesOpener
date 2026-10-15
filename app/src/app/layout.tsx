import type { Metadata, Viewport } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";
import { LanguageBody, LanguageHead, pageLanguage } from "@/i18n/html";

export const metadata: Metadata = {
  title: { default: "Eyes Opener", template: "%s · Eyes Opener" },
  description: "Eye care you can do at home, built on published research. Free, with an open-source core.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: ReactNode }) {
  /* The language this request is drawn in (docs/LANGUAGES.md): the same one for every word on the page. */
  const l = await pageLanguage();
  return (
    <html lang={l.tag} dir={l.dir} data-script={l.script}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" />
        <LanguageHead l={l} />
        {/* The page's own words in its language, loaded before the page comes alive so the browser draws what the server sent. */}
        {l.words && <Script id="io-lang-words" strategy="beforeInteractive" src={l.words} />}
      </head>
      <body><LanguageBody l={l} />{children}</body>
    </html>
  );
}
