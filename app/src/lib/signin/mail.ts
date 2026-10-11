// Eyes Opener: Sends one email: the six-digit sign-in code (code.ts). Server only.
/**
 * Sends one email: the six-digit sign-in code (code.ts). Server only.
 *
 * It speaks SMTP itself over TLS (Node's own `tls`, no mail package), to Gmail's mail server by default, signed in as
 * the Google account IOpener sends from with that account's app password (owner step M1). Off until both are set:
 *
 *   MAIL_FROM       the sending address, for example signin@iopener.example
 *   MAIL_PASSWORD   that account's app password (from Secret Manager, `mail-app-password`; never in a file or a log)
 *   MAIL_HOST       smtp.gmail.com unless set; MAIL_PORT 465 unless set (TLS from the first byte)
 *
 * Nothing here writes an address, a code or a password to the log: a failure says only which step of the
 * conversation the server refused, and with what number.
 */
import tls from "node:tls";

export interface MailSettings { from: string; password: string; host: string; port: number }
export interface Message { to: string; subject: string; text: string; html?: string }

const ADDRESS = /^[^\s@<>"]{1,64}@[^\s@<>"]{1,190}$/;

export function mailSettings(env: Record<string, string | undefined> = process.env): MailSettings | null {
  const from = env.MAIL_FROM?.trim() ?? "", password = (env.MAIL_PASSWORD ?? "").replace(/\s+/g, "");
  if (!ADDRESS.test(from) || password.length < 8) return null;
  const port = Number(env.MAIL_PORT ?? 465);
  return { from, password, host: env.MAIL_HOST?.trim() || "smtp.gmail.com", port: Number.isInteger(port) && port > 0 ? port : 465 };
}

/** A header value with no line breaks, so nothing typed can add a header. */
const oneLine = (s: string) => s.replace(/[\r\n]+/g, " ").trim();
/** Words outside plain ASCII in a header, as RFC 2047 asks. */
const header = (s: string) => { const t = oneLine(s); return /^[\x20-\x7e]*$/.test(t) ? t : `=?UTF-8?B?${Buffer.from(t).toString("base64")}?=`; };

/** The message as SMTP sends it after DATA: headers, a text part and, when there is one, an HTML part. */
export function compose(m: Message, from: string, now = new Date(), boundary = `io-${now.getTime().toString(36)}`): string {
  if (!ADDRESS.test(m.to)) throw new Error("bad_address");
  const b64 = (s: string) => Buffer.from(s).toString("base64").replace(/.{76}/g, "$&\r\n");
  const lines = [
    `From: IOpener <${from}>`, `To: <${m.to}>`, `Subject: ${header(m.subject)}`, `Date: ${now.toUTCString()}`,
    `Message-ID: <${now.getTime()}.${Math.random().toString(36).slice(2)}@iopener.signin>`, "MIME-Version: 1.0", "Auto-Submitted: auto-generated",
  ];
  if (!m.html) return [...lines, "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "", b64(m.text)].join("\r\n");
  return [
    ...lines, `Content-Type: multipart/alternative; boundary="${boundary}"`, "",
    `--${boundary}`, "Content-Type: text/plain; charset=utf-8", "Content-Transfer-Encoding: base64", "", b64(m.text),
    `--${boundary}`, "Content-Type: text/html; charset=utf-8", "Content-Transfer-Encoding: base64", "", b64(m.html),
    `--${boundary}--`,
  ].join("\r\n");
}

/** A line starting with a dot is doubled, so it is never read as the end of the message. */
export const dotStuff = (body: string) => body.replace(/\r\n\./g, "\r\n..");

export type Sent = "sent" | "off" | "refused" | "unreachable";

export interface Socketish {
  write(s: string): void;
  end(): void;
  on(e: "data", f: (b: Buffer) => void): void;
  on(e: "error" | "close", f: (err?: Error) => void): void;
}

/**
 * The SMTP conversation on a connected socket: greeting, EHLO, AUTH PLAIN, MAIL FROM, RCPT TO, DATA, QUIT.
 * Kept apart from the connection so a test can talk to it.
 */
export async function converse(sock: Socketish, s: MailSettings, to: string, data: string, timeoutMs = 20_000): Promise<Sent> {
  let buffer = "";
  const waiting: ((line: string) => void)[] = [];
  sock.on("data", (b) => {
    buffer += b.toString("utf8");
    let i: number;
    while ((i = buffer.indexOf("\r\n")) >= 0) {
      const line = buffer.slice(0, i);
      buffer = buffer.slice(i + 2);
      /* "250-..." continues a reply; "250 ..." ends it */
      if (/^\d{3} /.test(line) || /^\d{3}$/.test(line)) waiting.shift()?.(line);
    }
  });
  let broken = false;
  sock.on("error", () => { broken = true; while (waiting.length) waiting.shift()?.("000"); });
  sock.on("close", () => { broken = true; while (waiting.length) waiting.shift()?.("000"); });
  const reply = () => new Promise<number>((resolve) => {
    const timer = setTimeout(() => resolve(0), timeoutMs);
    waiting.push((line) => { clearTimeout(timer); resolve(Number(line.slice(0, 3))); });
  });
  const say = async (line: string, want: number) => { if (broken) return false; sock.write(`${line}\r\n`); return (await reply()) === want; };
  try {
    if ((await reply()) !== 220) return "unreachable";
    if (!(await say("EHLO iopener", 250))) return "refused";
    if (!(await say(`AUTH PLAIN ${Buffer.from(`\0${s.from}\0${s.password}`).toString("base64")}`, 235))) { console.warn("[sign-in] the mail server refused the sign-in of the sending account"); return "refused"; }
    if (!(await say(`MAIL FROM:<${s.from}>`, 250))) return "refused";
    if (!(await say(`RCPT TO:<${to}>`, 250))) return "refused";
    if (!(await say("DATA", 354))) return "refused";
    if (!(await say(`${dotStuff(data)}\r\n.`, 250))) return "refused";
    sock.write("QUIT\r\n");
    return "sent";
  } finally { sock.end(); }
}

/** Sends one message, or says why not. */
export async function sendMail(m: Message, s: MailSettings | null = mailSettings()): Promise<Sent> {
  if (!s) return "off";
  let data: string;
  try { data = compose(m, s.from); } catch { return "refused"; }
  const sock = await new Promise<tls.TLSSocket | null>((resolve) => {
    const c = tls.connect({ host: s.host, port: s.port, servername: s.host, timeout: 15_000 }, () => resolve(c));
    c.once("error", () => resolve(null));
    c.once("timeout", () => { c.destroy(); resolve(null); });
  });
  if (!sock) return "unreachable";
  return converse(sock, s, m.to, data);
}
