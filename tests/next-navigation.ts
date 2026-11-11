import { useMemo, useSyncExternalStore } from "react";

/*
 * Stands in for `next/navigation`'s `useSearchParams`, which needs a mounted
 * App Router. Like the real one, it follows `history.pushState` and
 * `replaceState` as well as Back and Forward, and the server render sees the
 * URL's search params too.
 */

const listeners = new Set<() => void>();

for (const method of ["pushState", "replaceState"] as const) {
  const original = window.history[method].bind(window.history);
  window.history[method] = (...args: Parameters<History["pushState"]>) => {
    original(...args);
    listeners.forEach((listener) => listener());
  };
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("popstate", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", listener);
  };
}

const search = () => window.location.search;

export function useSearchParams() {
  const current = useSyncExternalStore(subscribe, search, search);
  return useMemo(() => new URLSearchParams(current), [current]);
}
