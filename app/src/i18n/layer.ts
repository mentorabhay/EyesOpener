// Eyes Opener: Which side of a page this copy of the code draws.
/**
 * Which side of a page this copy of the code draws.
 *
 * Next.js builds the app twice for the server: once for the parts of a page that only the server draws, and once
 * for the parts that also run in the browser ("use client"), which the server draws first so the page arrives
 * with its words in place. The second kind must be drawn from exactly the words the browser is given, or the
 * browser would find a different page from the one it was sent (src/i18n/runtime.ts, src/i18n/client-list.ts).
 *
 * The two builds differ in the React they are given: the one for server-only parts has no `useEffect`. That is
 * React's own, documented difference (the "react-server" build), and src/i18n/next.test.ts holds this file to it.
 */
import * as React from "react";

/** True in the browser, and on the server in the build that draws the browser's parts of a page. */
export const browserParts: boolean = typeof (React as unknown as Record<string, unknown>)["use" + "Effect"] === "function";
