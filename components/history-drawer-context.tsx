"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";

type HistoryDrawer = {
  open: boolean;
  /** When the drawer was last opened, to date its entries against. */
  openedAt: number;
  setOpen: (open: boolean) => void;
};

const HistoryDrawerContext = createContext<HistoryDrawer | null>(null);

/**
 * Whether the history drawer is open. The drawer belongs to the page, which
 * owns the history, but its button lives in the site header, so the two share
 * this one flag.
 */
export function HistoryDrawerProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState({ open: false, openedAt: 0 });
  const value = useMemo(
    () => ({
      ...state,
      setOpen: (open: boolean) =>
        setState((s) => (open ? { open, openedAt: Date.now() } : { ...s, open })),
    }),
    [state],
  );
  return (
    <HistoryDrawerContext.Provider value={value}>
      {children}
    </HistoryDrawerContext.Provider>
  );
}

export function useHistoryDrawer(): HistoryDrawer {
  const drawer = useContext(HistoryDrawerContext);
  if (!drawer) {
    throw new Error("useHistoryDrawer must be used inside HistoryDrawerProvider");
  }
  return drawer;
}

/** Opens the history drawer. Icon-only on small screens. */
export function HistoryButton() {
  const { open, setOpen } = useHistoryDrawer();
  return (
    <Button
      variant="outline"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen(true)}
      className="h-9 px-3 max-sm:size-11 max-sm:border-0 max-sm:bg-transparent max-sm:px-0 max-sm:[&_svg:not([class*='size-'])]:size-5"
    >
      <History />
      <span className="max-sm:sr-only">History</span>
    </Button>
  );
}
