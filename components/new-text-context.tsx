"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";
import Link from "next/link";
import { FlowriteMark } from "@/components/flowrite-mark";

type Handler = () => void;

const NewTextContext = createContext<RefObject<Handler | null> | null>(null);

/**
 * Lets the brand in the site header start a new text. What's on screen
 * belongs to the page, but the brand lives in the header, so the page says
 * what starting a new text means and the brand calls it.
 */
export function NewTextProvider({ children }: { children: ReactNode }) {
  const handler = useRef<Handler | null>(null);
  return (
    <NewTextContext.Provider value={handler}>{children}</NewTextContext.Provider>
  );
}

/** For the page: what the brand should do while the page is showing. */
export function useNewText(handler: Handler) {
  const ref = useContext(NewTextContext);
  useEffect(() => {
    if (!ref) return;
    ref.current = handler;
    return () => {
      if (ref.current === handler) ref.current = null;
    };
  });
}

/**
 * The brand, linking home. On the home page it starts a new text in place
 * rather than navigating, since navigating to the page you're on keeps its
 * state. Elsewhere, or opened in a new tab, it's an ordinary link.
 */
export function BrandLink() {
  const handler = useContext(NewTextContext);
  return (
    <Link
      href="/"
      onNavigate={(e) => {
        if (!handler?.current) return;
        e.preventDefault();
        handler.current();
      }}
      className="-mx-1.5 flex items-center gap-2 rounded-md px-1.5 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <FlowriteMark className="h-5 w-5 shrink-0 text-primary" />
      <span className="text-base font-bold tracking-tight">Flowrite</span>
    </Link>
  );
}
