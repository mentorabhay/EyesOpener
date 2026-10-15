/**
 * The ID token checks, against keys made here and a stand-in for Google's key list.
 * Every way a token can be wrong must be refused; one that is right must be read exactly.
 */
import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { googleKeys, keepSeconds, publicKeyFrom, SKEW_S, verifyIdToken, type KeySource, type TokenRefusal } from "./idtoken";
import { startStandIn, type StandIn } from "./stand-in";

const PROJECT = "iopener-stand-in";
const person = { uid: "uid-abc123", email: "Asha@Family.Example", emailVerified: true, name: "Asha" };
const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString("base64url");

let standIn: StandIn, keys: KeySource;
beforeAll(async () => { standIn = await startStandIn({ projectId: PROJECT }); keys = googleKeys(`${standIn.url}/keys`); });
afterAll(() => standIn.close());

const check = (token: unknown, more: { projectId?: string; now?: number; recentS?: number } = {}) => verifyIdToken(token, { projectId: PROJECT, keys, ...more });
const why = async (token: unknown, more?: Parameters<typeof check>[1]): Promise<TokenRefusal | "accepted"> => { const v = await check(token, more); return v.ok ? "accepted" : v.why; };
const nowS = () => Math.floor(Date.now() / 1000);

describe("a Firebase ID token that is right", () => {
  it("is accepted, and says who it is: the account, the address in lower case, the name and how they signed in", async () => {
    const v = await check(standIn.idToken(person, "google.com"));
    expect(v).toMatchObject({ ok: true, identity: { uid: "uid-abc123", email: "asha@family.example", name: "Asha", provider: "google.com" } });
  });
  it("is accepted for an email link too, which Firebase calls the password provider", async () => {
    expect(await why(standIn.idToken({ ...person, name: null }, "password"))).toBe("accepted");
    const v = await check(standIn.idToken({ ...person, name: null }, "password"));
    expect(v.ok && v.identity.name).toBeNull();
  });
});

describe("a token that is wrong is refused", () => {
  const cases: [string, () => string, TokenRefusal][] = [
    ["made for another project (audience)", () => standIn.idToken(person, "google.com", { aud: "some-other-project" }), "audience"],
    ["with a list of audiences, even one that holds ours", () => standIn.idToken(person, "google.com", { aud: [PROJECT, "x"] }), "audience"],
    ["issued by someone else (issuer)", () => standIn.idToken(person, "google.com", { iss: "https://securetoken.google.com/some-other-project" }), "issuer"],
    ["issued by Google's accounts service, not by Firebase", () => standIn.idToken(person, "google.com", { iss: "https://accounts.google.com" }), "issuer"],
    ["past its time", () => standIn.idToken(person, "google.com", { exp: nowS() - 1 }), "expired"],
    ["ending this very second", () => standIn.idToken(person, "google.com", { exp: nowS() - 0.5 }), "expired"],
    ["with no end time", () => standIn.idToken(person, "google.com", { exp: undefined }), "expired"],
    ["with an end time that is not a number", () => standIn.idToken(person, "google.com", { exp: "9999999999" }), "expired"],
    ["not valid yet (issued in the future)", () => standIn.idToken(person, "google.com", { iat: nowS() + SKEW_S + 30 }), "not_yet_valid"],
    ["with a not-before time in the future", () => standIn.idToken(person, "google.com", { nbf: nowS() + SKEW_S + 30 }), "not_yet_valid"],
    ["with no issue time", () => standIn.idToken(person, "google.com", { iat: undefined }), "not_yet_valid"],
    ["signed in at a time in the future", () => standIn.idToken(person, "google.com", { auth_time: nowS() + SKEW_S + 30 }), "auth_time"],
    ["with no sign-in time", () => standIn.idToken(person, "google.com", { auth_time: undefined }), "auth_time"],
    ["with an empty subject", () => standIn.idToken(person, "google.com", { sub: "" }), "subject"],
    ["with a subject of spaces", () => standIn.idToken(person, "google.com", { sub: "   " }), "subject"],
    ["with no subject", () => standIn.idToken(person, "google.com", { sub: undefined }), "subject"],
    ["with a subject that is not text", () => standIn.idToken(person, "google.com", { sub: 12345 }), "subject"],
    ["whose email address was never verified", () => standIn.idToken({ ...person, emailVerified: false }, "google.com"), "email_unverified"],
    ["whose email_verified is the word true, not true itself", () => standIn.idToken(person, "google.com", { email_verified: "true" }), "email_unverified"],
    ["with no word on whether the email was verified", () => standIn.idToken(person, "google.com", { email_verified: undefined }), "email_unverified"],
    ["with no email address", () => standIn.idToken(person, "google.com", { email: undefined }), "no_email"],
    ["with something that is not an address", () => standIn.idToken(person, "google.com", { email: "not an address" }), "no_email"],
    ["from a way of signing in IOpener does not offer (anonymous)", () => standIn.idToken(person, "anonymous"), "provider"],
    ["from a way of signing in IOpener does not offer (phone)", () => standIn.idToken(person, "phone"), "provider"],
    ["from a custom token", () => standIn.idToken(person, "custom"), "provider"],
    ["that does not say how the person signed in", () => standIn.idToken(person, "google.com", { firebase: {} }), "provider"],
    ["from inside a Firebase tenant", () => standIn.idToken(person, "google.com", { firebase: { sign_in_provider: "google.com", tenant: "t-1" } }), "provider"],
    ["that names a key Google does not have", () => standIn.idToken(person, "google.com", {}, { kid: "no-such-key" }), "key_id"],
    ["that names no key", () => standIn.idToken(person, "google.com", {}, { kid: undefined }), "key_id"],
  ];
  for (const [name, make, refusal] of cases) it(name, async () => { expect(await why(make())).toBe(refusal); });

  it("when the signature is not Google's: signed with another key", async () => {
    const other = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
    const [h, p] = standIn.idToken(person, "google.com").split(".");
    const forged = `${h}.${p}.${crypto.sign("RSA-SHA256", Buffer.from(`${h}.${p}`), other.privateKey).toString("base64url")}`;
    expect(await why(forged)).toBe("signature");
  });
  it("when the payload was changed after signing", async () => {
    const [h, p, s] = standIn.idToken(person, "google.com").split(".");
    const claims = JSON.parse(Buffer.from(p, "base64url").toString("utf8"));
    expect(await why(`${h}.${b64({ ...claims, sub: "someone-else" })}.${s}`)).toBe("signature");
    expect(await why(`${h}.${b64({ ...claims, email: "other@family.example" })}.${s}`)).toBe("signature");
  });
  it("when the signature is cut short or empty", async () => {
    const [h, p, s] = standIn.idToken(person, "google.com").split(".");
    expect(await why(`${h}.${p}.${s.slice(0, -4)}`)).toBe("signature");
    expect(await why(`${h}.${p}.`)).toBe("signature");
  });

  it('when it names the algorithm "none", with or without a signature', async () => {
    const [, p, s] = standIn.idToken(person, "google.com").split(".");
    for (const alg of ["none", "None", "NONE"]) {
      expect(await why(`${b64({ alg, typ: "JWT" })}.${p}.`)).toBe("algorithm");
      expect(await why(`${b64({ alg, typ: "JWT" })}.${p}.${s}`)).toBe("algorithm");
    }
  });
  it("when it names any other algorithm, even one whose signature would check out", async () => {
    const [h, p, s] = standIn.idToken(person, "google.com").split(".");
    const kid = JSON.parse(Buffer.from(h, "base64url").toString("utf8")).kid;
    for (const alg of ["RS384", "RS512", "PS256", "ES256", "HS256", "HS512", "rs256", "", undefined]) expect(await why(`${b64({ alg, kid, typ: "JWT" })}.${p}.${s}`)).toBe("algorithm");
  });
  it("when the public key itself is used as a shared secret (HS256)", async () => {
    /* The old trick: sign with HMAC, using the published public key as the secret, and hope the checker follows the header. */
    const res = await fetch(`${standIn.url}/keys`), list = (await res.json()) as Record<string, string>;
    const [kid, publicPem] = Object.entries(list)[0];
    const [, p] = standIn.idToken(person, "google.com").split(".");
    const head = `${b64({ alg: "HS256", kid, typ: "JWT" })}.${p}`;
    expect(await why(`${head}.${crypto.createHmac("sha256", publicPem).update(head).digest("base64url")}`)).toBe("algorithm");
  });

  it("when it is not a token at all", async () => {
    const good = standIn.idToken(person, "google.com"), [h, p, s] = good.split(".");
    for (const bad of [undefined, null, 42, {}, "", "abc", "a.b", "a.b.c.d", `${h}.${p}`, `${h}..${s}`, `!!.${p}.${s}`, `${h}.${Buffer.from("[1,2]").toString("base64url")}.${s}`, `${h}.${Buffer.from("not json").toString("base64url")}.${s}`, `${good}=`, "x".repeat(9000)]) {
      expect(await why(bad), String(bad).slice(0, 30)).not.toBe("accepted");
    }
    expect(await why("a.b.c")).toBe("malformed");
    expect(await why(`${h}.${p}=.${s}`)).toBe("malformed");
  });

  it("when no project is set to check it against", async () => {
    expect(await why(standIn.idToken(person, "google.com", { aud: "", iss: "https://securetoken.google.com/" }), { projectId: "" })).toBe("audience");
  });
});

describe("clocks and freshness", () => {
  it("allows the two clocks to differ by a moment for times in the past, and not at all for the end time", async () => {
    expect(await why(standIn.idToken(person, "google.com", { iat: nowS() + 20, auth_time: nowS() + 20 }))).toBe("accepted");
    expect(await why(standIn.idToken(person, "google.com"), { now: Date.now() + 3600_000 + 1000 })).toBe("expired");
    expect(await why(standIn.idToken(person, "google.com"), { now: Date.now() + 3599_000 - 2000 })).toBe("accepted");
  });
  it("refuses a sign-in that happened too long ago when the caller asks for a fresh one", async () => {
    const old = standIn.idToken(person, "google.com", { auth_time: nowS() - 900 });
    expect(await why(old)).toBe("accepted");
    expect(await why(old, { recentS: 300 })).toBe("not_recent");
    expect(await why(standIn.idToken(person, "google.com"), { recentS: 300 })).toBe("accepted");
  });
});

/* A key list that counts how often it is fetched, and can be told to fail. */
function countingList(pairs: () => Record<string, string>, cacheControl: () => string | null) {
  const state = { fetches: 0, down: false };
  const fetcher = async () => {
    state.fetches++;
    if (state.down) throw new Error("no network");
    return { ok: true, status: 200, headers: { get: (n: string) => (n.toLowerCase() === "cache-control" ? cacheControl() : null) }, json: async () => pairs() };
  };
  return { state, fetcher };
}

describe("Google's public keys", () => {
  const a = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 }), b = crypto.generateKeyPairSync("rsa", { modulusLength: 2048 });
  const spki = (k: crypto.KeyObject) => k.export({ type: "spki", format: "pem" }).toString();
  const T = 1_800_000_000_000;

  it("reads how long the list may be kept from its Cache-Control header", () => {
    expect(keepSeconds("public, max-age=19845, must-revalidate, no-transform")).toBe(19845);
    expect(keepSeconds("max-age=5")).toBe(60);
    expect(keepSeconds("max-age=99999999")).toBe(86_400);
    expect(keepSeconds(null)).toBe(3600);
    expect(keepSeconds("no-store")).toBe(60);
    expect(keepSeconds("private, no-cache, max-age=6000")).toBe(60);
  });

  it("fetches the list once and keeps it for as long as the header allows, then fetches again", async () => {
    const list = countingList(() => ({ k1: spki(a.publicKey) }), () => "public, max-age=600");
    const source = googleKeys("https://keys.example/list", list.fetcher);
    expect(await source.get("k1", T)).toBeInstanceOf(crypto.KeyObject);
    expect(await source.get("k1", T + 599_000)).toBeInstanceOf(crypto.KeyObject);
    expect(list.state.fetches).toBe(1);
    expect(await source.get("k1", T + 600_000)).toBeInstanceOf(crypto.KeyObject);
    expect(list.state.fetches).toBe(2);
  });

  it("picks up a change of keys: an unknown key id fetches the list again at once, but not more than once a minute", async () => {
    let current: Record<string, string> = { k1: spki(a.publicKey) };
    const list = countingList(() => current, () => "public, max-age=20000");
    const source = googleKeys("https://keys.example/list", list.fetcher);
    expect(await source.get("k1", T)).toBeInstanceOf(crypto.KeyObject);
    /* Google swaps the keys long before the list's time is up. */
    current = { k2: spki(b.publicKey) };
    expect(await source.get("k2", T + 61_000)).toBeInstanceOf(crypto.KeyObject);
    expect(list.state.fetches).toBe(2);
    /* The old key is gone with the old list. */
    expect(await source.get("k1", T + 62_000)).toBeNull();
    /* A stream of made-up key ids does not turn into a stream of fetches. */
    for (let i = 0; i < 20; i++) expect(await source.get(`made-up-${i}`, T + 63_000 + i)).toBeNull();
    expect(list.state.fetches).toBe(2);
    expect(await source.get("made-up", T + 61_000 + 60_000)).toBeNull();
    expect(list.state.fetches).toBe(3);
  });

  it("has no keys at all when the list cannot be fetched and the old one is past its time", async () => {
    const list = countingList(() => ({ k1: spki(a.publicKey) }), () => "max-age=600");
    const source = googleKeys("https://keys.example/list", list.fetcher);
    expect(await source.get("k1", T)).toBeInstanceOf(crypto.KeyObject);
    list.state.down = true;
    expect(await source.get("k1", T + 300_000)).toBeInstanceOf(crypto.KeyObject);
    expect(await source.get("k1", T + 600_001)).toBe("unavailable");
    list.state.down = false;
    expect(await source.get("k1", T + 600_002)).toBeInstanceOf(crypto.KeyObject);
  });

  it("refuses every token while there are no keys, and says the keys are the reason", async () => {
    const down = googleKeys("https://keys.example/list", async () => { throw new Error("no network"); });
    const v = await verifyIdToken(standIn.idToken(person, "google.com"), { projectId: PROJECT, keys: down });
    expect(v).toEqual({ ok: false, why: "keys_unavailable" });
  });

  it("fetches once when many tokens arrive together", async () => {
    const list = countingList(() => ({ k1: spki(a.publicKey) }), () => "max-age=600");
    const source = googleKeys("https://keys.example/list", list.fetcher);
    await Promise.all(Array.from({ length: 8 }, () => source.get("k1", T)));
    expect(list.state.fetches).toBe(1);
  });

  it("takes only RSA keys of 2048 bits or more out of the list", () => {
    const small = crypto.generateKeyPairSync("rsa", { modulusLength: 1024 }), curve = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" });
    expect(publicKeyFrom(spki(a.publicKey))).toBeInstanceOf(crypto.KeyObject);
    expect(publicKeyFrom(spki(small.publicKey))).toBeNull();
    expect(publicKeyFrom(spki(curve.publicKey))).toBeNull();
    for (const bad of [undefined, 7, "", "-----BEGIN CERTIFICATE-----\nnot a certificate\n-----END CERTIFICATE-----", a.privateKey.export({ type: "pkcs8", format: "der" }).toString("base64")]) expect(publicKeyFrom(bad)).toBeNull();
  });

  it("follows a change of keys at the stand-in, end to end", async () => {
    const source = googleKeys(`${standIn.url}/keys`);
    const before = standIn.idToken(person, "google.com");
    expect((await verifyIdToken(before, { projectId: PROJECT, keys: source })).ok).toBe(true);
    standIn.rotateKeys();
    const after = standIn.idToken(person, "google.com");
    /* Within a minute of the last fetch the list is not fetched again; Google publishes a new key long before it signs with it. */
    expect(await verifyIdToken(after, { projectId: PROJECT, keys: source })).toEqual({ ok: false, why: "key_id" });
    expect((await verifyIdToken(after, { projectId: PROJECT, keys: source, now: Date.now() + 61_000 })).ok).toBe(true);
    /* A token signed with the key that was withdrawn no longer passes. */
    expect(await verifyIdToken(before, { projectId: PROJECT, keys: source, now: Date.now() + 62_000 })).toEqual({ ok: false, why: "key_id" });
    keys = googleKeys(`${standIn.url}/keys`);
  });
});

/**
 * Google's real list holds X.509 certificates, not bare keys. This is one such certificate, made for this test
 * with openssl, and a token signed with its private key, which was thrown away. Nothing here is a secret.
 */
const CERTIFICATE = `-----BEGIN CERTIFICATE-----
MIIDPzCCAiegAwIBAgIUIPeN9pvqnpwznlsL9yhYCRW6h6QwDQYJKoZIhvcNAQEL
BQAwLzEtMCsGA1UEAwwkaW9wZW5lciB0ZXN0IGZpeHR1cmUsIG5vdCBhIHJlYWwg
a2V5MB4XDTI2MTAwNTAzMDM1M1oXDTQ2MDkzMDAzMDM1M1owLzEtMCsGA1UEAwwk
aW9wZW5lciB0ZXN0IGZpeHR1cmUsIG5vdCBhIHJlYWwga2V5MIIBIjANBgkqhkiG
9w0BAQEFAAOCAQ8AMIIBCgKCAQEAwImqvoimU9MvhmS9EP3tiWQnUPB8p6jNPv/t
nvs0V6Lllwy3ep9nuCRGTV+x/oOMdVuF+nxxbn5NDrxi3kSpzpLwJCIJJy2Gcp6c
bJUHvvePCMiZ7kAepEBrVH/s+jH46UrkqXnWVbxvqfT2FFPHn7p3Yw8A9BnhNVL1
+2dTH/aLLspnjl89T8VzguuM4Y1uByV29ZJIDDD8IG7XekfywNFruyrkiidz9QDb
3N/1xTxEyctBB8ZzDWiLJg6j1vVG6FOi8+MCpPgd5vAdSoLsvmxWWb1J+gpeis6a
RDvEK9JTMf358n3che2JDt9dORIk7/FGnNyD9Phq4XIrJEyY1QIDAQABo1MwUTAd
BgNVHQ4EFgQUjhdsseHW/lYMQG3g79OkDSbsWW0wHwYDVR0jBBgwFoAUjhdsseHW
/lYMQG3g79OkDSbsWW0wDwYDVR0TAQH/BAUwAwEB/zANBgkqhkiG9w0BAQsFAAOC
AQEAvkhoaNMT8mMGd+xYK6fEuMZD7qT+F8qK9+0xhBluP9PhbgcD9gubOVnZHS4u
Pd4Tz8VB5ldw5Ka06Gt/2npTYvHkKKUmrl08nI8FIRLfebM/sWIlnHjmNJ8qWtgp
6tFoft0F3kUYHCLdzHXIpLjCT1W0bZdB9//o7fyNyDpkTvvbwk2SM95cMLcGVsA9
OeEJbAQUFYLkMr0GJf6HHVRyEL7Obm8DQrDML30d0+ChZ907A0uASxbhdi1Eau5f
6/GqPbWlN6yv+8hxx2FbC/ZYrbqddvg31BVRCdexyCycQMxm3w4FHPuB0Rs3wB92
bXfgbRqWycXBk7Mgxr7VLiCe1g==
-----END CERTIFICATE-----`;
const SIGNED = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImZpeHR1cmUta2V5LTEiLCJ0eXAiOiJKV1QifQ.eyJpc3MiOiJodHRwczovL3NlY3VyZXRva2VuLmdvb2dsZS5jb20vaW9wZW5lci1maXh0dXJlIiwiYXVkIjoiaW9wZW5lci1maXh0dXJlIiwiYXV0aF90aW1lIjoxNzkwMDAwMDAwLCJ1c2VyX2lkIjoiZml4dHVyZVVpZDEyMyIsInN1YiI6ImZpeHR1cmVVaWQxMjMiLCJpYXQiOjE3OTAwMDAwMDAsImV4cCI6MTc5MDAwMzYwMCwiZW1haWwiOiJmaXh0dXJlQGlvcGVuZXIudGVzdCIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiRml4dHVyZSBQZXJzb24iLCJmaXJlYmFzZSI6eyJpZGVudGl0aWVzIjp7Imdvb2dsZS5jb20iOlsiMSJdLCJlbWFpbCI6WyJmaXh0dXJlQGlvcGVuZXIudGVzdCJdfSwic2lnbl9pbl9wcm92aWRlciI6Imdvb2dsZS5jb20ifX0.NGr0cdlyHZ6y7Lpi-rW8NjEymWyw1icwrFl2AINQwzXUnSc0irRJjv36jThNmsH8i2pzSpIXd5iUEYN79E-UyjlLtxH28oMGDqQgYb9Zx-ueSd6_BbXIwDRaJtF5XueL82aPot-CmfeSvJxgBqlj5_AP53_yQZGzxgdL_C_Px2q6NT8hyKFod_OlJigfTd1XeOPJy_kWUHsdXxtIWGiGq0hJgmc-3fstS0x0GG0ksnJj4XCeTgRl4305o8Kd3ieCiIVvyFJgDiNCqSDq_c3amKPhX7WLcftvUB3Q9k1uWTZwy5Qw_qZdKe-HdNbQuOlbr2I6BgtPkPtPZNTf07a1Gw";
const SIGNED_AT = 1_790_000_000;

describe("a certificate as Google publishes them", () => {
  const list = googleKeys("https://keys.example/list", async () => ({ ok: true, status: 200, headers: { get: () => "public, max-age=3600" }, json: async () => ({ "fixture-key-1": CERTIFICATE }) }));
  const at = (seconds: number) => ({ projectId: "iopener-fixture", keys: list, now: (SIGNED_AT + seconds) * 1000 });

  it("gives the key that checks a token signed with it", async () => {
    expect(await verifyIdToken(SIGNED, at(10))).toEqual({
      ok: true, identity: { uid: "fixtureUid123", email: "fixture@iopener.test", name: "Fixture Person", provider: "google.com", authTime: SIGNED_AT },
    });
  });
  it("still refuses that token an hour later, for another project, or with one letter changed", async () => {
    expect(await verifyIdToken(SIGNED, at(3601))).toEqual({ ok: false, why: "expired" });
    expect(await verifyIdToken(SIGNED, { ...at(10), projectId: "iopener-prod" })).toEqual({ ok: false, why: "audience" });
    const [h, p, s] = SIGNED.split(".");
    expect(await verifyIdToken(`${h}.${p}.${s.slice(0, 20)}${s[20] === "A" ? "B" : "A"}${s.slice(21)}`, at(10))).toEqual({ ok: false, why: "signature" });
  });
});
