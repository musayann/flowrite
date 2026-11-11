"use client";

import { Fragment, useMemo } from "react";
import type { Issue } from "@/lib/schema";
import { changeParts } from "@/lib/fixes";
import { cn } from "@/lib/utils";
import {
  INSERTED_CLASS,
  REMOVED_CLASS,
  wrapCore,
} from "@/components/diff-marks";
import IssueMarker from "@/components/IssueMarker";

type Props = {
  /** The text that was analysed: the "before". */
  original: string;
  /** Its minimal correction: the "after". */
  corrected: string;
  /** In reading order: issue `i` is numbered `i + 1`. */
  issues: Issue[];
  /** The issue whose note is open; its added words get a ring. */
  openIndex: number | null;
  onPick: (index: number) => void;
  /** Which issues get a number; the rest show their change unnumbered. */
  shown?: (index: number) => boolean;
  className?: string;
};

const showAll = () => true;

/**
 * The corrected text with every change shown inline: removed words struck
 * through, the words that replace them highlighted, and each issue's number
 * after its change.
 */
export default function ChangesText({
  original,
  corrected,
  issues,
  openIndex,
  onPick,
  shown = showAll,
  className,
}: Props) {
  const parts = useMemo(
    () => changeParts(original, corrected, issues),
    [original, corrected, issues],
  );

  return (
    <p className={cn("break-words whitespace-pre-wrap", className)}>
      {parts.map((part, i) => {
        const idx = part.issueIndex;
        const linked = idx !== null && shown(idx);
        const pick = linked ? () => onPick(idx) : undefined;
        const marker = part.markerAfter && linked;
        // Keep the number against the changed word, before any space after it.
        const body = marker ? part.text.trimEnd() : part.text;
        const trail = part.text.slice(body.length);

        let text;
        if (part.kind === "removed") {
          text = wrapCore(body, (core) => (
            <del
              onClick={pick}
              className={cn(REMOVED_CLASS, linked && "cursor-pointer")}
            >
              {core}
            </del>
          ));
        } else if (part.kind === "added") {
          const afterRemoved = parts[i - 1]?.kind === "removed";
          text = wrapCore(body, (core) => (
            <ins
              onClick={pick}
              className={cn(
                INSERTED_CLASS,
                "px-[3px] py-0.5",
                afterRemoved && "ml-1",
                linked && "cursor-pointer",
                linked && openIndex === idx && "ring-2 ring-ring/70",
              )}
            >
              {core}
            </ins>
          ));
        } else {
          text = body;
        }

        return (
          <Fragment key={i}>
            {text}
            {marker && (
              <IssueMarker
                category={issues[idx].category}
                number={idx + 1}
                open={openIndex === idx}
                onClick={() => onPick(idx)}
              />
            )}
            {trail}
          </Fragment>
        );
      })}
    </p>
  );
}
