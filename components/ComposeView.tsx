"use client";

import { AlertCircle } from "lucide-react";
import type { HistoryEntry } from "@/lib/history";
import { CATEGORIES } from "@/lib/schema";
import { CATEGORY_STYLES } from "@/lib/categories";
import { MAX_CHARS } from "@/lib/constants";
import { formatShortDateTime, issueCount } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AnalyzeForm from "@/components/AnalyzeForm";

type Props = {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  error: string | null;
  /** Newest first; the first three show as Recent. */
  history: HistoryEntry[];
  onSelectEntry: (entry: HistoryEntry) => void;
  onShowHistory: () => void;
};

const RECENT = 3;

/** The starting screen: what Flowrite does, the form, and recent texts. */
export default function ComposeView({
  input,
  onInputChange,
  onSubmit,
  loading,
  error,
  history,
  onSelectEntry,
  onShowHistory,
}: Props) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-7 px-4 pt-10 pb-16 sm:px-6 sm:pt-16">
      <div className="flex flex-col gap-2.5">
        <h1 className="text-3xl leading-[1.15] font-bold tracking-[-0.025em] sm:text-4xl">
          Sharpen your sentences
        </h1>
        <p className="max-w-[62ch] leading-relaxed text-pretty text-muted-foreground">
          Paste a paragraph and see what a careful reader would stumble over:
          the order of your ideas, a connector doing the wrong job, a
          preposition that sits slightly off. It assumes your English is already
          good, so you won&rsquo;t get grammar drills.
        </p>
      </div>

      <AnalyzeForm
        value={input}
        onChange={onInputChange}
        onSubmit={onSubmit}
        loading={loading}
        maxChars={MAX_CHARS}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Couldn’t analyse</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section aria-labelledby="looks-at" className="flex flex-col gap-2.5">
        <h2 id="looks-at" className="text-[13px] font-semibold text-muted-foreground">
          What it looks at
        </h2>
        <ul className="flex flex-wrap gap-2">
          {CATEGORIES.map((category) => (
            <li
              key={category}
              className="flex h-7 items-center gap-2 rounded-full border bg-card px-2.5 text-[13px]"
            >
              <span
                aria-hidden="true"
                className={cn("size-2 rounded-full", CATEGORY_STYLES[category].dot)}
              />
              {CATEGORY_STYLES[category].label}
            </li>
          ))}
        </ul>
      </section>

      {history.length > 0 && (
        <section aria-labelledby="recent" className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <h2 id="recent" className="text-[13px] font-semibold text-muted-foreground">
              Recent
            </h2>
            <button
              type="button"
              onClick={onShowHistory}
              className="rounded-sm text-[13px] font-medium underline underline-offset-4 outline-none hover:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              See all
            </button>
          </div>
          <ul className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3">
            {history.slice(0, RECENT).map((entry) => (
              <li key={entry.id} className="flex">
                <button
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className="flex w-full flex-col gap-2 rounded-xl border bg-card px-4 py-3.5 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <span className="line-clamp-2 text-sm leading-normal">
                    {entry.input}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {issueCount(entry.result.issues.length)} ·{" "}
                    {formatShortDateTime(entry.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
