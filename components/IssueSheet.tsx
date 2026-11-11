"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Issue } from "@/lib/schema";
import type { Fix } from "@/lib/fixes";
import { CATEGORY_STYLES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import IssueDetails from "@/components/IssueDetails";

type Props = {
  issue: Issue;
  /** Its index in reading order; shown as `index + 1`. */
  index: number;
  fix?: Fix | null;
  /** 1-based place among the visible issues, and how many there are. */
  position: number;
  total: number;
  onStep: (delta: 1 | -1) => void;
  onClose: () => void;
};

export const SHEET_ID = "issue-sheet";

const ICON_BUTTON = "size-11 rounded-[10px] [&_svg:not([class*='size-'])]:size-5";

/**
 * On small screens, where there is no room for a margin, an issue picked in
 * the text opens here: a panel over the bottom of the screen that leaves the
 * text above it in view. Escape closes it.
 */
export default function IssueSheet({
  issue,
  index,
  fix,
  position,
  total,
  onStep,
  onClose,
}: Props) {
  const style = CATEGORY_STYLES[issue.category];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <section
      id={SHEET_ID}
      aria-label={`Issue ${index + 1}`}
      className="fixed inset-x-0 bottom-0 z-40 flex max-h-[55vh] flex-col rounded-t-[20px] border-t bg-card text-card-foreground shadow-[0_-10px_32px_rgba(0,0,0,0.14)] lg:hidden"
    >
      <div aria-hidden="true" className="flex justify-center pt-2">
        <span className="h-1 w-9 rounded-full bg-border" />
      </div>
      <div className="flex items-center justify-between gap-2 py-1.5 pr-2 pl-4">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden="true"
            className={cn(
              "flex size-[26px] flex-none items-center justify-center rounded-full text-[13px] font-semibold",
              style.number,
            )}
          >
            {index + 1}
          </span>
          <div className="flex flex-col">
            <span
              className={cn(
                "text-xs font-semibold tracking-[0.04em] uppercase",
                style.text,
              )}
            >
              {style.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {position} of {total}
            </span>
          </div>
        </div>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous issue"
            className={ICON_BUTTON}
            onClick={() => onStep(-1)}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next issue"
            className={ICON_BUTTON}
            onClick={() => onStep(1)}
          >
            <ChevronRight />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close"
            className={ICON_BUTTON}
            onClick={onClose}
          >
            <X />
          </Button>
        </div>
      </div>
      <div className="flex flex-col gap-3.5 overflow-y-auto px-4 pt-1 pb-5">
        <IssueDetails issue={issue} fix={fix} />
      </div>
    </section>
  );
}
