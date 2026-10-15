/**
 * The film list as this browser keeps it: one list per profile in localStorage, read once and written on every change.
 * A browser that refuses storage (private mode, a full disk) still works: the list then lasts for this visit only.
 * The rules for the list itself are in playlist.ts.
 */
import { EMPTY, parseStored, serialise, storageKey, type Stored } from "./playlist";

export interface ListStore {
  get(): Stored;
  set(change: (s: Stored) => Stored): Stored;
  subscribe(listener: () => void): () => void;
}

const stores = new Map<string, ListStore>();

function open(profileId: string): ListStore {
  const key = storageKey(profileId), listeners = new Set<() => void>();
  let value: Stored | null = null;
  const read = (): Stored => {
    try { return parseStored(window.localStorage.getItem(key)); } catch { return EMPTY; }
  };
  const tell = () => listeners.forEach((l) => l());
  /* The same list open in another tab: follow it. */
  const onStorage = (e: StorageEvent) => {
    if (e.key !== key) return;
    value = parseStored(e.newValue);
    tell();
  };
  return {
    get: () => (value ??= read()),
    set(change) {
      const before = value ?? read(), next = change(before);
      if (next === before) return before;
      value = next;
      try { window.localStorage.setItem(key, serialise(next)); } catch { /* kept for this visit only */ }
      tell();
      return next;
    },
    subscribe(listener) {
      if (!listeners.size) window.addEventListener("storage", onStorage);
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (!listeners.size) window.removeEventListener("storage", onStorage);
      };
    },
  };
}

/** On the server there is no browser storage and nothing to keep. */
const NONE: ListStore = { get: () => EMPTY, set: () => EMPTY, subscribe: () => () => undefined };

/** The one store for a profile's list in this page. */
export function listStore(profileId: string): ListStore {
  if (typeof window === "undefined") return NONE;
  let store = stores.get(profileId);
  if (!store) stores.set(profileId, store = open(profileId));
  return store;
}

/** What the server draws, and the first client draw: no list, because the list lives only in the browser. */
export const emptyList = () => EMPTY;
