"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import ComposeView from "@/components/ComposeView";
import { useDraft } from "@/components/draft-context";
import { useHistoryDrawer } from "@/components/history-drawer-context";
import { useNewText } from "@/components/new-text-context";
import type { AnalysisResult } from "@/lib/schema";
import {
  addHistory,
  getHistorySnapshot,
  getServerHistorySnapshot,
  reviewPath,
  subscribeHistory,
  type HistoryEntry,
} from "@/lib/history";

const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

/** The form: write a text, and analyse it. Its review opens on its own page. */
export default function ComposePage() {
  const router = useRouter();
  const [input, setInput] = useDraft();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const history = useSyncExternalStore(
    subscribeHistory,
    getHistorySnapshot,
    getServerHistorySnapshot,
  );
  const drawer = useHistoryDrawer();

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
        setLoading(false);
        return;
      }
      const result = data.result as AnalysisResult;
      const [saved] = addHistory(text, result);
      // Still analysing, as far as the form is concerned, until the review
      // replaces it.
      router.push(reviewPath(saved.id));
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  // The brand in the header: keep whatever is being written here.
  useNewText(toTop);

  return (
    <main className="flex-1 bg-muted/40">
      <ComposeView
        input={input}
        onInputChange={setInput}
        onSubmit={analyze}
        loading={loading}
        error={error}
        history={history}
        onSelectEntry={(entry: HistoryEntry) => router.push(reviewPath(entry.id))}
        onShowHistory={() => drawer.setOpen(true)}
      />
    </main>
  );
}
