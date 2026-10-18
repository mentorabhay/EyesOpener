/**
 * The fold of a step strip shown before (flow-client.tsx), shared by the server part that writes the script
 * (flow.tsx) and the browser part that reads the same list. Plain values only: a module the server may call.
 */

/** Where the browser keeps the pages whose strip it has shown, newest last. */
export const VIEWED = "eo.steps.viewed";

/** Run while the page is read, before the first paint (flow.tsx puts it right after the strip), so a strip seen
    before never shows in full and then folds. The same test as viewedBefore and foldsHere. */
export const FOLD_BOOT = (label: string) =>
  `(function(s){try{var k=location.pathname+"#"+${JSON.stringify(label)};if(document.documentElement.dataset.steps!=="always"&&JSON.parse(localStorage.getItem(${JSON.stringify(VIEWED)})||"[]").indexOf(k)>=0)s.setAttribute("data-folded","")}catch(e){}})(document.currentScript.previousElementSibling)`;
