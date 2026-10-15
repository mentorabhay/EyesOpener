/**
 * Puts the files the on-device camera features need into public/vision/, so the browser loads them from this
 * site and not from another one:
 *   - the MediaPipe runtime (WebAssembly), copied from the installed npm package;
 *   - the face landmark model, fetched once from Google's public model store.
 * Runs before `npm run dev` and `npm run build`. The files are not kept in git.
 * It never fails a build: when the model cannot be fetched, the camera features say they are not available.
 */
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const out = path.join(root, "public", "vision");
const wasmFrom = path.join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const WASM = ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"];
const MODEL = {
  name: "face_landmarker.task",
  url: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
  /** The model is a few megabytes. Anything much smaller is an error page, not the model. */
  minBytes: 1_000_000,
  /** The file this app was built and tested with. A file with another fingerprint is not used. */
  sha256: "64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff",
};

const size = async (file) => { try { return (await stat(file)).size; } catch { return 0; } };

await mkdir(path.join(out, "wasm"), { recursive: true });
let copied = 0;
for (const name of WASM) {
  const from = path.join(wasmFrom, name), to = path.join(out, "wasm", name);
  if (!(await size(from))) { console.warn(`vision-files: ${name} is missing from the npm package`); continue; }
  if ((await size(to)) !== (await size(from))) { await copyFile(from, to); copied++; }
}

const model = path.join(out, MODEL.name);
let note = "model already here";
if ((await size(model)) < MODEL.minBytes) {
  try {
    const res = await fetch(MODEL.url, { signal: AbortSignal.timeout(60_000) });
    const bytes = Buffer.from(await res.arrayBuffer());
    if (!res.ok || bytes.length < MODEL.minBytes) throw new Error(`answer ${res.status}, ${bytes.length} bytes`);
    if (createHash("sha256").update(bytes).digest("hex") !== MODEL.sha256) throw new Error("the file's fingerprint is not the expected one");
    await writeFile(model, bytes);
    note = "model fetched";
  } catch (e) {
    note = `model NOT fetched (${e instanceof Error ? e.message : e}); camera features will say they are not available`;
  }
}
const sum = (await size(model)) >= MODEL.minBytes ? createHash("sha256").update(await readFile(model)).digest("hex") : "none";
if (sum !== "none" && sum !== MODEL.sha256) {
  await rm(model, { force: true });
  note = "the model here had an unexpected fingerprint and was removed; camera features will say they are not available";
}
console.log(`vision-files: ${copied} runtime file(s) copied, ${note}`);
