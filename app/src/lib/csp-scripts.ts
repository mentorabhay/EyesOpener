/**
 * The rule for scripts in the page rules (audit S1, 18 October 2026). Every page is drawn on request, so each one gets
 * a fresh random nonce in the proxy: Next.js reads it from the request's rule and puts it on its own scripts, and our
 * few start-up scripts (the colour, the folded menu, a folded step strip) read it with `scriptNonce()`. A script with
 * no nonce, such as one slipped into a page, is then refused. 'strict-dynamic' lets the trusted scripts load the
 * framework's chunks and the Google sign-in script; 'wasm-unsafe-eval' lets the face model's WebAssembly start.
 *
 * CSP_SCRIPTS says how far it goes: "report" (the default) only reports a refused script in the browser's console,
 * "enforce" refuses it, "off" leaves the rule out. Staging tries "report" first.
 */
export type ScriptRuleMode = "off" | "report" | "enforce";
export const NONCE_HEADER = "x-nonce";

export const scriptRuleMode = (v = process.env.CSP_SCRIPTS): ScriptRuleMode => (v === "off" || v === "enforce" ? v : "report");

export function newNonce(): string {
  const b = new Uint8Array(18);
  crypto.getRandomValues(b);
  return btoa(String.fromCharCode(...b));
}

export function scriptRule(nonce: string, dev = process.env.NODE_ENV === "development"): string {
  return [
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval'${dev ? " 'unsafe-eval'" : ""} https:`,
    "object-src 'none'",
    "base-uri 'self'",
  ].join("; ");
}

/** The header that carries the rule, for the mode. */
export const scriptRuleHeader = (mode: ScriptRuleMode) => (mode === "enforce" ? "content-security-policy" : "content-security-policy-report-only");
