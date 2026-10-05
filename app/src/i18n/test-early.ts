/** Only for runtime.test.ts: a module that reads a word while it loads, which is the mistake the watch is for. */
import { say } from "./runtime";

export const early = say("test/demo", "demo.title", "Today");
