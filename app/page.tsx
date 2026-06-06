"use client";

import { useEffect, useState } from "react";
import AnalyzeForm from "@/components/AnalyzeForm";
import HighlightedText from "@/components/HighlightedText";
import IssueCard from "@/components/IssueCard";
import VersionPanel from "@/components/VersionPanel";
import HistoryList from "@/components/HistoryList";
import type { AnalysisResult } from "@/lib/schema";
import {
  addHistory,
  clearHistory,
  loadHistory,
  removeHistory,
  type HistoryEntry,
} from "@/lib/history";

const MAX_CHARS = 1500;

export default function Home() {
  const [input, setInput] = useState("");
  const [analyzed, setAnalyzed] = useState(""); // the text the result is for
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  async function analyze() {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setActiveIndex(null);
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
      const analysis = data.result as AnalysisResult;
      setResult(analysis);
      setAnalyzed(text);
      setHistory(addHistory(text, analysis));
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function selectHistory(entry: HistoryEntry) {
    setInput(entry.input);
    setAnalyzed(entry.input);
    setResult(entry.result);
    setError(null);
    setActiveIndex(null);
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Flowrite
        </h1>
        <p className="mt-1 max-w-2xl text-slate-600">
          Feedback for advanced English writers — coherence, structure, clarity,
          information flow, word choice, connectors, articles, and prepositions.
          Not grammar drills, accent, or sounding native.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="flex flex-col gap-6">
          <AnalyzeForm
            value={input}
            onChange={setInput}
            onSubmit={analyze}
            loading={loading}
            maxChars={MAX_CHARS}
          />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {result && (
            <div className="flex flex-col gap-6">
              <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-sm font-semibold text-slate-700">
                  Your text
                </h2>
                <HighlightedText
                  original={analyzed}
                  issues={result.issues}
                  activeIndex={activeIndex}
                  onActivate={setActiveIndex}
                />
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold text-slate-700">
                  Issues{" "}
                  <span className="font-normal text-slate-400">
                    ({result.issues.length})
                  </span>
                </h2>
                {result.issues.length === 0 ? (
                  <p className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                    No issues found — this reads clearly and coherently.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {result.issues.map((issue, i) => (
                      <IssueCard
                        key={i}
                        issue={issue}
                        index={i}
                        active={activeIndex === i}
                        onActivate={setActiveIndex}
                      />
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h2 className="mb-3 text-sm font-semibold text-slate-700">
                  Rewrites
                </h2>
                <VersionPanel
                  correctedVersion={result.correctedVersion}
                  naturalVersion={result.naturalVersion}
                  naturalNote={result.naturalNote}
                />
              </section>
            </div>
          )}
        </div>

        <HistoryList
          entries={history}
          onSelect={selectHistory}
          onRemove={(id) => setHistory(removeHistory(id))}
          onClear={() => setHistory(clearHistory())}
        />
      </div>
    </main>
  );
}
