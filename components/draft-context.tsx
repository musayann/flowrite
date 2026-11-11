"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type Draft = [text: string, setText: (text: string) => void];

const DraftContext = createContext<Draft | null>(null);

/**
 * The text being written on the form. The form and the review are separate
 * pages, and a page's state goes when you leave it, so the draft lives in the
 * layout: it is still there after a look at a review and Back, and a review's
 * Edit can hand its text to the form.
 */
export function DraftProvider({ children }: { children: ReactNode }) {
  const draft = useState("");
  return <DraftContext.Provider value={draft}>{children}</DraftContext.Provider>;
}

export function useDraft(): Draft {
  const draft = useContext(DraftContext);
  if (!draft) throw new Error("useDraft must be used inside DraftProvider");
  return draft;
}
