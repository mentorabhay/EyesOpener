// Eyes Opener: The four calls Eyes Opener makes to Firebase's Identity Toolkit, as plain HTTPS requests: no Firebase package.
/**
 * The four calls Eyes Opener makes to Firebase's Identity Toolkit, as plain HTTPS requests: no Firebase package.
 *
 *   exchangeGoogle   accounts:signInWithIdp        a Google credential from the browser becomes a Firebase ID token
 *   sendLink         accounts:sendOobCode          Firebase emails a sign-in link (request type EMAIL_SIGNIN)
 *   exchangeLink     accounts:signInWithEmailLink  the code in that link, with the address, becomes a Firebase ID token
 *   deleteAccount    projects/<id>/accounts:delete removes a sign-in account, as the service the app runs as
 *   accountFor       projects/<id>/accounts:lookup, then projects/<id>/accounts: the sign-in account of an address that
 *                    has just proved itself with an emailed code (code.ts), made when there is none, as the service
 *
 * The server makes every call. A browser never talks to the Identity Toolkit and never holds a Firebase token, so
 * the only things the server accepts from a browser are a Google credential and the code of an email link. A token
 * made any other way (a password sign-in, say, if someone switched that on in the project) has no way in.
 *
 * Whatever comes back is checked again by `verifyIdToken` before anyone is signed in.
 * Nothing here writes a token, a code or an address to the log.
 */
import type { Endpoints, SignInSettings } from "./settings";

const TIMEOUT_MS = 8000;
/** What Firebase's own browser library sends as the request address when it hands over a ready-made credential. */
const REQUEST_URI = "http://localhost";

interface Answer { status: number; body: Record<string, unknown>; code: string }

/** One POST. Null when the service did not answer in time or at all. `code` is Firebase's error word, or "". */
async function post(url: string, body: unknown, bearer?: string): Promise<Answer | null> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(TIMEOUT_MS), cache: "no-store", redirect: "error",
    });
    const json: unknown = await res.json().catch(() => null);
    const obj = json && typeof json === "object" && !Array.isArray(json) ? (json as Record<string, unknown>) : {};
    const message = (obj.error as { message?: unknown } | undefined)?.message;
    /* An error reads "CODE" or "CODE : some words". */
    return { status: res.status, body: obj, code: typeof message === "string" ? message.split(/[\s:]/)[0] : "" };
  } catch { return null; }
}

/** Says in the server log that Firebase refused, by its error word only: never an address, a code or a token. */
const note = (call: string, a: Answer) => console.warn(`[sign-in] ${call} was refused: ${a.status} ${a.code.replace(/[^A-Z_]/g, "").slice(0, 60) || "no error word"}`);

const withKey = (s: SignInSettings, method: string) => `${s.endpoints.toolkit}/accounts:${method}?key=${encodeURIComponent(s.apiKey)}`;
const tokenIn = (a: Answer) => (a.status === 200 && typeof a.body.idToken === "string" && a.body.idToken ? a.body.idToken : null);

export type GoogleExchange =
  | { ok: true; idToken: string }
  /** refused: Google's credential was not accepted. other_method: the address already signs in another way and Google cannot vouch for it. */
  | { ok: false; why: "refused" | "other_method" | "disabled" | "unavailable" };

export async function exchangeGoogle(s: SignInSettings, credential: string): Promise<GoogleExchange> {
  const a = await post(withKey(s, "signInWithIdp"), {
    postBody: `id_token=${encodeURIComponent(credential)}&providerId=google.com`,
    requestUri: REQUEST_URI, returnSecureToken: true, returnIdpCredential: false,
  });
  if (!a) return { ok: false, why: "unavailable" };
  if (a.status === 200 && a.body.needConfirmation === true) return { ok: false, why: "other_method" };
  const idToken = tokenIn(a);
  if (idToken) return { ok: true, idToken };
  if (a.code === "USER_DISABLED") return { ok: false, why: "disabled" };
  if (a.code === "INVALID_IDP_RESPONSE" || a.code === "INVALID_ID_TOKEN" || a.code === "INVALID_CREDENTIAL_OR_PROVIDER_ID") return { ok: false, why: "refused" };
  note("signInWithIdp", a);
  return { ok: false, why: "unavailable" };
}

/** sent: Firebase took the request. bad_address: it is not an email address. unavailable: the email could not be sent now. */
export type LinkSent = "sent" | "bad_address" | "unavailable";

/** Answers that depend on whose address it is. The caller is told "sent" for these, so nobody learns from the form whether an address has an account. */
const ABOUT_ONE_ADDRESS = ["USER_DISABLED", "EMAIL_NOT_FOUND", "USER_NOT_FOUND", "ADMIN_ONLY_OPERATION"];

/**
 * Asks Firebase to email a sign-in link that comes back to `continueUrl`.
 * Whatever Firebase says about one particular address is answered as "sent".
 */
export async function sendLink(s: SignInSettings, email: string, continueUrl: string): Promise<LinkSent> {
  const a = await post(withKey(s, "sendOobCode"), { requestType: "EMAIL_SIGNIN", email, continueUrl, canHandleCodeInApp: true });
  if (!a) return "unavailable";
  if (a.status === 200 || ABOUT_ONE_ADDRESS.includes(a.code)) return "sent";
  if (a.code === "INVALID_EMAIL" || a.code === "MISSING_EMAIL") return "bad_address";
  /* Everything else is about the service or its settings (the daily limit, a domain that is not authorised, a method switched off). */
  note("sendOobCode", a);
  return "unavailable";
}

export type LinkExchange =
  | { ok: true; idToken: string }
  /** expired: the link is too old or was used already. wrong_address: it was sent to another address. */
  | { ok: false; why: "expired" | "wrong_address" | "disabled" | "unavailable" };

export async function exchangeLink(s: SignInSettings, email: string, oobCode: string): Promise<LinkExchange> {
  const a = await post(withKey(s, "signInWithEmailLink"), { email, oobCode });
  if (!a) return { ok: false, why: "unavailable" };
  const idToken = tokenIn(a);
  if (idToken) return { ok: true, idToken };
  if (a.code === "INVALID_OOB_CODE" || a.code === "EXPIRED_OOB_CODE") return { ok: false, why: "expired" };
  if (a.code === "INVALID_EMAIL" || a.code === "EMAIL_NOT_FOUND") return { ok: false, why: "wrong_address" };
  if (a.code === "USER_DISABLED") return { ok: false, why: "disabled" };
  note("signInWithEmailLink", a);
  return { ok: false, why: "unavailable" };
}

/* ───────────── as the service the app runs as ───────────── */

/**
 * An access token for the service account this server runs as, from Google Cloud's metadata server.
 * Null where there is no such server (a developer's machine): no key file is ever read instead.
 */
export async function serviceToken(endpoints: Endpoints): Promise<string | null> {
  try {
    const res = await fetch(`${endpoints.metadata}/instance/service-accounts/default/token`, {
      headers: { "Metadata-Flavor": "Google" }, signal: AbortSignal.timeout(2000), cache: "no-store", redirect: "error",
    });
    /* Only the real metadata server answers with this header. Anything else that happens to answer is not it. */
    if (res.status !== 200 || res.headers.get("metadata-flavor") !== "Google") return null;
    const body = (await res.json()) as { access_token?: unknown };
    return typeof body.access_token === "string" && body.access_token ? body.access_token : null;
  } catch { return null; }
}

/** removed: it is gone now. gone: it was not there. not_allowed: the service account may not delete accounts. */
export type AccountDeleted = "removed" | "gone" | "not_allowed" | "failed";

export async function deleteAccount(s: SignInSettings, uid: string, accessToken: string): Promise<AccountDeleted> {
  const a = await post(`${s.endpoints.toolkit}/projects/${encodeURIComponent(s.projectId)}/accounts:delete`, { localId: uid }, accessToken);
  if (!a) return "failed";
  if (a.status === 200) return "removed";
  if (a.code === "USER_NOT_FOUND") return "gone";
  if (a.status === 401 || a.status === 403) return "not_allowed";
  return "failed";
}

/**
 * The sign-in account of an address that has just proved itself with a six-digit code, so a person who signs in by
 * code and later with Google is one person: Firebase keeps one account for one address. Made, with the address marked
 * verified, when there is none. As the service the app runs as (Firebase Authentication Admin, docs/SIGN-IN.md).
 */
export type AccountFound = { ok: true; uid: string; name: string | null } | { ok: false; why: "disabled" | "not_allowed" | "failed" };

export async function accountFor(s: SignInSettings, email: string, accessToken: string): Promise<AccountFound> {
  const base = `${s.endpoints.toolkit}/projects/${encodeURIComponent(s.projectId)}/accounts`;
  for (let round = 0; round < 2; round++) {
    const found = await post(`${base}:lookup`, { email: [email] }, accessToken);
    if (!found) return { ok: false, why: "failed" };
    if (found.status === 401 || found.status === 403) { note("accounts:lookup", found); return { ok: false, why: "not_allowed" }; }
    const user = ((found.body.users as { localId?: unknown; disabled?: unknown; displayName?: unknown }[] | undefined) ?? [])[0];
    if (user && typeof user.localId === "string") {
      if (user.disabled === true) return { ok: false, why: "disabled" };
      return { ok: true, uid: user.localId, name: typeof user.displayName === "string" ? user.displayName : null };
    }
    const made = await post(base, { email, emailVerified: true }, accessToken);
    if (!made) return { ok: false, why: "failed" };
    if (made.status === 200 && typeof made.body.localId === "string") return { ok: true, uid: made.body.localId, name: null };
    /* made at the same moment by another sign-in: look again */
    if (made.code !== "EMAIL_EXISTS" && made.code !== "DUPLICATE_EMAIL") { note("accounts", made); return { ok: false, why: made.status === 403 ? "not_allowed" : "failed" }; }
  }
  return { ok: false, why: "failed" };
}
