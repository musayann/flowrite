"use client";

import { ChevronDown } from "lucide-react";
import type { Issue } from "@/lib/schema";
import { fixSummary, type Fix } from "@/lib/fixes";
import { CATEGORY_STYLES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { INSERTED_CLASS } from "@/components/diff-marks";
import IssueDetails from "@/components/IssueDetails";

type Props = {
  issue: Issue;
  /** Position in the reading-order list; the note shows `index + 1`. */
  index: number;
  open: boolean;
  onToggle: () => void;
  /** What the minimal correction changed for this issue, if anything. */
  fix?: Fix | null;
};

/** The fix in one line, `before → after`, or the excerpt when nothing changed. */
function Summary({ issue, fix }: { issue: Issue; fix?: Fix | null }) {
  if (!fix) {
    return <span className="text-muted-foreground">“{issue.excerpt}”</span>;
  }
  const { before, after } = fixSummary(fix);
  return (
    <>
      {before && <del className="text-muted-foreground">{before}</del>}
      {before && after && " → "}
      {after && <ins className={cn(INSERTED_CLASS, "px-0.5")}>{after}</ins>}
    </>
  );
}

/**
 * One margin note: a numbered header that already shows the fix, and, when
 * open, the fix in full, why it was needed, and the rule to remember.
 */
export default function IssueCard({ issue, index, open, onToggle, fix }: Props) {
  const style = CATEGORY_STYLES[issue.category];
  const bodyId = `issue-${index}-body`;

  return (
    <article
      id={`issue-${index}`}
      className={cn(
        "scroll-mt-24 rounded-xl border bg-card text-card-foreground shadow-xs transition-shadow",
        open && cn(style.active, "shadow-md"),
      )}
    >
      <h3>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex min-h-14 w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span
            className={cn(
              "flex size-6 flex-none items-center justify-center rounded-full text-xs font-semibold",
              style.number,
            )}
          >
            <span className="sr-only">Issue</span> {index + 1}
          </span>{" "}
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span
              className={cn(
                "text-xs font-semibold tracking-[0.04em] uppercase",
                style.text,
              )}
            >
              {style.label}
            </span>{" "}
            <span className="line-clamp-2 text-sm font-normal">
              <Summary issue={issue} fix={fix} />
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 flex-none text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>
      </h3>
      {open && (
        <div id={bodyId} className="flex flex-col gap-3.5 px-4 pt-0.5 pb-4">
          <IssueDetails issue={issue} fix={fix} />
        </div>
      )}
    </article>
  );
}
