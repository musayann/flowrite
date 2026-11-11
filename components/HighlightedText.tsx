"use client";

import { Fragment, useMemo } from "react";
import type { Issue } from "@/lib/schema";
import { resolveHighlights } from "@/lib/highlight";
import { CATEGORY_STYLES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import IssueMarker from "@/components/IssueMarker";

type Props = {
  original: string;
  /** In reading order: issue `i` is numbered `i + 1`. */
  issues: Issue[];
  /** The issue whose note is open; its excerpt is tinted. */
  openIndex: number | null;
  onPick: (index: number) => void;
  /** Which issues to mark; the rest read as plain text. Defaults to all. */
  shown?: (index: number) => boolean;
  className?: string;
};

const showAll = () => true;

/**
 * The user's text with each issue's excerpt underlined in its category colour
 * and followed by its number. Clicking either opens the issue's note.
 */
export default function HighlightedText({
  original,
  issues,
  openIndex,
  onPick,
  shown = showAll,
  className,
}: Props) {
  const segments = useMemo(
    () => resolveHighlights(original, issues),
    [original, issues],
  );

  return (
    <p className={cn("break-words whitespace-pre-wrap", className)}>
      {segments.map((seg, i) => {
        const idx = seg.issueIndex;
        if (idx === null || !shown(idx)) {
          return <span key={i}>{seg.text}</span>;
        }
        const issue = issues[idx];
        const style = CATEGORY_STYLES[issue.category];
        const open = openIndex === idx;
        return (
          <Fragment key={i}>
            <mark
              data-issue={idx}
              onClick={() => onPick(idx)}
              className={cn(
                "cursor-pointer rounded-[3px] px-px py-0.5 text-inherit underline decoration-2 underline-offset-[6px] transition-colors",
                style.underline,
                open ? style.tint : "bg-transparent",
              )}
            >
              {seg.text}
            </mark>
            <IssueMarker
              category={issue.category}
              number={idx + 1}
              open={open}
              onClick={() => onPick(idx)}
            />
          </Fragment>
        );
      })}
    </p>
  );
}
