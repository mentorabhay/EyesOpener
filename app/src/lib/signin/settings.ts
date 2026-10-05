/**
 * Sign-in settings, read from the environment on every use. Pure, unit-tested.
 *
 * Sign-in with Google and by email link is switched on by its settings being present:
 *   FIREBASE_PROJECT_ID   the Firebase project that holds the sign-in accounts
 *   FIREBASE_API_KEY      that project's web API key. It names the project to Google; it is not a secret, and the
 *                         server is the only thing that uses it, so it never reaches a browser
 *   GOOGLE_CLIENT_ID      the web client id of Google sign-in. Left empty, only the email link is offered
 * With the first two absent, or not in the shape Google gives them, sign-in is "not set up": the page says so, or
 * shows the demo people when the demo sign-in is on.
 *
 * Every address below is Google's and is fixed in the code. The one exception is for a developer's own machine and
 * for the tests: SIGNIN_STAND_IN may point at a stand-in (src/lib/signin/stand-in.ts) on this same machine. It is
 * ignored in production, and ignored anywhere unless it is a plain http address on 127.0.0.1 or localhost.
 */

export interface Endpoints {
  /** Firebase's Identity Toolkit. */
  toolkit: string;
  /** The public keys that sign Firebase ID tokens. */
  keys: string;
  /** Google's sign-in script for the browser. */
  gsi: string;
  /** Where a server on Google Cloud asks who it runs as. */
  metadata: string;
}

export const GOOGLE: Endpoints = {
  toolkit: "https://identitytoolkit.googleapis.com/v1",
  keys: "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com",
  gsi: "https://accounts.google.com/gsi/client",
  metadata: "http://metadata.google.internal/computeMetadata/v1",
};

export interface SignInSettings {
  projectId: string;
  apiKey: string;
  /** Null when Google sign-in is not set up: only the email link is offered. */
  googleClientId: string | null;
  /** The site's own public address, with no slash at the end. The email link comes back to it. */
  siteUrl: string;
  /** How many servers in front of the app add to the forwarded-for list (see `networkAddress` in limit.ts). */
  proxyHops: number;
  endpoints: Endpoints;
  /** True when the addresses above are a stand-in on this machine, never Google. */
  standIn: boolean;
}

type Env = Record<string, string | undefined>;

const PROJECT_ID = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const API_KEY = /^[A-Za-z0-9_-]{20,120}$/;
const CLIENT_ID = /^[0-9A-Za-z_-]{6,120}\.apps\.googleusercontent\.com$/;
const LOCAL = /^http:\/\/(127\.0\.0\.1|localhost):\d{2,5}$/;

/** The stand-in's addresses, or null. Never in production, and only for an address on this machine. */
export function standInEndpoints(env: Env = process.env): Endpoints | null {
  const base = (env.SIGNIN_STAND_IN ?? "").trim().replace(/\/+$/, "");
  if (!base || env.NODE_ENV === "production" || !LOCAL.test(base)) return null;
  return { toolkit: `${base}/v1`, keys: `${base}/keys`, gsi: `${base}/gsi/client`, metadata: `${base}/computeMetadata/v1` };
}

/** The settings, or null when sign-in is not set up. */
export function signInSettings(env: Env = process.env): SignInSettings | null {
  const projectId = (env.FIREBASE_PROJECT_ID ?? "").trim(), apiKey = (env.FIREBASE_API_KEY ?? "").trim();
  if (!PROJECT_ID.test(projectId) || !API_KEY.test(apiKey)) return null;
  const clientId = (env.GOOGLE_CLIENT_ID ?? "").trim();
  const standIn = standInEndpoints(env);
  const hops = Number.parseInt(env.SIGNIN_PROXY_HOPS ?? "0", 10);
  return {
    projectId, apiKey,
    googleClientId: CLIENT_ID.test(clientId) ? clientId : null,
    siteUrl: (env.SITE_URL?.trim() || "http://localhost:3000").replace(/\/+$/, ""),
    proxyHops: Number.isInteger(hops) && hops >= 0 && hops <= 5 ? hops : 0,
    endpoints: standIn ?? GOOGLE,
    standIn: !!standIn,
  };
}

/**
 * What is wrong with the settings, in plain words, for the staff who set them. Empty when all is well or when
 * nothing is set at all. It never repeats a value.
 */
export function settingsProblems(env: Env = process.env): string[] {
  const has = (k: string) => !!(env[k] ?? "").trim();
  if (!has("FIREBASE_PROJECT_ID") && !has("FIREBASE_API_KEY") && !has("GOOGLE_CLIENT_ID")) return [];
  const out: string[] = [];
  if (!PROJECT_ID.test((env.FIREBASE_PROJECT_ID ?? "").trim())) out.push("FIREBASE_PROJECT_ID is missing or is not a project id.");
  if (!API_KEY.test((env.FIREBASE_API_KEY ?? "").trim())) out.push("FIREBASE_API_KEY is missing or is not a web API key.");
  if (has("GOOGLE_CLIENT_ID") && !CLIENT_ID.test((env.GOOGLE_CLIENT_ID ?? "").trim())) out.push("GOOGLE_CLIENT_ID is not a web client id (it ends in .apps.googleusercontent.com).");
  if (env.NODE_ENV === "production" && !(env.SITE_URL ?? "").trim().startsWith("https://")) out.push("SITE_URL must be the site's https address: the email link comes back to it.");
  if (has("SIGNIN_STAND_IN") && !standInEndpoints(env)) out.push("SIGNIN_STAND_IN is ignored: it works only outside production, for an http address on this machine.");
  return out;
}
