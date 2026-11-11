"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { Issue } from "@/lib/schema";
import type { Fix } from "@/lib/fixes";
import { Button } from "@/components/ui/button";
import IssueCard from "@/components/IssueCard";

type Props = {
  /** In reading order: issue `i` is numbered `i + 1`. */
  issues: Issue[];
  /** Lines up with `issues` by index. */
  fixes: (Fix | null)[];
  /** Indices of the issues to list, in order (after any filter). */
  visible: number[];
  openIndex: number | null;
  onToggle: (index: number) => void;
  /** Open the next (`1`) or previous (`-1`) visible issue. */
  onStep: (delta: 1 | -1) => void;
};

/** The issue notes that sit beside the text, with a way to step through them. */
export default function IssueMargin({
  issues,
  fixes,
  visible,
  openIndex,
  onToggle,
  onStep,
}: Props) {
  const position = openIndex === null ? -1 : visible.indexOf(openIndex);

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-0.5 pb-0.5">
        <h2 className="text-[15px] font-semibold">
          Issues{" "}
          <span className="font-normal text-muted-foreground">
            {visible.length}
          </span>
        </h2>
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[13px] text-muted-foreground">
            {position === -1 ? "–" : position + 1} of {visible.length}
          </span>
          <Button
            variant="outline"
            size="icon"
            aria-label="Previous issue"
            onClick={() => onStep(-1)}
            disabled={visible.length === 0}
          >
            <ChevronUp />
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Next issue"
            onClick={() => onStep(1)}
            disabled={visible.length === 0}
          >
            <ChevronDown />
          </Button>
        </div>
      </div>
      {visible.map((i) => (
        <IssueCard
          key={i}
          issue={issues[i]}
          index={i}
          open={openIndex === i}
          onToggle={() => onToggle(i)}
          fix={fixes[i]}
        />
      ))}
    </>
  );
}
