// Eyes Opener: The mark of a piece of English text: a short code that changes whenever the text changes.
/**
 * The mark of a piece of English text: a short code that changes whenever the text changes.
 *
 * Every translation carries the mark of the English it was made from. When the English is edited, the mark no
 * longer matches and the translation is not used, so an old wording is never shown under a new meaning.
 * The same function runs on the server, in the browser and in the pipeline, so all three agree.
 * (cyrb53: 53 bits, plenty to tell two versions of one sentence apart. Not a secret and not a signature.)
 */
export function mark(text: string): string {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(16).padStart(8, "0").slice(2) + (h1 >>> 0).toString(16).padStart(8, "0");
}
