import type { AnalysisResult } from "./schema";

export type HistoryEntry = {
  id: string;
  input: string;
  result: AnalysisResult;
  createdAt: number;
};

/** Where the review of history entry `id` lives. */
export function reviewPath(id: string): string {
  return `/review/${encodeURIComponent(id)}`;
}

const KEY = "flowrite:history";
const MAX_ENTRIES = 20;

function canUseStorage(): boolean {
  return typeof window !== "undefined" && !!window.localStorage;
}

export function loadHistory(): HistoryEntry[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

/**
 * Prepend a new entry and persist (capped). Returns the updated list.
 * Re-analyzing the same input replaces its existing entry rather than
 * adding a duplicate, so each distinct text appears at most once.
 */
export function addHistory(
  input: string,
  result: AnalysisResult,
): HistoryEntry[] {
  const entry: HistoryEntry = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),
    input,
    result,
    createdAt: Date.now(),
  };
  const existing = loadHistory().filter((e) => e.input !== input);
  const next = [entry, ...existing].slice(0, MAX_ENTRIES);
  persist(next);
  return next;
}

export function removeHistory(id: string): HistoryEntry[] {
  const next = loadHistory().filter((e) => e.id !== id);
  persist(next);
  return next;
}

export function clearHistory(): HistoryEntry[] {
  persist([]);
  return [];
}

function persist(entries: HistoryEntry[]): void {
  snapshot = entries;
  if (canUseStorage()) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(entries));
    } catch {
      // Quota or serialization failure — non-fatal; history just won't persist.
    }
  }
  notify();
}

/*
 * The history as an external store, for `useSyncExternalStore`: read from
 * storage once, then kept in step with every write here and with writes from
 * other tabs. The server, which has no storage, always sees an empty history.
 */

const listeners = new Set<() => void>();
let snapshot: HistoryEntry[] | undefined;
const NONE: HistoryEntry[] = [];

function notify(): void {
  for (const listener of listeners) listener();
}

function onStorage(e: StorageEvent): void {
  if (e.key !== null && e.key !== KEY) return;
  snapshot = undefined;
  notify();
}

export function subscribeHistory(listener: () => void): () => void {
  if (listeners.size === 0 && typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/** The current history; the same array until it changes. */
export function getHistorySnapshot(): HistoryEntry[] {
  snapshot ??= loadHistory();
  return snapshot;
}

export function getServerHistorySnapshot(): HistoryEntry[] {
  return NONE;
}
