// Eyes Opener: Keeping access to the member's chosen film files between visits, where the browser can do that.
/**
 * Keeping access to the member's chosen film files between visits, where the browser can do that.
 *
 * A browser with the File System Access API hands out a "handle" for a picked file. A handle can be kept in the
 * browser's own database (IndexedDB) and asked for the file again on a later visit. Nothing is copied and nothing
 * leaves the device: the handle only points at the file where it already is.
 * Browsers without that API (Safari, Firefox, most TV and phone browsers) can only give the file for this visit;
 * the list then remembers titles and places, and the member picks the files again.
 */
import { handleKey } from "./playlist";

/* The parts of the File System Access API this file uses. They are not in TypeScript's own DOM types yet. */
type Access = "granted" | "denied" | "prompt";
export interface FilmHandle {
  readonly kind: "file";
  readonly name: string;
  getFile(): Promise<File>;
  queryPermission?(what: { mode: "read" }): Promise<Access>;
  requestPermission?(what: { mode: "read" }): Promise<Access>;
}
type Picker = (options: { multiple: boolean; excludeAcceptAllOption?: boolean; types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<FilmHandle[]>;

const DB = "iopener-cinema", STORE = "handles";
const VIDEO_ENDINGS = [".mp4", ".m4v", ".webm", ".mov", ".mkv", ".ogv", ".avi"];

const picker = (): Picker | null => {
  const w = typeof window === "undefined" ? null : (window as unknown as { showOpenFilePicker?: Picker });
  return w && typeof w.showOpenFilePicker === "function" && typeof indexedDB !== "undefined" ? w.showOpenFilePicker.bind(window) : null;
};

/** True when this browser can keep access to a picked file for the next visit. */
export const canKeepFiles = () => picker() !== null;

/**
 * Opens the browser's own file picker for several films. Each film comes with its handle.
 * Resolves to an empty list when the member closes the picker, and to null when this browser has no such picker.
 */
export async function pickFilms(description: string): Promise<{ file: File; handle: FilmHandle }[] | null> {
  const open = picker();
  if (!open) return null;
  let handles: FilmHandle[];
  try {
    handles = await open({ multiple: true, types: [{ description, accept: { "video/*": VIDEO_ENDINGS } }] });
  } catch (e) {
    /* Closing the picker is not a fault. Anything else means the picker cannot be used here: fall back to the plain one. */
    return (e as { name?: string })?.name === "AbortError" ? [] : null;
  }
  const out: { file: File; handle: FilmHandle }[] = [];
  for (const handle of handles) {
    try { out.push({ file: await handle.getFile(), handle }); } catch { /* a file that vanished between the pick and the read */ }
  }
  return out;
}

function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open(DB, 1);
    open.onupgradeneeded = () => { if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE); };
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
}

async function withStore<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | null): Promise<T | null> {
  const db = await database();
  try {
    return await new Promise<T | null>((resolve, reject) => {
      const tx = db.transaction(STORE, mode), request = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request ? request.result : null);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

/** Keeps a film's handle for this profile. A browser that refuses is not a fault: the film still plays this visit. */
export const keepHandle = (profileId: string, filmKey: string, handle: FilmHandle) =>
  withStore("readwrite", (s) => s.put(handle, handleKey(profileId, filmKey))).then(() => true, () => false);

export const dropHandle = (profileId: string, filmKey: string) =>
  withStore("readwrite", (s) => s.delete(handleKey(profileId, filmKey))).then(() => undefined, () => undefined);

/** The handles kept for this profile, by film key. Empty when the browser keeps none. */
export async function keptHandles(profileId: string, filmKeys: readonly string[]): Promise<Map<string, FilmHandle>> {
  const found = new Map<string, FilmHandle>();
  if (!canKeepFiles()) return found;
  for (const key of filmKeys) {
    const handle = await withStore<FilmHandle | undefined>("readonly", (s) => s.get(handleKey(profileId, key))).catch(() => null);
    if (handle && typeof handle.getFile === "function") found.set(key, handle);
  }
  return found;
}

export type Opened = { state: "ready"; file: File } | { state: "ask" } | { state: "gone" };

/**
 * Gets the film a kept handle points at.
 *  - "ready": the browser still allows it, here is the file.
 *  - "ask": the browser wants the member's OK first. Call again with `ask` true from a button press.
 *  - "gone": the file was moved, renamed or deleted, or the member said no.
 */
export async function openHandle(handle: FilmHandle, ask: boolean): Promise<Opened> {
  let access: Access;
  try {
    access = handle.queryPermission ? await handle.queryPermission({ mode: "read" }) : "granted";
  } catch {
    return { state: "gone" };
  }
  if (access === "prompt" && ask && handle.requestPermission) {
    /* A browser may refuse to ask twice on one press. The film then simply keeps waiting for the next press. */
    try { access = await handle.requestPermission({ mode: "read" }); } catch { return { state: "ask" }; }
  }
  if (access === "prompt") return { state: "ask" };
  if (access !== "granted") return { state: "gone" };
  try {
    return { state: "ready", file: await handle.getFile() };
  } catch {
    return { state: "gone" };
  }
}
