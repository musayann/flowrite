"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import ComposeView from "@/components/ComposeView";
import ReviewView from "@/components/ReviewView";
import HistoryDrawer from "@/components/HistoryDrawer";
import { useHistoryDrawer } from "@/components/history-drawer-context";
import type { AnalysisResult } from "@/lib/schema";
import { resolveFixes } from "@/lib/fixes";
import { orderIssues } from "@/lib/highlight";
import {
  addHistory,
  clearHistory,
  getHistorySnapshot,
  getServerHistorySnapshot,
  removeHistory,
  subscribeHistory,
  type HistoryEntry,
} from "@/lib/history";

/** The analysis on screen: the text it is for, and when it was made. */
type Review = {
  input: string;
  result: AnalysisResult;
  createdAt: number;
  /** Its history entry, when it has one. */
  id: string | null;
};

const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

export default function Home() {
  const [input, setInput] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getServerHistorySnapshot,
  );
  const drawer = useHistoryDrawer();

  // Number issues in reading order, and work out what the correction changed
  // for each, in that same order.
  const issues = useMemo(
    () => (review ? orderIssues(review.input, review.result.issues) : []),
    [review],
  );
  const fixes = useMemo(
    () =>
      review
        ? resolveFixes(review.input, review.result.correctedVersion, issues)
        : [],
    [review, issues],
  );

  async function analyze() {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Something went wrong.");
        return;
      }
      const result = data.result as AnalysisResult;
      const next = addHistory(text, result);
      setReview({
        input: text,
        result,
        createdAt: Date.now(),
        id: next[0]?.input === text ? next[0].id : null,
      });
      toTop();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function selectHistory(entry: HistoryEntry) {
    setInput(entry.input);
    setReview({
      input: entry.input,
      result: entry.result,
      createdAt: entry.createdAt,
      id: entry.id,
    });
    setError(null);
    drawer.setOpen(false);
    toTop();
  }

  /** Back to the form, with `text` in it. */
  function compose(text: string) {
    setInput(text);
    setReview(null);
    toTop();
  }

  return (
    <main className="flex-1 bg-muted/40">
      {review ? (
        <ReviewView
          key={`${review.createdAt}:${review.id}`}
          original={review.input}
          result={review.result}
          issues={issues}
          fixes={fixes}
          analysedAt={review.createdAt}
          onEdit={() => compose(review.input)}
          onNewText={() => compose("")}
        />
      ) : (
        <ComposeView
          input={input}
          onInputChange={setInput}
          onSubmit={analyze}
          loading={loading}
          error={error}
          history={history}
          onSelectEntry={selectHistory}
          onShowHistory={() => drawer.setOpen(true)}
        />
      )}
      <HistoryDrawer
        open={drawer.open}
        onOpenChange={drawer.setOpen}
        entries={history}
        currentId={review?.id ?? null}
        onSelect={selectHistory}
        now={drawer.openedAt}
        onRemove={removeHistory}
        onClear={clearHistory}
      />
    </main>
  );
}
