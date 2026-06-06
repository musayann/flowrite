"use client";

import { useMemo } from "react";
import type { Issue } from "@/lib/schema";
import { resolveHighlights } from "@/lib/highlight";
import { CATEGORY_STYLES } from "@/lib/categories";

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
    <p className="whitespace-pre-wrap break-words text-lg leading-loose">
      {segments.map((seg, i) => {
        if (seg.issueIndex === null) {
          return <span key={i}>{seg.text}</span>;
        }
        const issue = issues[seg.issueIndex];
        const style = CATEGORY_STYLES[issue.category];
        const isActive = activeIndex === seg.issueIndex;
        return (
          <mark
            key={i}
            tabIndex={0}
            role="button"
            title={`${style.label}: ${issue.explanation}`}
            onMouseEnter={() => onActivate(seg.issueIndex)}
            onMouseLeave={() => onActivate(null)}
            onFocus={() => onActivate(seg.issueIndex)}
            onBlur={() => onActivate(null)}
            onClick={() => {
              document
                .getElementById(`issue-${seg.issueIndex}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className={`cursor-pointer rounded px-0.5 ${style.mark} ${
              isActive ? "ring-2 ring-slate-900/40" : ""
            }`}
          >
            {seg.text}
          </mark>
        );
      })}
    </p>
  );
}
