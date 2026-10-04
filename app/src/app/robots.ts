import type { MetadataRoute } from "next";
import { siteLock } from "@/lib/gate";
import { PRIVATE_PATHS, siteUrl } from "@/lib/site";

/* Answered on request: whether the site is locked is a setting of the running server, not of the build. */
export const dynamic = "force-dynamic";

/** Search engines may read the public site. The member app, the admin console, the two portals and sign-in are closed to them. */
export default function robots(): MetadataRoute.Robots {
  /* A locked site (a staging copy, or before launch) is closed to search engines altogether. */
  if (siteLock()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: [...PRIVATE_PATHS] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
