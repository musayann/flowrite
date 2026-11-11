"use client";

import { useMemo } from "react";
import type { Issue } from "@/lib/schema";
import type { Range } from "@/lib/highlight";
import { correctedParts } from "@/lib/fixes";
import { CATEGORY_STYLES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import { INSERTED_CLASS, wrapCore } from "@/components/diff-marks";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type Props = {
  /** The text that was analysed: the "before". */
  original: string;
  /** The minimal correction of `original`: the "after" shown here. */
  corrected: string;
  issues: Issue[];
  /** Each issue's fix in `corrected`, from `fixRanges`. */
  ranges: Range[];
  activeIndex: number | null;
  onActivate: (index: number | null) => void;
  className?: string;
};

/**
 * The corrected text with every word the correction added highlighted, the
 * same way as the After line of an issue card. An insertion that belongs to
 * an issue's fix is linked to that issue's card.
 */
export default function CorrectedText({
  original,
  corrected,
  issues,
  ranges,
  activeIndex,
  onActivate,
  className,
}: Props) {
  const parts = useMemo(
    () => correctedParts(original, corrected, ranges),
    [original, corrected, ranges],
  );

  return (
    <p
      className={cn(
        "text-lg leading-loose break-words whitespace-pre-wrap",
        className,
      )}
    >
      {parts.map((part, i) => {
        if (!part.added) return <span key={i}>{part.text}</span>;

        const idx = part.issueIndex;
        if (idx === null) {
          return (
            <span key={i}>
              {wrapCore(part.text, (core) => (
                <ins className={INSERTED_CLASS}>{core}</ins>
              ))}
            </span>
          );
        }

        const issue = issues[idx];
        const style = CATEGORY_STYLES[issue.category];
        return (
          <span key={i}>
            {wrapCore(part.text, (core) => (
              <Tooltip>
                <TooltipTrigger asChild>
                  <ins
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
                      "cursor-pointer",
                      INSERTED_CLASS,
                      activeIndex === idx && "ring-2 ring-ring",
                    )}
                  >
                    {core}
                  </ins>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <span className="font-medium">{style.label}:</span>{" "}
                  {issue.explanation}
                </TooltipContent>
              </Tooltip>
            ))}
          </span>
        );
      })}
    </p>
  );
}
