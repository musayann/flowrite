"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import type { AnalysisResult, Category, Issue } from "@/lib/schema";
import type { Fix } from "@/lib/fixes";
import { CATEGORY_STYLES } from "@/lib/categories";
import { analysedLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import CopyButton from "@/components/CopyButton";
import ReviewDocument from "@/components/ReviewDocument";
import IssueMargin from "@/components/IssueMargin";
import IssueSheet, { SHEET_ID } from "@/components/IssueSheet";

type Props = {
  /** The text that was analysed. */
  original: string;
  result: AnalysisResult;
  /** `result.issues` in reading order: issue `i` is numbered `i + 1`. */
  issues: Issue[];
  /** Lines up with `issues` by index. */
  fixes: (Fix | null)[];
  /** When the analysis was made, as epoch milliseconds. */
  analysedAt: number;
  onEdit: () => void;
  onNewText: () => void;
};

function heading(n: number): string {
  if (n === 0) return "Nothing a careful reader would stumble over";
  return `${n} thing${n === 1 ? "" : "s"} a careful reader would stumble over`;
}

const CHIP =
  "flex h-8 items-center gap-2 rounded-full border px-3 text-[13px] font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50";
const CHIP_ON = "border-foreground bg-foreground text-background";
const CHIP_OFF = "bg-card hover:bg-muted";

/**
 * Whether the margin sits beside the text (Tailwind's `lg`). Below that it
 * sits under the text, and the sheet shows the open issue instead.
 */
const marginBeside = () => window.matchMedia("(min-width: 64rem)").matches;

/** Bring an issue's note into view in the margin, once it has rendered. */
function revealNote(index: number) {
  requestAnimationFrame(() => {
    document
      .getElementById(`issue-${index}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });
}

/**
 * On small screens, make sure an issue's number in the text isn't hidden
 * behind the sheet that now shows its note: if it is, scroll it up to the top.
 */
function revealAboveSheet(index: number) {
  requestAnimationFrame(() => {
    const marker = document.querySelector(`[data-marker="${index}"]`);
    if (!marker) return;
    const sheetTop =
      document.getElementById(SHEET_ID)?.getBoundingClientRect().top ??
      window.innerHeight;
    if (marker.getBoundingClientRect().bottom > sheetTop - 16) {
      marker.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });
}

/**
 * The review screen: the text in its three readings, with its issues as
 * numbered notes in the margin (or, on small screens, a sheet that opens
 * from the text).
 */
export default function ReviewView({
  original,
  result,
  issues,
  fixes,
  analysedAt,
  onEdit,
  onNewText,
}: Props) {
  // Start with the first note open, so there's something to read straight away.
  const [openIndex, setOpenIndex] = useState<number | null>(
    issues.length > 0 ? 0 : null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filter, setFilter] = useState<Category | null>(null);

  // Each category present, with how many issues it has, in order of first use.
  const categories = useMemo(() => {
    const counts = new Map<Category, number>();
    for (const { category } of issues) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
    return [...counts];
  }, [issues]);

  const shown = (i: number) => !filter || issues[i].category === filter;
  const visible = issues.map((_, i) => i).filter(shown);

  /**
   * From the text: open the note and, on small screens, the sheet. Scroll to
   * the note only when the margin is beside the text; below it, keep the text
   * in view above the sheet instead.
   */
  function pick(i: number) {
    setOpenIndex(i);
    setSheetOpen(true);
    if (marginBeside()) revealNote(i);
    else revealAboveSheet(i);
  }

  /** From the margin: open or close the note in place. */
  function toggle(i: number) {
    setOpenIndex(openIndex === i ? null : i);
  }

  function step(delta: 1 | -1, inSheet = false) {
    if (visible.length === 0) return;
    const at = openIndex === null ? -1 : visible.indexOf(openIndex);
    const next =
      at === -1
        ? visible[delta === 1 ? 0 : visible.length - 1]
        : visible[(at + delta + visible.length) % visible.length];
    setOpenIndex(next);
    if (inSheet) revealAboveSheet(next);
    else revealNote(next);
  }

  function chooseFilter(category: Category | null) {
    setFilter(category);
    if (
      category &&
      openIndex !== null &&
      issues[openIndex].category !== category
    ) {
      setOpenIndex(null);
    }
  }

  const sheetIssue =
    sheetOpen && openIndex !== null && shown(openIndex) ? openIndex : null;

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pt-8 pb-16 sm:px-6 sm:pt-9",
        sheetIssue !== null && "max-lg:pb-[60vh]",
      )}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[13px] text-muted-foreground">
            Analysed {analysedLabel(analysedAt)}
          </p>
          <h1 className="text-2xl leading-tight font-bold tracking-[-0.02em] text-balance sm:text-[28px]">
            {heading(issues.length)}
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="h-10 px-3.5" onClick={onNewText}>
            <Plus />
            New text
          </Button>
          <CopyButton
            text={result.correctedVersion}
            label="Copy corrected"
            variant="default"
            className="h-10 px-3.5"
          />
        </div>
      </div>

      {categories.length > 1 && (
        <div
          role="group"
          aria-label="Show issues by category"
          className="flex flex-wrap items-center gap-2"
        >
          <button
            type="button"
            aria-pressed={filter === null}
            onClick={() => chooseFilter(null)}
            className={cn(CHIP, filter === null ? CHIP_ON : CHIP_OFF)}
          >
            All <span className="opacity-75">{issues.length}</span>
          </button>
          {categories.map(([category, count]) => {
            const on = filter === category;
            const style = CATEGORY_STYLES[category];
            return (
              <button
                key={category}
                type="button"
                aria-pressed={on}
                onClick={() => chooseFilter(on ? null : category)}
                className={cn(CHIP, on ? CHIP_ON : CHIP_OFF)}
              >
                <span
                  aria-hidden="true"
                  className={cn("size-2 rounded-full", style.dot)}
                />
                {style.label}{" "}
                <span className={on ? "opacity-75" : "text-muted-foreground"}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-7">
        <ReviewDocument
          original={original}
          result={result}
          issues={issues}
          openIndex={openIndex}
          onPick={pick}
          shown={shown}
          onEdit={onEdit}
          className="min-w-0 flex-[999_1_560px]"
        />
        <aside
          aria-label="Issues"
          className="-m-1 flex max-w-full min-w-0 flex-[1_1_340px] flex-col gap-2.5 p-1 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto"
        >
          {issues.length === 0 ? (
            <div className="rounded-xl border bg-card px-4 py-3.5">
              <p className="text-[15px] font-semibold">No issues found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This reads clearly and coherently.
              </p>
            </div>
          ) : (
            <IssueMargin
              issues={issues}
              fixes={fixes}
              visible={visible}
              openIndex={openIndex}
              onToggle={toggle}
              onStep={step}
            />
          )}
        </aside>
      </div>

      {sheetIssue !== null && (
        <IssueSheet
          issue={issues[sheetIssue]}
          index={sheetIssue}
          fix={fixes[sheetIssue]}
          position={visible.indexOf(sheetIssue) + 1}
          total={visible.length}
          onStep={(delta) => step(delta, true)}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
