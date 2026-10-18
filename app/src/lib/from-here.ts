/**
 * A request that is a person's own move to the address: a press on a link of this site, or the address typed in. Not
 * a page of another site, and not the browser fetching ahead (a prefetch), so an address that changes something
 * (/tryout) never acts by itself.
 */
export const fromHere = (req: Request) =>
  ["same-origin", "none", null].includes(req.headers.get("sec-fetch-site")) && [null, "navigate"].includes(req.headers.get("sec-fetch-mode"))
  && !req.headers.get("next-router-prefetch") && req.headers.get("purpose") !== "prefetch";

/** Addresses that do something when opened: the menus reach them by a full page load, never through the router. */
export const isAction = (href: string) => href === "/tryout" || href.startsWith("/tryout/");
