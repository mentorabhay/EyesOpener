/** Words for results: what a session measured, and the member's own record of past sessions. */
import type { Labels } from "@/components/play/results";

export const results = {
  title: "Your results",
  none: "No finished session yet. Your results appear here after the first one.",
  thisTime: "This session",
  best: "Best so far",
  when: "When",
  time: "Time",
  score: "Score",
  today: "Today",
  yesterday: "Yesterday",
  ended: { stop_rule: "Stopped: felt unwell", daily_cap: "Daily limit reached" } as Record<string, string>,
  minutes: (minutes: number) => { const s = Math.round(minutes * 60); return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`; },
  /** What the game kit measures in every game, and what the vergence games add. */
  game: {
    hits: { label: "Right", unit: "" },
    misses: { label: "Missed", unit: "" },
    top: { label: "Highest level", unit: "of 10" },
    conv: { label: "Furthest turned in", unit: "prism dioptres" },
    div: { label: "Furthest turned out", unit: "prism dioptres" },
    splits: { label: "Times it split in two", unit: "" },
  } satisfies Labels,
  /** Keys where a smaller number is the better one. */
  lowerIsBetter: ["misses", "splits"],
  film: { title: "Your cinema time", week: "Watched in the last 7 days", sessions: "Sittings" },
};
