// Eyes Opener: The server side of the edition: lists a fuller build adds to. Empty in the public edition.
/**
 * The server side of the edition: lists a fuller build adds to. Empty in the public edition.
 * A fuller build replaces this one file.
 */
export interface SitemapEntry { path: string; lastModified?: Date; changeFrequency?: "daily" | "weekly" | "monthly" }

/** Addresses for the sitemap beyond the site's own pages and the programmes. */
export async function extraSitemap(): Promise<SitemapEntry[]> {
  return [];
}
