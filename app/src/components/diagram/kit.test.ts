// Eyes Opener: The diagram kit draws every shape from data, gives every step with a sentence a tap, and names each diagram.
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BranchMap, Flow, Gates, Ladder, Lanes, Loop, Tiles, Timeline, Tree, type Node } from "./kit";
import { LINE_ART, LineArt } from "../lineart/lineart";

const n = (key: string, say = true): Node => ({ key, label: `Step ${key}`, say: say ? `What ${key} means.` : undefined });
const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const count = (s: string, what: string) => s.split(what).length - 1;

describe("the diagram kit", () => {
  it("draws every shape as a named group with one mark for the draw-in", () => {
    const shapes = [
      h(Flow, { label: "A flow", nodes: [n("a"), n("b"), n("c")] }),
      h(Loop, { label: "A loop", nodes: [n("a"), n("b")], back: "Back to a" }),
      h(Gates, { label: "Checks", gates: [{ key: "g", ask: n("ask", false), fail: n("no", false) }], pass: n("go", false), failWord: "If not" }),
      h(Tree, { label: "A tree", question: n("q"), branches: [{ key: "y", answer: "Yes", to: n("y") }, { key: "x", answer: "No", to: n("x") }] }),
      h(Ladder, { label: "Grades", rungs: [{ key: "s", grade: n("s"), count: 4, countLabel: "4" }, { key: "w", grade: n("w"), count: 0, countLabel: "0" }] }),
      h(Lanes, { label: "Who does what", lanes: [{ key: "p", who: n("p"), does: [n("d1"), n("d2")] }] }),
      h(BranchMap, { label: "One to many", source: n("s"), outcomes: [n("o1"), n("o2")] }),
      h(Timeline, { label: "Weeks", marks: [{ key: "w1", at: "Week 1", what: n("w1") }] }),
      h(Tiles, { label: "Rules", nodes: [n("r1"), n("r2")] }),
    ];
    for (const el of shapes) {
      const s = html(el);
      expect(s).toMatch(/^<figure[^>]*role="group"[^>]*aria-label="[^"]+"[^>]*data-diagram="[a-z]+"/);
    }
  });

  it("makes a step with a sentence a native details, and one without a plain box", () => {
    const s = html(h(Flow, { label: "A flow", nodes: [n("a"), n("b", false)] }));
    expect(count(s, "<details")).toBe(1);
    expect(count(s, "<summary")).toBe(1);
    expect(s).toContain("What a means.");
    expect(s).not.toContain("What b means.");
  });

  it("marks the last step so no arrow leaves it, and turns a long flow into a column", () => {
    const short = html(h(Flow, { label: "f", nodes: [n("a"), n("b")] }));
    expect(count(short, "data-last")).toBe(1);
    const long = html(h(Flow, { label: "f", nodes: ["a", "b", "c", "d", "e", "f"].map((k) => n(k)) }));
    expect(long).toMatch(/class="[^"]*tall/);
  });

  it("ends a gate chain at the way through, after every check and its way out", () => {
    const s = html(h(Gates, { label: "c", failWord: "If not", gates: ["a", "b"].map((k) => ({ key: k, ask: n(`${k}?`, false), fail: n(`${k}!`, false) })), pass: n("go", false) }));
    expect(count(s, "If not")).toBe(2);
    expect(s.lastIndexOf("Step go")).toBeGreaterThan(s.lastIndexOf("Step b!"));
    expect(s).toContain("data-pass");
  });

  it("draws a ladder's bars against its largest count, never past the end", () => {
    const s = html(h(Ladder, { label: "l", rungs: [{ key: "a", grade: n("a"), count: 10, countLabel: "10" }, { key: "b", grade: n("b"), count: 5, countLabel: "5" }] }));
    expect(s).toContain("width:100%");
    expect(s).toContain("width:50%");
  });

  it("has every line drawing, each hidden from screen readers unless it is named", () => {
    for (const name of LINE_ART) {
      const s = html(h(LineArt, { name }));
      expect(s).toContain(`data-lineart="${name}"`);
      expect(s).toContain('aria-hidden="true"');
      expect(s).toContain('pathLength="1"');
    }
    expect(html(h(LineArt, { name: "eye", label: "An eye" }))).toContain('role="img"');
  });
});
