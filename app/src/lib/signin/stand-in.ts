/**
 * A stand-in for the Google services sign-in talks to. For the tests, and for trying sign-in on a developer's own
 * machine before a Firebase project exists (`npx tsx scripts/signin-stand-in.ts`). It is never part of the app:
 * nothing under src/app imports it, and the app only talks to it when SIGNIN_STAND_IN says so outside production.
 *
 * It answers, on one local port:
 *   GET  /keys                                    the public keys that sign its ID tokens, with a Cache-Control header
 *   POST /v1/accounts:signInWithIdp               a "Google credential" becomes an ID token
 *   POST /v1/accounts:sendOobCode                 "emails" a sign-in link: the link is kept in `mail`
 *   POST /v1/accounts:signInWithEmailLink         the code of a link, with its address, becomes an ID token
 *   POST /v1/projects/<id>/accounts:delete        removes an account; needs the service token
 *   POST /v1/projects/<id>/accounts:lookup        finds the account of an address; needs the service token
 *   POST /v1/projects/<id>/accounts               makes an account for an address; needs the service token
 *   GET  /computeMetadata/v1/instance/service-accounts/default/token   the service token, as Google Cloud gives it
 *   GET  /gsi/client, /gsi/credential             a plain button in place of Google's, for a developer's machine
 *
 * It behaves as Firebase is documented to behave, as far as sign-in here depends on it: one account for one
 * address whichever way the person signs in; a link works once and only with the address it was sent to; an ID
 * token is an RS256 JWT with Firebase's claims. Where the real service could differ is listed in docs/SIGN-IN.md.
 */
import crypto from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import type { SignInSettings } from "./settings";

export interface StandInUser { uid: string; email: string; emailVerified: boolean; name: string | null; providers: string[]; disabled: boolean }
interface Mail { to: string; continueUrl: string; code: string; link: string }
interface Code { email: string; used: boolean; expired: boolean }

export interface StandIn {
  url: string;
  projectId: string;
  apiKey: string;
  clientId: string;
  /** The settings the app would have with this stand-in in place of Google. */
  settings(more?: Partial<SignInSettings>): SignInSettings;
  /** The environment lines that point a local server at this stand-in. */
  env(): Record<string, string>;
  /** What Google's script would hand the page after the person chose this account. */
  googleCredential(who: { email: string; name?: string; emailVerified?: boolean; sub?: string }, more?: { aud?: string; expired?: boolean }): string;
  /** Every sign-in email "sent", oldest first. */
  mail: Mail[];
  users: Map<string, StandInUser>;
  /** Every request path, in order. */
  calls: string[];
  /** Switches for the tests. */
  knobs: {
    /** Answer sendOobCode with this Firebase error word. */
    sendError: string | null;
    /** Seconds the keys may be kept, as told in Cache-Control. */
    keysMaxAge: number;
    /** False: there is no metadata server (a developer's machine). */
    metadata: boolean;
    /** False: the service account may not delete accounts. */
    mayDelete: boolean;
    /** Put these claims into the next ID token, over the right ones. */
    claims: Record<string, unknown> | null;
    /** Answer signInWithEmailLink with a token for this other address. */
    answerFor: string | null;
  };
  /** An ID token signed by this stand-in, with any claim changed. For tests of the checks. */
  idToken(user: Pick<StandInUser, "uid" | "email" | "emailVerified" | "name">, provider: string, claims?: Record<string, unknown>, header?: Record<string, unknown>): string;
  /** Marks a link's code as too old. */
  expire(code: string): void;
  /** Swaps the signing key for a new one, as Google does about once a day. */
  rotateKeys(): void;
  close(): Promise<void>;
}

const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");
const sign = (header: object, payload: object, key: crypto.KeyObject) => {
  const head = `${b64(header)}.${b64(payload)}`;
  return `${head}.${crypto.sign("RSA-SHA256", Buffer.from(head), key).toString("base64url")}`;
};
const pair = () => crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
const pem = (k: crypto.KeyObject) => k.export({ type: "spki", format: "pem" }).toString();

export async function startStandIn(o: { port?: number; projectId?: string } = {}): Promise<StandIn> {
  const projectId = o.projectId ?? "iopener-stand-in-test"; // a test name: the demo sign-in is refused on a live project (lib/demo-project.ts)
  const apiKey = `stand-in-key-${crypto.randomBytes(9).toString("hex")}`;
  const clientId = "000000000000-standin.apps.googleusercontent.com";
  const serviceToken = `stand-in-service-${crypto.randomBytes(12).toString("hex")}`;
  let signing = pair(), kid = crypto.randomBytes(8).toString("hex");
  const google = pair();
  const users = new Map<string, StandInUser>(), codes = new Map<string, Code>();
  const mail: Mail[] = [], calls: string[] = [];
  const knobs: StandIn["knobs"] = { sendError: null, keysMaxAge: 3600, metadata: true, mayDelete: true, claims: null, answerFor: null };
  const byEmail = (email: string) => [...users.values()].find((u) => u.email === email.toLowerCase());

  const idToken: StandIn["idToken"] = (user, provider, claims = {}, header = {}) => {
    const now = Math.floor(Date.now() / 1000);
    return sign({ alg: "RS256", kid, typ: "JWT", ...header }, {
      iss: `https://securetoken.google.com/${projectId}`, aud: projectId, auth_time: now, user_id: user.uid, sub: user.uid, iat: now, exp: now + 3600,
      email: user.email, email_verified: user.emailVerified, ...(user.name ? { name: user.name } : {}),
      firebase: { identities: { email: [user.email] }, sign_in_provider: provider },
      ...claims,
    }, signing.privateKey);
  };
  const issue = (user: StandInUser, provider: string) => {
    const claims = knobs.claims ?? {};
    knobs.claims = null;
    return idToken(user, provider, claims);
  };

  const googleCredential: StandIn["googleCredential"] = (who, more = {}) => {
    const now = Math.floor(Date.now() / 1000) - (more.expired ? 7200 : 0);
    return sign({ alg: "RS256", kid: "stand-in-google", typ: "JWT" }, {
      iss: "https://accounts.google.com", aud: more.aud ?? clientId, sub: who.sub ?? `g-${crypto.createHash("sha256").update(who.email.toLowerCase()).digest("hex").slice(0, 20)}`,
      email: who.email, email_verified: who.emailVerified ?? true, ...(who.name ? { name: who.name } : {}), iat: now, exp: now + 3600,
    }, google.privateKey);
  };
  function readGoogle(credential: string): { sub: string; email: string; email_verified: boolean; name?: string } | null {
    const [h, p, s] = credential.split(".");
    if (!h || !p || !s) return null;
    try {
      if (!crypto.verify("RSA-SHA256", Buffer.from(`${h}.${p}`), google.publicKey, Buffer.from(s, "base64url"))) return null;
      const c = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
      return c.aud === clientId && c.exp > Date.now() / 1000 && typeof c.email === "string" ? c : null;
    } catch { return null; }
  }

  const fail = (res: http.ServerResponse, status: number, message: string) => {
    res.writeHead(status, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { code: status, message, errors: [{ message, domain: "global", reason: "invalid" }] } }));
  };
  const ok = (res: http.ServerResponse, body: unknown, headers: Record<string, string> = {}) => {
    res.writeHead(200, { "content-type": "application/json", ...headers });
    res.end(JSON.stringify(body));
  };
  const tokens = (user: StandInUser, provider: string) => ({ idToken: issue(user, provider), refreshToken: "stand-in-refresh", expiresIn: "3600", localId: user.uid, email: user.email });

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://stand-in");
    calls.push(url.pathname);
    let raw = "";
    req.on("data", (c) => { raw += c; });
    req.on("end", () => {
      let body: Record<string, unknown> = {};
      try { body = raw ? JSON.parse(raw) : {}; } catch { return fail(res, 400, "INVALID_JSON"); }
      const path = url.pathname;

      if (req.method === "GET" && path === "/keys") return ok(res, { [kid]: pem(signing.publicKey) }, { "cache-control": `public, max-age=${knobs.keysMaxAge}, must-revalidate, no-transform` });

      if (req.method === "GET" && path === "/computeMetadata/v1/instance/service-accounts/default/token") {
        if (!knobs.metadata || req.headers["metadata-flavor"] !== "Google") { res.writeHead(404); return res.end("not found"); }
        return ok(res, { access_token: serviceToken, expires_in: 3599, token_type: "Bearer" }, { "metadata-flavor": "Google" });
      }

      if (req.method === "GET" && path === "/gsi/client") {
        res.writeHead(200, { "content-type": "text/javascript", "access-control-allow-origin": "*" });
        return res.end(buttonScript(`http://${req.headers.host}`));
      }
      if (req.method === "GET" && path === "/gsi/credential") {
        const email = (url.searchParams.get("email") ?? "").trim().toLowerCase();
        res.setHeader("access-control-allow-origin", "*");
        return /^[^\s@]+@[^\s@]+$/.test(email) ? ok(res, { credential: googleCredential({ email, name: url.searchParams.get("name") ?? undefined }) }) : fail(res, 400, "INVALID_EMAIL");
      }

      if (req.method !== "POST") { res.writeHead(404); return res.end("not found"); }

      const adminFind = /^\/v1\/projects\/([^/]+)\/accounts(:lookup)?$/.exec(path);
      if (adminFind) {
        if (req.headers.authorization !== `Bearer ${serviceToken}`) return fail(res, 401, "UNAUTHENTICATED");
        if (decodeURIComponent(adminFind[1]) !== projectId) return fail(res, 400, "PROJECT_NOT_FOUND");
        if (adminFind[2]) {
          const email = String((body.email as unknown[] | undefined)?.[0] ?? "").toLowerCase();
          const u = byEmail(email);
          return ok(res, u ? { users: [{ localId: u.uid, email: u.email, emailVerified: u.emailVerified, displayName: u.name ?? undefined, disabled: u.disabled }] } : {});
        }
        const email = String(body.email ?? "").toLowerCase();
        if (byEmail(email)) return fail(res, 400, "EMAIL_EXISTS");
        const user: StandInUser = { uid: `uid-${crypto.randomBytes(10).toString("hex")}`, email, emailVerified: body.emailVerified === true, name: null, providers: [], disabled: false };
        users.set(user.uid, user);
        return ok(res, { localId: user.uid, email });
      }

      const admin = /^\/v1\/projects\/([^/]+)\/accounts:delete$/.exec(path);
      if (admin) {
        if (req.headers.authorization !== `Bearer ${serviceToken}`) return fail(res, 401, "UNAUTHENTICATED");
        if (!knobs.mayDelete) return fail(res, 403, "PERMISSION_DENIED");
        if (decodeURIComponent(admin[1]) !== projectId) return fail(res, 400, "PROJECT_NOT_FOUND");
        const uid = String(body.localId ?? "");
        if (!users.delete(uid)) return fail(res, 400, "USER_NOT_FOUND");
        return ok(res, { kind: "identitytoolkit#DeleteAccountResponse" });
      }

      if (url.searchParams.get("key") !== apiKey) return fail(res, 400, "API key not valid. Please pass a valid API key.");

      if (path === "/v1/accounts:signInWithIdp") {
        const post = new URLSearchParams(String(body.postBody ?? ""));
        const g = post.get("providerId") === "google.com" ? readGoogle(post.get("id_token") ?? "") : null;
        if (!g) return fail(res, 400, "INVALID_IDP_RESPONSE : The supplied auth credential is malformed or has expired.");
        const email = g.email.toLowerCase();
        let user = byEmail(email);
        /* An account that began another way, and an address Google has not confirmed: Firebase asks the person to use the first way. */
        if (user && !user.providers.includes("google.com") && !g.email_verified) return ok(res, { needConfirmation: true, email, providerId: "google.com" });
        if (!user) { user = { uid: `uid-${crypto.randomBytes(10).toString("hex")}`, email, emailVerified: g.email_verified, name: g.name ?? null, providers: [], disabled: false }; users.set(user.uid, user); }
        if (user.disabled) return fail(res, 400, "USER_DISABLED");
        if (!user.providers.includes("google.com")) user.providers.push("google.com");
        if (g.email_verified) user.emailVerified = true;
        if (g.name && !user.name) user.name = g.name;
        return ok(res, { ...tokens(user, "google.com"), emailVerified: user.emailVerified, providerId: "google.com", federatedId: `https://accounts.google.com/${g.sub}` });
      }

      if (path === "/v1/accounts:sendOobCode") {
        if (knobs.sendError) return fail(res, knobs.sendError === "QUOTA_EXCEEDED" ? 429 : 400, knobs.sendError);
        const email = String(body.email ?? "").trim().toLowerCase(), continueUrl = String(body.continueUrl ?? "");
        if (body.requestType !== "EMAIL_SIGNIN") return fail(res, 400, "INVALID_REQ_TYPE");
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(res, 400, "INVALID_EMAIL");
        if (!continueUrl || body.canHandleCodeInApp !== true) return fail(res, 400, "MISSING_CONTINUE_URI");
        const code = crypto.randomBytes(24).toString("base64url");
        codes.set(code, { email, used: false, expired: false });
        /* The address the browser ends on after Firebase's own handler page has passed the code along. */
        const link = `${continueUrl}${continueUrl.includes("?") ? "&" : "?"}apiKey=${encodeURIComponent(apiKey)}&oobCode=${code}&mode=signIn&lang=en`;
        mail.push({ to: email, continueUrl, code, link });
        return ok(res, { kind: "identitytoolkit#GetOobConfirmationCodeResponse", email });
      }

      if (path === "/v1/accounts:signInWithEmailLink") {
        const email = String(body.email ?? "").trim().toLowerCase(), code = codes.get(String(body.oobCode ?? ""));
        if (!code || code.used || code.expired) return fail(res, 400, "INVALID_OOB_CODE");
        if (code.email !== email) return fail(res, 400, "INVALID_EMAIL");
        code.used = true;
        let user = byEmail(email);
        if (!user) { user = { uid: `uid-${crypto.randomBytes(10).toString("hex")}`, email, emailVerified: true, name: null, providers: [], disabled: false }; users.set(user.uid, user); }
        if (user.disabled) return fail(res, 400, "USER_DISABLED");
        user.emailVerified = true;
        if (!user.providers.includes("password")) user.providers.push("password");
        const shown = knobs.answerFor ? { ...user, email: knobs.answerFor } : user;
        knobs.answerFor = null;
        return ok(res, { ...tokens(shown, "password"), isNewUser: false, kind: "identitytoolkit#EmailLinkSigninResponse" });
      }

      res.writeHead(404); res.end("not found");
    });
  });
  await new Promise<void>((resolve) => server.listen(o.port ?? 0, "127.0.0.1", resolve));
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const settings: StandIn["settings"] = (more = {}) => ({
    projectId, apiKey, googleClientId: clientId, siteUrl: "http://localhost:3000", proxyHops: 0, standIn: true,
    endpoints: { toolkit: `${url}/v1`, keys: `${url}/keys`, gsi: `${url}/gsi/client`, metadata: `${url}/computeMetadata/v1` },
    ...more,
  });

  return {
    url, projectId, apiKey, clientId, settings, googleCredential, mail, users, calls, knobs, idToken,
    env: () => ({ FIREBASE_PROJECT_ID: projectId, FIREBASE_API_KEY: apiKey, GOOGLE_CLIENT_ID: clientId, SIGNIN_STAND_IN: url }),
    expire: (code) => { const c = codes.get(code); if (c) c.expired = true; },
    rotateKeys: () => { signing = pair(); kid = crypto.randomBytes(8).toString("hex"); },
    close: () => new Promise<void>((resolve) => { server.closeAllConnections(); server.close(() => resolve()); }),
  };
}

/** The script served in place of Google's on a developer's machine: one plain button that asks which address to sign in as. */
const buttonScript = (base: string) => `(() => {
  let config = null;
  window.google = window.google || {};
  window.google.accounts = window.google.accounts || {};
  window.google.accounts.id = {
    initialize(o) { config = o; },
    cancel() {},
    renderButton(el, o) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "Sign in with Google (stand-in)";
      b.style.cssText = "width:" + (o && o.width ? o.width + "px" : "100%") + ";max-width:100%;height:40px;border:1px solid #747775;border-radius:20px;background:#fff;color:#1f1f1f;font:500 14px system-ui,sans-serif;cursor:pointer";
      b.addEventListener("click", async () => {
        const email = window.__standInEmail || window.prompt("Stand-in for Google. Sign in as which email address?");
        if (!email || !config) return;
        const r = await fetch(${JSON.stringify(base)} + "/gsi/credential?email=" + encodeURIComponent(email));
        const j = await r.json();
        if (j.credential) config.callback({ credential: j.credential, select_by: "btn" });
      });
      el.appendChild(b);
    },
  };
})();`;
