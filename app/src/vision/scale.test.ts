import { describe, expect, it } from "vitest";
import { cameraKey, cameraProblem } from "./camera";
import { distanceCm, readFace } from "./face";
import { isUsageLog } from "./landmarker";
import { madeUpFace } from "./made-up";
import { SET_PICTURES, setUpScale } from "./scale";

const reading = (o: Parameters<typeof madeUpFace>[0]) => { const f = madeUpFace(o); const r = readFace(f.points, f.width, f.height)!; return { iris: r.iris!, offCentre: r.offCentre }; };

describe("the one-step distance set-up", () => {
  it("finds the camera's scale from a still run of pictures at a measured distance", () => {
    const run = Array.from({ length: 20 }, (_, i) => reading({ distanceCm: 50 + (i % 3) * 0.2, scale: 0.85 }));
    const done = setUpScale(run, 50);
    expect(done.ok).toBe(true);
    if (!done.ok) return;
    expect(done.scale).toBeCloseTo(0.85, 1);
    const later = reading({ distanceCm: 41, scale: 0.85 });
    expect(distanceCm(later.iris, later.offCentre, done.scale)!).toBeGreaterThan(40);
    expect(distanceCm(later.iris, later.offCentre, done.scale)!).toBeLessThan(42);
  });
  it("asks for more pictures when there are too few", () => {
    expect(setUpScale(Array.from({ length: SET_PICTURES - 1 }, () => reading({ distanceCm: 50 })), 50)).toEqual({ ok: false, why: "too_few" });
  });
  it("refuses a run in which the member moved", () => {
    const run = Array.from({ length: 20 }, (_, i) => reading({ distanceCm: 40 + i * 1.5 }));
    expect(setUpScale(run, 50)).toEqual({ ok: false, why: "moving" });
  });
  it("refuses a distance that is not a desk distance, or that no web camera could have shown", () => {
    const run = Array.from({ length: 20 }, () => reading({ distanceCm: 50 }));
    expect(setUpScale(run, 10)).toEqual({ ok: false, why: "distance" });
    expect(setUpScale(run, 400)).toEqual({ ok: false, why: "distance" });
    /* a face really at 50 cm, typed in as 110 cm: the scale comes out longer than any web camera's */
    expect(setUpScale(run, 110)).toEqual({ ok: false, why: "distance" });
  });
});

describe("the camera", () => {
  it("names the problem when a camera request is refused", () => {
    const named = (name: string) => Object.assign(new Error("x"), { name });
    expect(cameraProblem(named("NotAllowedError"))).toBe("denied");
    expect(cameraProblem(named("NotFoundError"))).toBe("none");
    expect(cameraProblem(named("NotReadableError"))).toBe("busy");
    expect(cameraProblem(named("TypeError"))).toBe("failed");
    expect(cameraProblem("nope")).toBe("failed");
  });
  it("keeps a separate key for each camera and each picture shape", () => {
    expect(cameraKey({ deviceId: "a", width: 640, height: 480 })).toBe("a|1.33");
    expect(cameraKey({ deviceId: "a", width: 1280, height: 720 })).toBe("a|1.78");
    expect(cameraKey({ deviceId: "b", width: 640, height: 480 })).not.toBe(cameraKey({ deviceId: "a", width: 640, height: 480 }));
    expect(cameraKey({})).toBe("camera|0");
  });
});

describe("the face model's own usage log", () => {
  it("is recognised, so the page can refuse to send it", () => {
    expect(isUsageLog("https://odml.pa.googleapis.com/v1/log")).toBe(true);
    expect(isUsageLog("https://ODML.pa.googleapis.com/v1/log?x=1")).toBe(true);
    expect(isUsageLog("https://staging.odml.pa.googleapis.com/v2/anything")).toBe(true);
    expect(isUsageLog("https://play.googleapis.com/v1/log")).toBe(true);
  });
  it("lets every other request through: this site's own files and anything that is not that log", () => {
    expect(isUsageLog("/vision/face_landmarker.task")).toBe(false);
    expect(isUsageLog("/today/monitor")).toBe(false);
    expect(isUsageLog("https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp")).toBe(false);
    expect(isUsageLog("https://example.org/v1/log")).toBe(false);
    expect(isUsageLog("https://odml.pa.googleapis.com.evil.example/v1/log")).toBe(false);
    expect(isUsageLog("not a url at all ::")).toBe(false);
  });
});
