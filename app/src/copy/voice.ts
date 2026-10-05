/**
 * Words for the Listen button: the spoken version of the instructions on a page.
 * Plain words a school student can follow. The button is offered only where audio exists.
 */
const two = (n: number) => String(n).padStart(2, "0");
const whole = (seconds: number) => Math.max(0, Math.round(seconds));

export const voice = {
  listen: "Listen",
  pause: "Pause",
  goOn: "Go on",
  again: "Listen again",
  restart: "From the start",
  loading: "Loading",
  /** For a screen reader: what the button reads aloud. "Listen: Steps". */
  about: (what: string) => `Listen: ${what}`,
  /** How long the audio is, before it is played: "40 s", "1 min 5 s". */
  length: (seconds: number) => { const s = Math.max(1, whole(seconds)); return s < 60 ? `${s} s` : s % 60 === 0 ? `${s / 60} min` : `${Math.floor(s / 60)} min ${s % 60} s`; },
  /** A clock reading: "0:12". */
  clock: (seconds: number) => `${Math.floor(whole(seconds) / 60)}:${two(whole(seconds) % 60)}`,
  progress: (at: string, of: string) => `${at} of ${of}`,
  /** Shown beside the button when the audio is not in English: the language's own name. */
  inLanguage: (name: string) => `Spoken in ${name}`,
  busy: "Another sound is playing. Pause it first, then press Listen.",
  failed: "The audio could not be played. Check the connection and try again.",
  parts: {
    what: "What it is",
    setup: "Get ready",
    steps: "Steps",
    right: "You are doing it right when",
    stop: "When to stop",
    see: "What you should see",
    cues: "When you see this, do this",
    clip: "How this clip goes",
  },
};
