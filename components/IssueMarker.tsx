"use client";

import type { Category } from "@/lib/schema";
import { CATEGORY_STYLES } from "@/lib/categories";
import { cn } from "@/lib/utils";

type Props = {
  category: Category;
  /** The issue's number, as shown on its note. */
  number: number;
  /** Whether this issue's note is the open one. */
  open: boolean;
  onClick: () => void;
};

/**
 * The small numbered button that follows an issue in the text and opens its
 * note. It is drawn at 18px but its hit area reaches past that, so it is
 * still easy to tap.
 */
export default function IssueMarker({ category, number, open, onClick }: Props) {
  const style = CATEGORY_STYLES[category];
  return (
    <button
      type="button"
      data-marker={number - 1}
      aria-label={`Issue ${number}, ${style.label.toLowerCase()}`}
      aria-expanded={open}
      onClick={onClick}
      className={cn(
        "relative mr-0.5 ml-[3px] inline-flex scroll-mt-24 size-[18px] items-center justify-center rounded-full align-[0.5em] font-sans text-[11px] leading-none font-semibold transition-transform outline-none after:absolute after:-inset-2.5 hover:scale-110 focus-visible:ring-3 focus-visible:ring-ring/60",
        style.number,
      )}
    >
      {number}
    </button>
  );
}
