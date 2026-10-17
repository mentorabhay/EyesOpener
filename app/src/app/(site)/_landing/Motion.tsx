// Eyes Opener: The only client code on the landing page. The sections arrive from the server in their final state; this turns.
"use client";

/**
 * The only client code on the landing page. The sections arrive from the server in their final state; this turns
 * them into scroll scenes.
 *
 *   full   wide and tall enough, motion allowed: each scene is pinned and scrubbed by the scroll.
 *   lite   a phone or a short window, motion allowed: nothing is pinned; parts ease in as they arrive.
 *   still  reduced motion, or no script: nothing runs and the page stays in its final state.
 *
 * Everything is built inside one gsap.matchMedia, scoped to this page, and reverted when the page unmounts or
 * the window changes class. The hero's entrance is plain CSS, so it plays before this code has loaded.
 */
import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;
let registered = false;

const MOVING = "(prefers-reduced-motion: no-preference)";
const FULL = `(min-width: 961px) and (min-height: 640px) and ${MOVING}`;
const LITE = `(max-width: 960px) and ${MOVING}, (max-height: 639px) and ${MOVING}`;

type El = HTMLElement;
type Find = <T extends Element = El>(selector: string) => T[];

/** A pinned, scrubbed scene: the reference's `pin: true, scrub: .8`. `length` is how far the page scrolls while it holds. */
const pinned = (trigger: Element, length: number): ScrollTrigger.Vars => ({
  trigger, start: "top top", end: `+=${length}%`, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
});

/** Where an element sits inside an ancestor, read from the layout so that transforms in flight do not disturb it. */
function boxIn(el: El, ancestor: El) {
  let x = 0, y = 0;
  for (let n: El | null = el; n && n !== ancestor; n = n.offsetParent as El | null) { x += n.offsetLeft; y += n.offsetTop; }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

/* ── hero: as the page scrolls on, the doubled first line fuses and the chips drift apart ── */
function hero(find: Find) {
  const el = find('[data-scene="hero"]')[0];
  if (!el) return;
  gsap.to(el.querySelectorAll("[data-split]"), { "--split": "0em", ease: "none", scrollTrigger: { trigger: el, start: 0, end: () => el.offsetHeight * 0.6, scrub: 0.8 } });
  el.querySelectorAll("[data-chip]").forEach((chip, i) => {
    gsap.to(chip, { y: i % 2 ? -48 : -92, ease: "none", scrollTrigger: { trigger: el, start: 0, end: "bottom top", scrub: 0.9 } });
  });
}

/* ── reveal: each eye's picture, sliding together into one ── */
function reveal(find: Find, pin: boolean) {
  const el = find('[data-scene="reveal"]')[0];
  const stage = el?.querySelector<El>("[data-stage]");
  if (!el || !stage) return;
  const one = (s: string) => el.querySelector<El>(s);
  const fuse = stage.querySelector<El>(".lp-fuse");
  const tagStrong = one('[data-tag="strong"]'), tagWeak = one('[data-tag="weak"]');
  if (!fuse || !tagStrong || !tagWeak) return;
  const small = 0.62;
  const apart = () => stage.offsetWidth * 0.235;
  /** How far a label must rise to sit just under its small picture. */
  const lift = (tag: El) => {
    const picture = Math.min(fuse.offsetHeight, fuse.offsetWidth * (360 / 640)) * small;
    return Math.min(0, fuse.offsetTop + fuse.offsetHeight / 2 + picture / 2 + 12 - tag.offsetTop);
  };
  const tl = gsap.timeline({
    scrollTrigger: pin ? pinned(el, 150) : { trigger: stage, start: "top 80%", end: "center 45%", scrub: 0.8, invalidateOnRefresh: true },
  });
  tl.fromTo(one('[data-layer="strong"]'), { x: () => -apart(), scale: small }, { x: 0, scale: 1, duration: 0.42, ease: "power2.inOut" }, 0.2)
    .fromTo(one('[data-layer="weak"]'), { x: () => apart(), scale: small }, { x: 0, scale: 1, duration: 0.42, ease: "power2.inOut" }, 0.2)
    .fromTo(tagStrong, { x: () => -apart(), y: () => lift(tagStrong), opacity: 1 }, { x: 0, y: 0, opacity: 0, duration: 0.36, ease: "power2.in" }, 0.2)
    .fromTo(tagWeak, { x: () => apart(), y: () => lift(tagWeak), opacity: 1 }, { x: 0, y: 0, opacity: 0, duration: 0.36, ease: "power2.in" }, 0.2)
    .fromTo(one("[data-glasses]"), { opacity: 1, y: 0 }, { opacity: 0, y: -14, duration: 0.2 }, 0.24)
    .fromTo(one('[data-tag="both"]'), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.1 }, 0.6)
    .fromTo(fuse, { scale: 1 }, { scale: 1.035, duration: 0.07, yoyo: true, repeat: 1, ease: "sine.inOut" }, 0.6);
  if (pin) {
    tl.fromTo(one('[data-legend="strong"]'), { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: 0.16 }, 0.02)
      .fromTo(one('[data-legend="weak"]'), { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.16 }, 0.06)
      .fromTo(one('[data-legend="both"]'), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.14 }, 0.64)
      .fromTo(one("[data-caption]"), { opacity: 0 }, { opacity: 1, duration: 0.1 }, 0.76)
      .to({}, { duration: 0.12 }, 0.88);
  }
}

/* ── spaces: each screen opens large, then shrinks and flies into its own space ── */
function spaces(find: Find) {
  const el = find('[data-scene="spaces"]')[0];
  const deck = el?.querySelector<El>("[data-deck]");
  if (!el || !deck) return;
  const shots = Array.from(el.querySelectorAll<El>("[data-shot]"));
  const texts = Array.from(el.querySelectorAll<El>("[data-space-text]"));
  /** The large, centred pose of a screen, as an offset and a scale from where it finally rests. */
  const large = (shot: El) => {
    const b = boxIn(shot, deck);
    const scale = Math.max(1, Math.min((deck.offsetWidth * 0.68) / b.w, 1080 / b.w, deck.offsetHeight / b.h));
    return { x: deck.offsetWidth / 2 - (b.x + b.w / 2), y: deck.offsetHeight / 2 - (b.y + b.h / 2), scale };
  };
  const tl = gsap.timeline({ scrollTrigger: pinned(el, 200) });
  shots.forEach((shot, i) => {
    const at = i;
    const tilt = i % 2 ? 4 : -4;
    if (i === 0) {
      tl.fromTo(shot, { x: () => large(shot).x, y: () => large(shot).y + 26, scale: () => large(shot).scale * 1.07, opacity: 1 },
        { y: () => large(shot).y, scale: () => large(shot).scale, duration: 0.3, ease: "power2.out" }, 0);
    } else {
      tl.fromTo(shot, { x: () => large(shot).x, y: () => large(shot).y + 80, scale: () => large(shot).scale * 0.93, opacity: 0 },
        { y: () => large(shot).y, scale: () => large(shot).scale, duration: 0.3, ease: "power2.out" }, at - 0.14)
        .to(shot, { opacity: 1, duration: 0.12, ease: "none" }, at - 0.14);
    }
    tl.to(shot, { x: 0, y: 0, scale: 1, duration: 0.46, ease: "power2.inOut" }, at + 0.4)
      .to(shot, { rotation: tilt, duration: 0.2, ease: "sine.out" }, at + 0.4)
      .to(shot, { rotation: 0, duration: 0.26, ease: "sine.inOut" }, at + 0.6)
      .fromTo(texts[i], { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.2 }, at + 0.74);
  });
  tl.fromTo(el.querySelector("[data-spaces-foot]"), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.25 }, shots.length - 0.05)
    .to({}, { duration: 0.35 });
}

/* ── flow tree: the lines grow from stage to stage, a spark travels, the programmes cascade ── */
function flow(find: Find) {
  const el = find('[data-scene="flow"]')[0];
  if (!el) return;
  const t = (name: string) => el.querySelectorAll(`[data-t="${name}"]`);
  const steps = el.querySelectorAll("[data-step]");
  const grow = { ease: "none" };
  const dim = () => ({ opacity: 0.32 }), lit = () => ({ opacity: 1, duration: 0.08 });
  gsap.timeline({ scrollTrigger: pinned(el, 145) })
    .fromTo(steps[0], dim(), lit(), 0.02)
    .fromTo(t("check"), { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.1 }, 0.02)
    .fromTo(t("trunk"), { scaleY: 0 }, { scaleY: 1, duration: 0.1, ...grow }, 0.14)
    .fromTo(t("spark"), { opacity: 0 }, { opacity: 1, duration: 0.01 }, 0.135)
    .fromTo(t("spark"), { y: 0 }, { y: 36, duration: 0.1, ...grow, immediateRender: false }, 0.14)
    .to(t("spark"), { opacity: 0, scale: 2.4, duration: 0.03 }, 0.24)
    .fromTo(steps[1], dim(), lit(), 0.24)
    .fromTo(t("profile"), { opacity: 0, y: 18, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.12, ease: "back.out(1.7)" }, 0.24)
    .fromTo(t("stem"), { scaleY: 0 }, { scaleY: 1, duration: 0.04, ...grow }, 0.4)
    .fromTo(t("rail-a"), { scaleX: 0 }, { scaleX: 1, duration: 0.08, ...grow }, 0.44)
    .fromTo(t("drop-a"), { scaleY: 0 }, { scaleY: 1, duration: 0.05, ...grow }, 0.5)
    .fromTo(steps[2], dim(), lit(), 0.5)
    .fromTo(t("open-h"), { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.53)
    .fromTo(t("open"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.1, stagger: 0.035 }, 0.55)
    .fromTo(t("rail-b"), { scaleX: 0 }, { scaleX: 1, duration: 0.07, ...grow }, 0.66)
    .fromTo(t("drop-b"), { scaleY: 0 }, { scaleY: 1, duration: 0.05, ...grow }, 0.73)
    .fromTo(t("gated-h"), { opacity: 0 }, { opacity: 1, duration: 0.05 }, 0.76)
    .fromTo(t("gate"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.08 }, 0.78)
    .fromTo(t("gated"), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.09, stagger: 0.035 }, 0.82)
    .fromTo(t("note"), { opacity: 0 }, { opacity: 1, duration: 0.06 }, 0.95)
    .to({}, { duration: 0.1 });
}

/* ── chapter: evidence. Three games are dealt, then the label rows arrive and their bars grow ── */
function evidence(find: Find) {
  const el = find('[data-scene="evidence"]')[0];
  if (!el) return;
  gsap.timeline({ scrollTrigger: pinned(el, 125) })
    .fromTo(el.querySelectorAll("[data-card]"), { opacity: 0, y: 46 }, { opacity: 1, y: 0, duration: 0.14, stagger: 0.06, ease: "power3.out" }, 0.02)
    .fromTo(el.querySelector("[data-ev-note]"), { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.2)
    .fromTo(el.querySelectorAll("[data-row]"), { opacity: 0, x: 34 }, { opacity: 1, x: 0, duration: 0.12, stagger: 0.085 }, 0.24)
    .fromTo(el.querySelectorAll("[data-bar]"), { scaleX: 0 }, { scaleX: 1, duration: 0.18, stagger: 0.085, ease: "power2.out" }, 0.29)
    .to({}, { duration: 0.1 }, 0.92);
}

/* ── chapter: safety. The spine grows, each rule ticks, and only then does the session open ── */
function safety(find: Find) {
  const el = find('[data-scene="safety"]')[0];
  if (!el) return;
  const tl = gsap.timeline({ scrollTrigger: pinned(el, 135) });
  tl.fromTo(el.querySelector("[data-gates]"), { "--grow": 0 }, { "--grow": 1, duration: 0.5, ease: "none" }, 0.06);
  el.querySelectorAll("[data-gate]").forEach((gate, i) => tl.fromTo(gate, { "--on": 0 }, { "--on": 1, duration: 0.09, ease: "power1.out" }, 0.08 + i * 0.14));
  tl.fromTo(el.querySelector("[data-session]"), { "--on": 0 }, { "--on": 1, duration: 0.14, ease: "power1.inOut" }, 0.64)
    .fromTo(el.querySelector("[data-doctor]"), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.12 }, 0.82)
    .to({}, { duration: 0.06 }, 0.94);
}

/* ── chapter: family. The account sits in the middle; a line reaches out to each seat ── */
function family(find: Find) {
  const el = find('[data-scene="family"]')[0];
  if (!el) return;
  const tl = gsap.timeline({ scrollTrigger: pinned(el, 115) });
  tl.fromTo(el.querySelector("[data-core]"), { opacity: 0, scale: 0.88 }, { opacity: 1, scale: 1, duration: 0.12 }, 0.02);
  const seats = el.querySelectorAll("[data-seat]");
  el.querySelectorAll<SVGLineElement>("[data-link]").forEach((link, i) => {
    const at = 0.16 + i * 0.17;
    tl.fromTo(link, { attr: { x2: 50, y2: 50 } }, { attr: { x2: Number(link.dataset.x), y2: Number(link.dataset.y) }, duration: 0.12, ease: "none" }, at)
      .fromTo(seats[i], { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.11, ease: "back.out(1.6)" }, at + 0.07);
  });
  tl.to({}, { duration: 0.1 }, 0.9);
}

/* ── chapter: screens. The one that exists rises first and says so; the two being built follow, hatched ── */
function screens(find: Find) {
  const el = find('[data-scene="screens"]')[0];
  if (!el) return;
  const tl = gsap.timeline({ scrollTrigger: pinned(el, 110) });
  el.querySelectorAll("[data-device]").forEach((device, i) => {
    const at = 0.02 + i * 0.28;
    tl.fromTo(device, { opacity: 0, y: 56 }, { opacity: 1, y: 0, duration: 0.16, ease: "power3.out" }, at)
      .fromTo(device.querySelector("[data-state]"), { scale: 0 }, { scale: 1, duration: 0.08, ease: "back.out(2.2)" }, at + 0.15);
  });
  tl.fromTo(el.querySelector("[data-hatch-note]"), { opacity: 0 }, { opacity: 1, duration: 0.08 }, 0.82).to({}, { duration: 0.1 }, 0.9);
}

/* ── the scenes on a phone: no pinning. Parts ease in as they arrive; bars and lines grow once ── */
function lite(find: Find) {
  const arrive = (el: Element, vars: gsap.TweenVars, from: gsap.TweenVars) =>
    gsap.fromTo(el, from, { ...vars, duration: 0.7, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  find("[data-legend], [data-space], [data-step], [data-card], [data-row], [data-gate], [data-session], [data-doctor], [data-core], [data-seat], [data-device]")
    .forEach((el) => arrive(el, { opacity: 1, y: 0 }, { opacity: 0, y: 26 }));
  find('[data-t="check"], [data-t="profile"], [data-t="open"], [data-t="gate"], [data-t="gated"]')
    .forEach((el) => arrive(el, { opacity: 1, y: 0 }, { opacity: 0, y: 22 }));
  find("[data-bar]").forEach((el) => arrive(el, { scaleX: 1 }, { scaleX: 0 }));
  find('[data-t="trunk"], [data-t="stem"]').forEach((el) => arrive(el, { scaleY: 1 }, { scaleY: 0 }));
}

/* ── the two closing sections, in every moving mode ── */
function closing(find: Find) {
  find('[data-scene="not"] [data-enter]').forEach((el, i) => {
    gsap.fromTo(el, { opacity: 0, y: 30, "--slash": 0 }, { opacity: 1, y: 0, "--slash": 1, duration: 0.9, delay: (i % 4) * 0.05, ease: "expo.out", scrollTrigger: { trigger: el, start: "top 88%", once: true } });
  });
  const close = find('[data-scene="close"]')[0];
  if (!close) return;
  gsap.timeline({ scrollTrigger: { trigger: close, start: "top 62%", once: true } })
    .fromTo(close.querySelectorAll("[data-close-line]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1.5, ease: "power2.inOut" }, 0)
    .fromTo(close.querySelector("[data-close-join]"), { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4, ease: "power1.in" }, 1.4)
    .fromTo(close.querySelector("[data-close-dot]"), { scale: 0, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.45, ease: "back.out(2.4)" }, 1.75)
    .fromTo(close.querySelectorAll("[data-enter]"), { opacity: 0, y: 28 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: "expo.out" }, 0.5);
}

export function Motion({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useIsoLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    /* Staff can set the site's motion to calm or off (src/lib/design): the page then stays in its final state, as with reduced motion. */
    const level = document.documentElement.dataset.motion;
    if (level === "calm" || level === "off") return;
    if (!registered) { gsap.registerPlugin(ScrollTrigger); registered = true; }

    const mm = gsap.matchMedia(root);
    mm.add({ full: FULL, lite: LITE }, (ctx) => {
      const { full } = ctx.conditions as { full: boolean; lite: boolean };
      const find: Find = <T extends Element = El>(selector: string) => Array.from(root.querySelectorAll<T>(selector));
      root.classList.toggle("lp-pinning", full);
      hero(find);
      if (full) {
        reveal(find, true);
        spaces(find);
        flow(find);
        evidence(find);
        safety(find);
        family(find);
        screens(find);
      } else {
        reveal(find, false);
        lite(find);
      }
      closing(find);
      return () => root.classList.remove("lp-pinning");
    });

    // The web font changes the height of the type: measure again once it has loaded.
    let alive = true;
    document.fonts?.ready.then(() => { if (alive) ScrollTrigger.refresh(); });

    // "See how it works": glide to the next scene. With no script the link is a plain jump.
    const glide = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[data-scrollto]");
      const target = link ? document.querySelector(link.getAttribute("href") ?? "") : null;
      if (!target) return;
      event.preventDefault();
      const pinning = root.classList.contains("lp-pinning");
      const top = target.getBoundingClientRect().top + window.scrollY - (pinning ? 0 : 72);
      const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: top + (pinning ? window.innerHeight * 0.12 : 0), behavior: calm ? "auto" : "smooth" });
    };
    root.addEventListener("click", glide);

    return () => { alive = false; root.removeEventListener("click", glide); mm.revert(); };
  }, []);

  return <main ref={ref} className="lp">{children}</main>;
}
