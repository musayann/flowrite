import { useMemo, useSyncExternalStore } from "react";

/*
 * Stands in for `next/navigation`, whose hooks need a mounted App Router.
 * The router moves through `history.pushState` and `replaceState`, and the
 * hooks follow those as well as Back and Forward. The server render sees the
 * URL too, as the real ones do for a page rendered per request.
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

const pathname = () => window.location.pathname;

export function usePathname() {
  return useSyncExternalStore(subscribe, pathname, pathname);
}

/** The app's one dynamic route is `/reviews/[id]`. */
export function useParams() {
  const current = usePathname();
  return useMemo((): Record<string, string> => {
    const match = /^\/reviews\/([^/]+)$/.exec(current);
    return match ? { id: decodeURIComponent(match[1]) } : {};
  }, [current]);
}

const router = {
  push: (href: string) => window.history.pushState(null, "", href),
  replace: (href: string) => window.history.replaceState(null, "", href),
  back: () => window.history.back(),
  forward: () => window.history.forward(),
};

export function useRouter() {
  return router;
}
