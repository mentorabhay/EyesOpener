// Eyes Opener: A browser's cookies for one request and the answer's Set-Cookie list, as Next keeps them. .
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: async () => { throw new Error("not in this test"); } }));

import { bundleAge, encodeBundle, makeJar, MAX_BUNDLE, readBundle, SESSION_COOKIE } from "./cookie-jar";

/** A browser's cookies for one request and the answer's Set-Cookie list, as Next keeps them. */
function browser(start: Record<string, string> = {}) {
  const cookies = new Map(Object.entries(start));
  const written: { name: string; value: string; options?: Record<string, unknown> }[] = [];
  const store = {
    get: (name: string) => (cookies.has(name) ? { value: cookies.get(name)! } : undefined),
    set: (name: string, value: string, options?: Record<string, unknown>) => { cookies.set(name, value); written.push({ name, value, options }); },
    delete: (name: string) => { cookies.delete(name); written.push({ name, value: "" }); },
  };
  return { cookies, written, store };
}

describe("one cookie for everything", () => {
  it("keeps every entry in __session, httpOnly, and reads it back", () => {
    const b = browser();
    const jar = makeJar(b.store, b.store);
    jar.set("io_user", "signed.token", { maxAge: 3600, httpOnly: true });
    jar.set("io_profile", "p1", { maxAge: 60 });
    expect([...b.cookies.keys()]).toEqual([SESSION_COOKIE]);
    const last = b.written.at(-1)!;
    expect(last.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });
    expect(last.options!.maxAge).toBe(3600);
    const again = makeJar(b.store, null);
    expect(again.get("io_user")?.value).toBe("signed.token");
    expect(again.get("io_profile")?.value).toBe("p1");
    expect(again.has("io_child")).toBe(false);
  });

  it("adds up several writes in one request", () => {
    const b = browser();
    const jar = makeJar(b.store, b.store);
    jar.set("a", "1"); jar.set("b", "2"); jar.delete("a");
    expect(Object.keys(readBundle(b.cookies.get(SESSION_COOKIE)))).toEqual(["b"]);
  });

  it("removes the cookie when nothing is left in it", () => {
    const b = browser();
    const jar = makeJar(b.store, b.store);
    jar.set("a", "1");
    jar.delete("a");
    expect(b.cookies.has(SESSION_COOKIE)).toBe(false);
  });

  it("forgets an entry whose own time has passed", () => {
    let now = 1_000_000;
    const b = browser();
    makeJar(b.store, b.store, () => now).set("short", "x", { maxAge: 10 }).set("long", "y", { maxAge: 100 });
    now += 20_000;
    const jar = makeJar(b.store, null, () => now);
    expect(jar.get("short")).toBeUndefined();
    expect(jar.get("long")?.value).toBe("y");
  });

  it("lives as long as its longest entry, or the browser session when an entry has no end", () => {
    expect(bundleAge({ a: ["1", 61_000], b: ["2", 11_000] }, 1000)).toBe(60);
    expect(bundleAge({ a: ["1", 61_000], b: ["2"] }, 1000)).toBeUndefined();
  });

  it("gives the page a plain copy of an entry it is meant to read, and takes it away with the entry", () => {
    const b = browser();
    const jar = makeJar(b.store, b.store);
    jar.set("io_lang", "hi", { httpOnly: false, maxAge: 100 });
    expect(b.cookies.get("io_lang")).toBe("hi");
    expect(readBundle(b.cookies.get(SESSION_COOKIE)).io_lang?.[0]).toBe("hi");
    jar.delete("io_lang");
    expect(b.cookies.has("io_lang")).toBe(false);
  });

  it("still reads a cookie of the old kind, and removes it once the entry is written", () => {
    const b = browser({ io_user: "old.token" });
    const jar = makeJar(b.store, b.store);
    expect(jar.get("io_user")?.value).toBe("old.token");
    jar.set("io_user", "new.token");
    expect(b.cookies.has("io_user")).toBe(false);
    expect(makeJar(b.store, null).get("io_user")?.value).toBe("new.token");
  });

  it("prefers the entry to an old cookie of the same name", () => {
    const b = browser({ io_gate: "old", [SESSION_COOKIE]: encodeBundle({ io_gate: ["new"] }) });
    expect(makeJar(b.store, null).get("io_gate")?.value).toBe("new");
  });

  it("reads a damaged or foreign __session as empty", () => {
    expect(readBundle("not base64 json")).toEqual({});
    expect(readBundle(Buffer.from("[1,2]").toString("base64url"))).toEqual({});
    expect(readBundle(encodeBundle({ a: ["1"] }).slice(0, 5))).toEqual({});
    expect(readBundle(Buffer.from(JSON.stringify({ a: [1], b: ["x", "y"], c: ["ok"] })).toString("base64url"))).toEqual({ c: ["ok"] });
  });

  it("refuses to write where it may only read, and never writes a bundle too large for a browser", () => {
    const b = browser();
    expect(() => makeJar(b.store, null).set("a", "1")).toThrow();
    expect(() => makeJar(b.store, b.store).set("big", "x".repeat(MAX_BUNDLE))).toThrow();
  });

  it("holds every cookie the app uses, at their largest, well inside a browser's limit", () => {
    const b = browser();
    const jar = makeJar(b.store, b.store);
    const token = "x".repeat(260) + "." + "y".repeat(43);
    for (const n of ["io_user", "io_gate", "io_child", "io_signin", "io_exit_tries", "io_lang_pass"]) jar.set(n, token, { maxAge: 86400 });
    jar.set("io_profile", "00000000-0000-0000-0000-000000000000", { maxAge: 86400 });
    jar.set("io_lang", "hi", { httpOnly: false, maxAge: 86400 });
    jar.set("io_lang_synced", "1", { maxAge: 10 });
    expect(b.cookies.get(SESSION_COOKIE)!.length).toBeLessThan(MAX_BUNDLE);
  });
});

describe("the rule that every cookie goes through the jar", () => {
  it("no code but the jar touches Next's cookies or names a cookie of its own", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const root = path.resolve(import.meta.dirname, "..");
    const files: string[] = [];
    const walk = async (dir: string) => {
      for (const e of await fs.readdir(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) await walk(p);
        else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) files.push(p);
      }
    };
    await walk(root);
    const bad: string[] = [];
    for (const f of files) {
      if (f.endsWith(path.join("lib", "cookie-jar.ts"))) continue;
      const src = await fs.readFile(f, "utf8");
      if (/import\s*\{[^}]*\bcookies\b[^}]*\}\s*from\s*"next\/headers"/.test(src) || /\b(req|request|res|response)\.cookies\.(get|set|delete)\(/.test(src)) bad.push(path.relative(root, f));
    }
    expect(bad).toEqual([]);
    expect(files.length).toBeGreaterThan(100);
  });
});
