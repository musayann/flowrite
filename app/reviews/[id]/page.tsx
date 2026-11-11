"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useParams, useRouter } from "next/navigation";
import ReviewView from "@/components/ReviewView";
import { useDraft } from "@/components/draft-context";
import { useNewText } from "@/components/new-text-context";
import { resolveFixes } from "@/lib/fixes";
import { orderIssues } from "@/lib/highlight";
import {
  getHistorySnapshot,
  getServerHistorySnapshot,
  subscribeHistory,
} from "@/lib/history";

const noSubscribe = () => () => {};

/**
 * The review of one text, named by its history id (`/reviews/<id>`), so a
 * refresh, or Back and Forward, come back to it. The analysis itself is read
 * from history, which lives in this browser only.
 */
export default function ReviewPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [, setDraft] = useDraft();
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

  const review = useMemo(
    () => history.find((e) => e.id === id) ?? null,
    [history, id],
  );

  // An id history doesn't have (removed, or from another browser): go to the
  // form instead.
  const missing = hydrated && review === null;
  useEffect(() => {
    if (missing) router.replace("/");
  }, [missing, router]);

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

  /** To the form, with `text` in it. */
  function compose(text: string) {
    setDraft(text);
    router.push("/");
  }

  // The brand in the header starts a new text, as "New text" does.
  useNewText(() => compose(""));

  return (
    <main className="flex-1 bg-muted/40">
      {review && (
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
      )}
    </main>
  );
}
