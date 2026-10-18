"use client";
/**
 * The eye-care chat: a small winking eye at the bottom right that opens into a panel. The person chooses to type
 * or to speak, and whether they ask about eyes in general or about Eyes Opener itself.
 *
 *  - Speaking uses the browser's own speech recognition (in Chrome it is done by Google's speech service), and the
 *    answer is read aloud by the browser's own voices. No sound is sent to Eyes Opener's server: only the words.
 *  - The conversation lives in this page only. The last few turns go back with each question so a follow-up makes
 *    sense; nothing of it is kept on the server.
 *  - The eye winks on a slow loop; with "reduce motion" it stays open and still.
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { assistant as t } from "@/copy/assistant";
import { HISTORY_TURNS, QUESTION_MAX } from "@/lib/assist/chat-rules";
import type { ChatLink, ChatTopic } from "@/lib/assist/types";
import css from "./assistant.module.css";

type Mode = "chat" | "voice";
type Msg =
  | { id: number; from: "you"; text: string }
  | { id: number; from: "assistant"; text: string; links?: ChatLink[]; seeDoctor?: boolean }
  | { id: number; from: "urgent"; sign: string }
  | { id: number; from: "note"; text: string };

/* The browser's speech recognition has no type in TypeScript's own library. Only what is used here. */
interface Recognition {
  lang: string; interimResults: boolean; continuous: boolean; maxAlternatives: number;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
const recognitionClass = (): (new () => Recognition) | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

const noChange = () => () => {};

export function EyeChat() {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("chat");
  const [topic, setTopic] = useState<ChatTopic>("eyes");
  const [convo, setConvo] = useState<Record<ChatTopic, Msg[]>>({ eyes: [], app: [] });
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [aloud, setAloud] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  /* whether this browser can listen: known only in the browser, never on the server */
  const canListen = useSyncExternalStore(noChange, () => !!recognitionClass(), () => false);

  const bubble = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const rec = useRef<Recognition | null>(null);
  const heardRef = useRef("");
  /* each message's key, counted in this panel */
  const ids = useRef(1);

  const msgs = convo[topic];
  const add = useCallback((tp: ChatTopic, m: Msg) => setConvo((c) => ({ ...c, [tp]: [...c[tp], m] })), []);

  /* new messages scroll into view */
  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" }); }, [msgs.length, busy]);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const say = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices();
    u.voice = voices.find((v) => v.lang === "en-IN") ?? voices.find((v) => v.lang.startsWith("en")) ?? null;
    u.lang = u.voice?.lang ?? "en-IN";
    u.rate = 0.98;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    setSpeaking(true);
    synth.speak(u);
  }, []);

  const ask = useCallback(async (raw: string, readOut: boolean) => {
    const question = raw.replace(/\s+/g, " ").trim();
    if (!question || busy) return;
    if (question.length > QUESTION_MAX) { add(topic, { id: ids.current++, from: "note", text: t.tooLong(QUESTION_MAX) }); return; }
    const tp = topic;
    const history = convo[tp]
      .filter((m): m is Extract<Msg, { from: "you" | "assistant" }> => m.from === "you" || m.from === "assistant")
      .slice(-HISTORY_TURNS).map((m) => ({ from: m.from, text: m.text }));
    add(tp, { id: ids.current++, from: "you", text: question });
    setDraft("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "content-type": "application/json", "x-iopener-assistant": "1" }, body: JSON.stringify({ topic: tp, question, history }) });
      const a = res.ok ? await res.json() as { ok: boolean; urgent?: string; text?: string; links?: ChatLink[]; seeDoctor?: boolean; why?: string } : { ok: false, why: "none" };
      if (a.ok && a.urgent) {
        add(tp, { id: ids.current++, from: "urgent", sign: a.urgent });
        if (readOut) say(`${t.urgent.title}. ${t.urgent.text}`);
      } else if (a.ok && a.text) {
        add(tp, { id: ids.current++, from: "assistant", text: a.text, links: a.links ?? [], seeDoctor: !!a.seeDoctor });
        if (readOut) say(a.text);
      } else {
        add(tp, { id: ids.current++, from: "note", text: t.closed[a.why ?? "failed"] ?? t.closed.failed });
      }
    } catch {
      add(tp, { id: ids.current++, from: "note", text: t.closed.failed });
    } finally {
      setBusy(false);
    }
  }, [add, busy, convo, say, topic]);

  const listen = useCallback(() => {
    if (listening) { rec.current?.stop(); return; }
    const R = recognitionClass();
    if (!R) { add(topic, { id: ids.current++, from: "note", text: t.noVoice }); return; }
    stopSpeaking();
    const r = new R();
    r.lang = "en-IN"; r.interimResults = true; r.continuous = false; r.maxAlternatives = 1;
    heardRef.current = ""; setHeard("");
    r.onresult = (e) => {
      const text = Array.from(e.results).map((x) => x[0]?.transcript ?? "").join(" ").trim();
      heardRef.current = text; setHeard(text);
    };
    r.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") add(topic, { id: ids.current++, from: "note", text: t.micBlocked });
    };
    r.onend = () => {
      setListening(false);
      rec.current = null;
      const said = heardRef.current;
      setHeard("");
      if (said) void ask(said, true);
    };
    rec.current = r;
    setListening(true);
    try { r.start(); } catch { setListening(false); rec.current = null; }
  }, [add, ask, listening, stopSpeaking, topic]);

  const close = useCallback(() => {
    rec.current?.abort();
    stopSpeaking();
    setOpen(false);
    bubble.current?.focus();
  }, [stopSpeaking]);

  /* Escape closes; opening puts the cursor where the person types */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    if (mode === "chat") requestAnimationFrame(() => input.current?.focus());
    return () => window.removeEventListener("keydown", onKey);
  }, [open, mode, close]);

  /* leaving the page stops any reading and listening */
  useEffect(() => () => { rec.current?.abort(); if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);

  const chooseMode = (m: Mode) => { setMode(m); setAloud(m === "voice"); if (m === "chat") rec.current?.abort(); };

  return (
    <div className={css.wrap}>
      {open && (
        <section className={css.panel} role="dialog" aria-modal="false" aria-labelledby="eye-chat-title">
          <header className={css.head}>
            <span className={css.headEye} aria-hidden="true"><Eye /></span>
            <h2 id="eye-chat-title" className={css.title}>{t.title}</h2>
            {msgs.length > 0 && <button type="button" className={css.link} onClick={() => { stopSpeaking(); setConvo((c) => ({ ...c, [topic]: [] })); }}>{t.clear}</button>}
            <button type="button" className={css.x} onClick={close} aria-label={t.close}>×</button>
          </header>

          <div className={css.choices}>
            <Seg label={t.mode.label} value={mode} onChange={(v) => chooseMode(v as Mode)} options={[["chat", t.mode.chat], ["voice", t.mode.voice]]} />
            <Seg label={t.topic.label} value={topic} onChange={(v) => { stopSpeaking(); setTopic(v as ChatTopic); }} options={[["eyes", t.topic.eyes], ["app", t.topic.app]]} />
          </div>

          <div className={css.list} ref={list} aria-live="polite">
            <p className={css.hello}>{t.hello[topic]}</p>
            {msgs.map((m) => <Message key={m.id} m={m} />)}
            {busy && <p className={css.thinking}><span className={css.dots} aria-hidden="true"><i /><i /><i /></span>{t.thinking}</p>}
          </div>

          <footer className={css.foot}>
            {mode === "chat" ? (
              <form className={css.form} onSubmit={(e) => { e.preventDefault(); void ask(draft, aloud); }}>
                <textarea
                  ref={input} className={css.input} rows={2} maxLength={QUESTION_MAX} value={draft} placeholder={t.placeholder[topic]} aria-label={t.placeholder[topic]}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void ask(draft, aloud); } }}
                />
                <button type="submit" className={css.send} disabled={busy || !draft.trim()} aria-label={t.send}><SendIcon /></button>
              </form>
            ) : (
              <div className={css.voice}>
                {canListen ? (
                  <button type="button" className={css.mic} data-on={listening || undefined} onClick={listen} disabled={busy} aria-pressed={listening}>
                    <MicIcon /><span>{listening ? t.listening : t.speak}</span>
                  </button>
                ) : <p className={css.small}>{t.noVoice}</p>}
                {heard && <p className={css.heard}>{t.heard(heard)}</p>}
                <p className={css.small}>{t.voiceNote}</p>
              </div>
            )}
            <div className={css.row}>
              <label className={css.check}><input type="checkbox" checked={aloud} onChange={(e) => { setAloud(e.target.checked); if (!e.target.checked) stopSpeaking(); }} />{t.readAloud}</label>
              {speaking && <button type="button" className={css.link} onClick={stopSpeaking}>{t.stopReading}</button>}
            </div>
            <p className={css.note}>{t.note}</p>
          </footer>
        </section>
      )}
      <button ref={bubble} type="button" className={css.bubble} onClick={() => (open ? close() : setOpen(true))} aria-expanded={open} aria-label={open ? t.close : t.open} title={t.open}>
        <Eye winking />
      </button>
    </div>
  );
}

function Message({ m }: { m: Msg }) {
  if (m.from === "you") return <div className={css.you}><span className={css.sr}>{t.you}: </span>{m.text}</div>;
  if (m.from === "note") return <p className={css.small}>{m.text}</p>;
  if (m.from === "urgent") {
    return (
      <div className={css.urgent} role="alert">
        <strong>{t.urgent.title}</strong>
        <p>{t.urgent.text}</p>
        {m.sign === "chemical" && <p>{t.urgent.chemical}</p>}
      </div>
    );
  }
  return (
    <div className={css.bot}>
      <span className={css.sr}>{t.helper}: </span>
      {m.text.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
      {m.seeDoctor && <p className={css.doctor}>{t.seeDoctor}</p>}
      {!!m.links?.length && (
        <p className={css.links}><span>{t.read}:</span>{m.links.map((l) => <a key={l.href} href={l.href}>{l.label}</a>)}</p>
      )}
    </div>
  );
}

function Seg({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className={css.seg} role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={v} type="button" role="radio" aria-checked={value === v} data-on={value === v || undefined} onClick={() => onChange(v)}>{text}</button>
      ))}
    </div>
  );
}

/** An eye drawn in code. With `winking` its lid closes for a moment on a slow loop. */
function Eye({ winking = false }: { winking?: boolean }) {
  return (
    <svg viewBox="0 0 48 48" width="100%" height="100%" aria-hidden="true" focusable="false" className={winking ? css.winking : undefined}>
      <defs>
        <linearGradient id="eye-iris" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8B31F0" /><stop offset="0.5" stopColor="#C4569C" /><stop offset="1" stopColor="#F4AA2D" />
        </linearGradient>
        <clipPath id="eye-shape"><path d="M4 24 C 12 12, 36 12, 44 24 C 36 36, 12 36, 4 24 Z" /></clipPath>
      </defs>
      <g className={css.open}>
        <path d="M4 24 C 12 12, 36 12, 44 24 C 36 36, 12 36, 4 24 Z" fill="#fff" />
        <g clipPath="url(#eye-shape)" className={css.look}>
          <circle cx="24" cy="24" r="8.5" fill="url(#eye-iris)" />
          <circle cx="24" cy="24" r="3.6" fill="#111418" />
          <circle cx="26.6" cy="21.4" r="1.6" fill="#fff" />
        </g>
      </g>
      <path className={css.shut} d="M5 25 C 13 31, 35 31, 43 25" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

const SendIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 12 L20 4 L14 20 L11.5 13 Z" fill="currentColor" /></svg>
);
const MicIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" fill="currentColor" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
);
