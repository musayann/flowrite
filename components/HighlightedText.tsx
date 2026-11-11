"use client";

import { useMemo } from "react";
import type { Issue } from "@/lib/schema";
import { originalSegments, type OriginalPart } from "@/lib/fixes";
import { CATEGORY_STYLES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { REMOVED_CLASS, wrapCore } from "@/components/diff-marks";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  original: string;
  issues: Issue[];
  activeIndex: number | null;
  onActivate: (index: number | null) => void;
  /**
   * The corrected version of `original`. When given, the words the
   * correction removed are struck through, as on an issue card's Before line.
   */
  corrected?: string;
  className?: string;
};

/** Kept text as-is; removed text struck through, without its spaces. */
function renderParts(parts: OriginalPart[], inMark: boolean) {
  return parts.map((part, i) => (
    <span key={i}>
      {part.removed
        ? wrapCore(part.text, (core) => (
            <del className={cn(REMOVED_CLASS, inMark && "text-inherit")}>
              {core}
            </del>
          ))
        : part.text}
    </span>
  ));
}

export default function HighlightedText({
  original,
  issues,
  activeIndex,
  onActivate,
  corrected = "",
  className,
}: Props) {
  const segments = useMemo(
    () => originalSegments(original, corrected, issues),
    [original, corrected, issues],
  );

  return (
    <p
      className={cn(
        "text-lg leading-loose break-words whitespace-pre-wrap",
        className,
      )}
    >
      {segments.map((seg, i) => {
        if (seg.issueIndex === null) {
          return <span key={i}>{renderParts(seg.parts, false)}</span>;
        }
        const idx = seg.issueIndex;
        const issue = issues[idx];
        const style = CATEGORY_STYLES[issue.category];
        return (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <mark
                onMouseEnter={() => onActivate(idx)}
                onMouseLeave={() => onActivate(null)}
                onFocus={() => onActivate(idx)}
                onBlur={() => onActivate(null)}
                onClick={() => {
                  document
                    .getElementById(`issue-${idx}`)
                    ?.scrollIntoView({ behavior: "smooth", block: "center" });
                }}
                className={cn(
                  "cursor-pointer rounded-sm",
                  style.mark,
                  activeIndex === idx && "ring-2 ring-ring",
                )}
              >
                {renderParts(seg.parts, true)}
              </mark>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <span className="font-medium">{style.label}:</span>{" "}
              {issue.explanation}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </p>
  );
}
