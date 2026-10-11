// Eyes Opener: The public pages a search engine may list: the site's own pages and one page for each programme.
import type { MetadataRoute } from "next";
import { programmes } from "@/data";
import { inEdition } from "@/edition";
import { extraSitemap } from "@/edition-server";
import { SITE_PAGES, siteUrl } from "@/lib/site";

/* Built on request: a fuller edition lists pages that live in the database. */
export const dynamic = "force-dynamic";

/**
 * The public pages a search engine may list: the site's own pages and one page for each programme.
 * An edition with more public pages adds them through `extraSitemap`. Nothing behind a sign-in is listed.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const pages = SITE_PAGES.filter(inEdition).map((path) => ({
    url: `${base}${path === "/" ? "" : path}`,
    changeFrequency: path === "/stories" ? ("weekly" as const) : ("monthly" as const),
    priority: path === "/" ? 1 : ["/privacy", "/childrens-data", "/terms"].includes(path) ? 0.3 : 0.7,
  }));
  const programmePages = programmes.map((p) => ({ url: `${base}/programmes/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.6 }));
  const more = (await extraSitemap()).map((e) => ({ url: `${base}${e.path}`, lastModified: e.lastModified, changeFrequency: e.changeFrequency ?? ("monthly" as const), priority: 0.5 }));
  return [...pages, ...programmePages, ...more];
}
