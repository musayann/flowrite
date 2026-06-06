"use client";

import { useMemo } from "react";
import type { Issue } from "@/lib/schema";
import { resolveHighlights } from "@/lib/highlight";
import { CATEGORY_STYLES } from "@/lib/categories";
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
};

export default function HighlightedText({
  original,
  issues,
  activeIndex,
  onActivate,
}: Props) {
  const segments = useMemo(
    () => resolveHighlights(original, issues),
    [original, issues],
  );

  return (
    <p className="text-lg leading-loose break-words whitespace-pre-wrap">
      {segments.map((seg, i) => {
        if (seg.issueIndex === null) {
          return <span key={i}>{seg.text}</span>;
        }
        const idx = seg.issueIndex;
        const issue = issues[idx];
        const style = CATEGORY_STYLES[issue.category];
        const isActive = activeIndex === idx;
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
                className={`cursor-pointer rounded px-0.5 ${style.mark} ${
                  isActive ? "ring-2 ring-ring" : ""
                }`}
              >
                {seg.text}
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
