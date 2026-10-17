// Eyes Opener: tests of child mode's tiles: the chosen order, Stop always last, Play as a note when a child may not play.
import { describe, expect, it } from "vitest";
import { DEFAULT_DESIGN, KID_TILES, parseDesign } from "./design/config";
import { kidTiles } from "./kids";
import { childMove } from "./roles";

const go = { kind: "go", href: "/train/games/firefly-catch/play" } as const;

describe("child mode's tiles", () => {
  it("shows the chosen tiles in their order, and Stop last", () => {
    expect(kidTiles({ chosen: ["outside", "play", "break"], play: go, listen: true }).map((t) => t.key)).toEqual(["outside", "play", "break", "stop"]);
  });
  it("always shows Stop, even when staff hide every other tile", () => {
    expect(kidTiles({ chosen: [], play: go, listen: true })).toEqual([{ key: "stop", href: "/kids/stop", art: "hand", tone: "stop" }]);
  });
  it("hides Listen until audio exists, and never repeats a tile", () => {
    expect(kidTiles({ chosen: ["listen", "break", "break"], play: go, listen: false }).map((t) => t.key)).toEqual(["break", "stop"]);
    expect(kidTiles({ chosen: ["listen"], play: go, listen: true })[0]).toMatchObject({ key: "listen", href: "/kids/listen" });
  });
  it("sends Play to the next step, and makes it a note with no link when the child may not play", () => {
    expect(kidTiles({ chosen: ["play"], play: go, listen: false })[0]).toEqual({ key: "play", href: go.href, art: "glasses", tone: "go" });
    for (const kind of ["done", "held", "young"] as const) {
      const [p] = kidTiles({ chosen: ["play"], play: { kind }, listen: false });
      expect(p.href, kind).toBeUndefined();
      expect(p.note).toBe(kind);
    }
  });
  it("reads a design saved before the settings existed as the usual tiles, and refuses a list that breaks the rules", () => {
    const old = structuredClone(DEFAULT_DESIGN) as unknown as { content: Record<string, unknown> };
    delete old.content.childTiles; delete old.content.tvTiles;
    expect(parseDesign(old).content.childTiles).toEqual([...KID_TILES]);
    expect(parseDesign(old).content.tvTiles).toEqual(["games", "cinema", "checkups", "week"]);
    for (const tvTiles of [[], ["games", "games"], ["games", "cinema", "checkups", "week", "more"]]) {
      expect(parseDesign({ ...DEFAULT_DESIGN, content: { ...DEFAULT_DESIGN.content, tvTiles } }), String(tvTiles)).toBe(DEFAULT_DESIGN);
    }
    expect(parseDesign({ ...DEFAULT_DESIGN, content: { ...DEFAULT_DESIGN.content, childTiles: ["play", "play"] } })).toBe(DEFAULT_DESIGN);
    expect(parseDesign({ ...DEFAULT_DESIGN, content: { ...DEFAULT_DESIGN.content, childTiles: ["stop"] } })).toBe(DEFAULT_DESIGN);
  });
  it("sends a child from Today and from the grown-up screens to the tiles, and nowhere else", () => {
    for (const p of ["/today", "/settings", "/family/x", "/admin"]) expect(childMove(p), p).toBe("/kids");
    for (const p of ["/today/week", "/train", "/kids", "/kids/stop", "/login"]) expect(childMove(p), p).toBeNull();
  });
});
