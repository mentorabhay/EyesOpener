// Eyes Opener: A made-up mail server: answers each line by a script, and keeps what it was told. .
import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { tidyCode } from "./code-rules";
import { compose, converse, dotStuff, mailSettings, type MailSettings, type Socketish } from "./mail";

const S: MailSettings = { from: "signin@iopener.example", password: "abcdefghijklmnop", host: "smtp.example", port: 465 };

/** A made-up mail server: answers each line by a script, and keeps what it was told. */
function server(answers: Record<string, string>, greeting = "220 ready") {
  const e = new EventEmitter(), said: string[] = [];
  const reply = (s: string) => setImmediate(() => e.emit("data", Buffer.from(`${s}\r\n`)));
  const sock: Socketish = {
    write: (s) => {
      said.push(s);
      const word = s.startsWith("AUTH") ? "AUTH" : s.startsWith("MAIL") ? "MAIL" : s.startsWith("RCPT") ? "RCPT" : s.startsWith("EHLO") ? "EHLO" : s === "DATA\r\n" ? "DATA" : s.startsWith("QUIT") ? "QUIT" : "BODY";
      if (word === "EHLO") { setImmediate(() => e.emit("data", Buffer.from("250-smtp.example\r\n250-AUTH PLAIN\r\n"))); reply(answers.EHLO ?? "250 ok"); return; }
      if (word !== "QUIT") reply(answers[word] ?? (word === "AUTH" ? "235 ok" : word === "DATA" ? "354 go" : "250 ok"));
    },
    end: () => e.emit("close"),
    on: (ev: string, f: (...a: unknown[]) => void) => { e.on(ev, f); },
  } as Socketish;
  reply(greeting);
  return { sock, said };
}

describe("the mail settings", () => {
  it("are off until an address and a password are both set", () => {
    expect(mailSettings({})).toBeNull();
    expect(mailSettings({ MAIL_FROM: "signin@iopener.example" })).toBeNull();
    expect(mailSettings({ MAIL_FROM: "not an address", MAIL_PASSWORD: "abcd efgh ijkl mnop" })).toBeNull();
    expect(mailSettings({ MAIL_FROM: "signin@iopener.example", MAIL_PASSWORD: "abcd efgh ijkl mnop" })).toEqual({ from: "signin@iopener.example", password: "abcdefghijklmnop", host: "smtp.gmail.com", port: 465 });
  });
});

describe("a message", () => {
  it("has its headers on one line each, so nothing typed can add a header", () => {
    const m = compose({ to: "a@b.example", subject: "Hi\r\nBcc: evil@x.example", text: "hello" }, S.from, new Date("2026-10-10T00:00:00Z"));
    expect(m).toContain("Subject: Hi Bcc: evil@x.example");
    expect(m.split("\r\n").filter((l) => l.startsWith("Bcc:"))).toHaveLength(0);
    expect(m).toContain("From: Eyes Opener <signin@iopener.example>");
    expect(m).toContain(Buffer.from("hello").toString("base64"));
  });
  it("refuses an address that could carry a header or a second address", () => {
    expect(() => compose({ to: "a@b.example>\r\nRCPT TO:<c@d", subject: "x", text: "y" }, S.from)).toThrow();
    expect(() => compose({ to: "two words@b.example", subject: "x", text: "y" }, S.from)).toThrow();
  });
  it("carries a text part and an HTML part", () => {
    const m = compose({ to: "a@b.example", subject: "123456 is your code", text: "t", html: "<p>h</p>" }, S.from, new Date(), "BND");
    expect(m).toContain('multipart/alternative; boundary="BND"');
    expect(m).toContain("--BND--");
  });
  it("doubles a dot at the start of a line, so it never ends the message early", () => {
    expect(dotStuff("a\r\n.b\r\n..c")).toBe("a\r\n..b\r\n...c");
  });
});

describe("talking to the mail server", () => {
  it("signs in, names the sender and the person, sends the message and says sent", async () => {
    const { sock, said } = server({});
    expect(await converse(sock, S, "a@b.example", "Subject: x\r\n\r\nbody")).toBe("sent");
    expect(said[0]).toBe("EHLO iopener\r\n");
    expect(said[1]).toBe(`AUTH PLAIN ${Buffer.from(`\0${S.from}\0${S.password}`).toString("base64")}\r\n`);
    expect(said[2]).toBe(`MAIL FROM:<${S.from}>\r\n`);
    expect(said[3]).toBe("RCPT TO:<a@b.example>\r\n");
    expect(said[5]).toMatch(/\r\n\.\r\n$/);
  });
  it("says refused when the server does not accept the sending account's password, and sends nothing", async () => {
    const { sock, said } = server({ AUTH: "535 bad" });
    expect(await converse(sock, S, "a@b.example", "x")).toBe("refused");
    expect(said.some((l) => l.startsWith("MAIL"))).toBe(false);
  });
  it("says unreachable when the server does not greet", async () => {
    const { sock } = server({}, "554 go away");
    expect(await converse(sock, S, "a@b.example", "x")).toBe("unreachable");
  });
  it("gives up after a while when the server goes quiet", async () => {
    const e = new EventEmitter();
    const sock = { write: () => undefined, end: () => undefined, on: (ev: string, f: (...a: unknown[]) => void) => { e.on(ev, f); } } as Socketish;
    expect(await converse(sock, S, "a@b.example", "x", 50)).toBe("unreachable");
  });
});

describe("a typed code", () => {
  it("is six digits, with spaces and dashes forgiven", () => {
    expect(tidyCode("123456")).toBe("123456");
    expect(tidyCode("123 456")).toBe("123456");
    expect(tidyCode("123-456")).toBe("123456");
    expect(tidyCode("12345")).toBeNull();
    expect(tidyCode("12345a")).toBeNull();
    expect(tidyCode(123456)).toBeNull();
  });
});
