/**
 * Words of the floating corner (src/components/assistant): the back-to-top button, and the eye-care chat with its
 * winking-eye button, its panel, the two ways to talk (typing or speaking) and the two kinds of question (eyes in
 * general, or Eyes Opener itself).
 */
import { texts } from "@/i18n/texts";

export const assistant = texts("copy/assistant", "assistant", () => ({
  toTop: "Back to the top",
  open: "Ask a question about eyes",
  close: "Close the eye helper",
  title: "Eye helper",
  clear: "Start again",

  mode: { label: "How to talk", chat: "Type", voice: "Speak" },
  topic: { label: "Ask about", eyes: "Eye problems", app: "This app" },

  hello: {
    eyes: "Ask me about eyes: lazy eye, squint, screen strain, glasses, eye tests. I explain in plain words and say when to see an eye doctor.",
    app: "Ask me about Eyes Opener: the games, the exercises, the check-ups, the glasses, setting up a screen, or where to find something.",
  },
  placeholder: { eyes: "For example: What is a lazy eye?", app: "For example: How do I set up the glasses?" },
  send: "Send",
  thinking: "Thinking…",
  you: "You",
  helper: "Eye helper",

  speak: "Tap and speak",
  listening: "Listening… tap again when you are done",
  heard: (text: string) => `You said: ${text}`,
  readAloud: "Read answers aloud",
  stopReading: "Stop reading",
  noVoice: "This browser cannot listen to speech. Type your question instead, or try Chrome or Edge.",
  micBlocked: "The microphone is blocked for this site. Allow it in the browser's site settings, or type instead.",
  voiceNote: "Your browser turns your speech into text. In Chrome this is done by Google's speech service.",

  note: "General information only, not a diagnosis. For any worry about your eyes, see an eye doctor.",
  seeDoctor: "See an eye doctor about this.",
  read: "Read more",

  urgent: {
    title: "This may be an emergency",
    text: "Go to an eye hospital or an emergency department now. In India you can call 112. Do not wait for an appointment and do not wait for this chat.",
    chemical: "If a chemical went in the eye, rinse it with clean running water for at least 15 minutes on the way.",
  },

  closed: {
    off: "The eye helper is not switched on yet.",
    saver: "The eye helper is resting for now to save costs. Please try again later.",
    cap: "The eye helper has answered all it can this month. Please try again next month.",
    limit: "That is all the questions for today. Please come back tomorrow.",
    failed: "Something went wrong. Please ask again.",
    check: "I could not give a safe answer to that. Please ask in another way, or ask an eye doctor.",
    none: "The eye helper is not part of this edition.",
  } as Record<string, string>,
  tooLong: (max: number) => `Please keep a question under ${max} letters.`,
}));
