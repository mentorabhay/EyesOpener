"use client";
import { useRef, type RefObject } from "react";
import { cinema as c } from "@/copy/cinema";
import { clock } from "./chapters";
import css from "./film.module.css";
import { MAX_FILMS, REEL_KEY, sizeText, watchedShare, type Film } from "./playlist";
import type { FilmList as List, FilmStatus } from "./use-list";

const l = c.list;

/** One line on how far a film is watched. Says nothing it does not know: a length not read yet is left out. */
function watchedText(f: Film) {
  if (f.duration > 0 && f.position >= f.duration - 1) return l.done;
  if (f.position < 1) return f.done ? l.done : l.notStarted;
  return f.duration > 0 ? l.watched(clock(f.position), clock(f.duration)) : l.watchedSoFar(clock(f.position));
}

const STATUS_WORDS: Partial<Record<FilmStatus, string>> = { ask: l.needsOk, gone: l.gone, file: l.needsFile, cannot: c.cannot.inList };

/**
 * The member's own films, lined up: length, how much of each is watched, which is on screen, and buttons to play,
 * reorder and remove. Every control is a button, so it works by touch, by keyboard and with a remote's arrows and OK.
 * `locked` is true while a film may not be changed (an eye break is running).
 */
export function FilmList({ list, input, playingKey, locked, onPlay, reelLabel, reelPrompt }: {
  list: List;
  /** The same ref that was given to `useFilmList`. */
  input: RefObject<HTMLInputElement | null>;
  playingKey: string | null; locked: boolean;
  /** Put this film on screen. */
  onPlay: (key: string) => void;
  /** The button that puts IOpener's own test reel in the list, and the few words before it. */
  reelLabel: string; reelPrompt: string;
}) {
  const { films, note } = list, shown = list.current?.key ?? null;
  const box = useRef<HTMLDivElement>(null);
  /* A press that moves or removes a row can take the pressed button away. Focus then goes to the row's next best button, or to "Add films". */
  const refocus = (key: string | null, want: string) => {
    requestAnimationFrame(() => {
      const root = box.current;
      if (!root || (document.activeElement && document.activeElement !== document.body && !(document.activeElement as HTMLButtonElement).disabled)) return;
      const row = key ? [...root.querySelectorAll<HTMLElement>("li[data-key]")].find((li) => li.dataset.key === key) : null;
      const target = row?.querySelector<HTMLElement>(`button[data-do="${want}"]:not([disabled])`) ?? row?.querySelector<HTMLElement>("button:not([disabled])") ?? root.querySelector<HTMLElement>("[data-film-add]");
      target?.focus();
    });
  };
  const hasReel = films.some((f) => f.key === REEL_KEY);
  const notes = note ? [
    note.again ? l.again(note.again) : note.added ? l.added(note.added) : "",
    note.notVideo ? l.notVideo(note.notVideo) : "",
    note.left ? l.full(MAX_FILMS, note.left) : "",
  ].filter(Boolean) : [];

  return (
    <div className={css.films} ref={box}>
      <p className="muted small">{l.sub}</p>
      <div className="row">
        <button type="button" className={films.length ? "btn" : "btn btn-g"} onClick={list.pick} data-film-add>{l.add}</button>
        {/* Browsers with no other picker use this plain one. It is pressed through the button above. */}
        <input ref={input} className={css.picker} type="file" accept="video/*" multiple tabIndex={-1} aria-label={l.hidden} onChange={(e) => { list.picked(e.target.files); e.target.value = ""; }} />
      </div>
      {notes.length > 0 && <p className="small" role="status">{notes.join(" ")}</p>}

      {films.length === 0
        ? <p className="muted small">{l.empty}</p>
        : (
          <ol className={css.list} aria-label={l.title}>
            {films.map((f, i) => {
              const status = list.statusOf(f.key), share = watchedShare(f), isShown = f.key === shown;
              const p = share === null ? null : Math.round(share * 100);
              return (
                <li key={f.key} className={css.item} data-current={isShown ? "" : undefined} data-key={f.key}>
                  <div className={css.head}>
                    <span className="muted small tnum">{l.place(i + 1, films.length)}</span>
                    <span className={css.name}>{f.name}</span>
                  </div>
                  <div className={css.meta}>
                    {isShown && <span className="chip" data-b="plain">{l.onScreen}</span>}
                    <span className="tnum">{f.duration > 0 ? clock(f.duration) : l.lengthUnknown}</span>
                    {f.size > 0 && <span className="tnum">{sizeText(f.size)}</span>}
                    <span className="tnum">{watchedText(f)}</span>
                    {status !== "ready" && <span className="chip" data-b={status === "cannot" || status === "gone" ? "warn" : "none"}>{STATUS_WORDS[status]}</span>}
                  </div>
                  {/* Hatched when the film's length has not been read, so nothing is drawn that is not known. */}
                  {p === null
                    ? <div className="prog hatched" role="img" aria-label={l.lengthUnknown} />
                    : <div className="prog" role="img" aria-label={watchedText(f)}><i style={{ width: `${p}%`, background: "var(--ink-3)" }} /></div>}
                  <div className={css.buttons}>
                    {/* While its film plays the button stays where it is, switched off but still holding the keys. */}
                    {status === "ready" && <button type="button" className="btn btn-sm" onClick={() => { if (playingKey !== f.key) onPlay(f.key); }} disabled={locked} aria-disabled={isShown && playingKey === f.key} aria-label={l.playName(f.name)}>{l.play}</button>}
                    {(status === "file" || status === "gone") && <button type="button" className="btn btn-sm" onClick={list.pick} aria-label={l.pickAgainName(f.name)}>{l.pickAgain}</button>}
                    <span style={{ flex: 1 }} />
                    <button type="button" className="btn btn-sm" data-do="up" onClick={() => { list.move(f.key, -1); refocus(f.key, "up"); }} disabled={i === 0} aria-label={l.upName(f.name)}>{l.up}</button>
                    <button type="button" className="btn btn-sm" data-do="down" onClick={() => { list.move(f.key, 1); refocus(f.key, "down"); }} disabled={i === films.length - 1} aria-label={l.downName(f.name)}>{l.down}</button>
                    <button type="button" className="btn btn-sm" data-do="remove" onClick={() => { list.remove(f.key); refocus(films[i + 1]?.key ?? films[i - 1]?.key ?? null, "remove"); }} disabled={locked && isShown} aria-label={l.removeName(f.name)}>{l.remove}</button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}

      {list.waiting > 0 && (
        <div className="notice stack">
          <span>{l.askNote}</span>
          <div className="row"><button type="button" className="btn btn-sm" onClick={() => void list.allow()}>{l.ask}</button></div>
        </div>
      )}
      {!hasReel && <div className="row"><span className="muted small">{reelPrompt}</span><button type="button" className="btn btn-sm" onClick={list.showReel} disabled={locked}>{reelLabel}</button></div>}
      {films.some((f) => f.key !== REEL_KEY) && <p className="muted small">{list.allKept ? l.kept : l.notKept}</p>}
      {films.length > 0 && <p className="muted small">{l.removeNote}</p>}
    </div>
  );
}
