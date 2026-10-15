/**
 * Eyes Opener's own test reel: a 90-second drawn film kept with the app (see scripts/make-test-reel.mjs).
 * It lets a member, or staff, try the two-eye cinema with no video of their own.
 */
const MP4 = "/films/test-reel.mp4", WEBM = "/films/test-reel.webm";

/** The file this browser can play: H.264 where it is supported, VP9 otherwise. */
export function reelSrc(): string {
  const probe = typeof document === "undefined" ? null : document.createElement("video");
  return probe && probe.canPlayType('video/mp4; codecs="avc1.4D401E"') ? MP4 : WEBM;
}
