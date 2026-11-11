"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useSearchParams } from "next/navigation";
import ComposeView from "@/components/ComposeView";
import ReviewView from "@/components/ReviewView";
import HistoryDrawer from "@/components/HistoryDrawer";
import { useHistoryDrawer } from "@/components/history-drawer-context";
import { useNewText } from "@/components/new-text-context";
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

/**
 * The review on screen is named in the URL by its history id (`/?text=<id>`),
 * so a refresh, or Back and Forward, come back to the same text. The analysis
 * itself is read from history, which lives in this browser only.
 */
const TEXT_PARAM = "text";

/** Show the review of history entry `id`, or the form when `null`. */
function go(id: string | null) {
  const url = id ? `/?${TEXT_PARAM}=${encodeURIComponent(id)}` : "/";
  window.history.pushState(null, "", url);
}

const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

const noSubscribe = () => () => {};

/**
 * Next requires a Suspense boundary above `useSearchParams` for when it tries
 * to prerender the page at build time. The page is rendered per request (the
 * header reads the session), so the URL is known on the server and the
 * content still arrives server-rendered.
 */
export default function Page() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}

function Home() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getServerHistorySnapshot,
  );
  // False on the server and while hydrating, when history still reads empty.
  const hydrated = useSyncExternalStore(
    noSubscribe,
    () => true,
    () => false,
  );
  const drawer = useHistoryDrawer();

  const openId = useSearchParams().get(TEXT_PARAM);
  const review = useMemo(
    () => (openId ? (history.find((e) => e.id === openId) ?? null) : null),
    [history, openId],
  );

  // An id history doesn't have (removed, or from another browser): drop it,
  // and show the form.
  const missing = hydrated && openId !== null && review === null;
  useEffect(() => {
    if (missing) window.history.replaceState(null, "", "/");
  }, [missing]);

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
      const [saved] = addHistory(text, result);
      go(saved.id);
      toTop();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function selectHistory(entry: HistoryEntry) {
    setInput(entry.input);
    setError(null);
    drawer.setOpen(false);
    if (entry.id !== openId) go(entry.id);
    toTop();
  }

  /** Back to the form, with `text` in it. */
  function compose(text: string) {
    setInput(text);
    go(null);
    toTop();
  }

  // The brand in the header: from a review, start a new text, as "New text"
  // does. On the form, keep whatever is being written there.
  useNewText(() => (review ? compose("") : toTop()));

  return (
    <main className="flex-1 bg-muted/40">
      {review ? (
        <ReviewView
          key={review.id}
          original={review.input}
          result={review.result}
          issues={issues}
          fixes={fixes}
          analysedAt={review.createdAt}
          onEdit={() => compose(review.input)}
          onNewText={() => compose("")}
        />
      ) : openId && !hydrated ? null /* Restoring a review: don't flash the form. */ : (
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
