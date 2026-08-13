"use client";

import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import AnalyzeForm from "@/components/AnalyzeForm";
import HighlightedText from "@/components/HighlightedText";
import IssueCard from "@/components/IssueCard";
import VersionPanel from "@/components/VersionPanel";
import HistoryList from "@/components/HistoryList";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MAX_CHARS } from "@/lib/constants";
import type { AnalysisResult } from "@/lib/schema";
import {
  addHistory,
  loadHistory,
  removeHistory,
  type HistoryEntry,
} from "@/lib/history";

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
        <h1 className="text-3xl font-bold tracking-tight">
          Sharpen your sentences
        </h1>
        <p className="mt-1 max-w-2xl text-muted-foreground">
          Paste a paragraph and see what a careful reader would stumble over:
          the order of your ideas, a connector doing the wrong job, a
          preposition that sits slightly off. It assumes your English is already
          good, so you won&rsquo;t get grammar drills.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardContent>
              <AnalyzeForm
                value={input}
                onChange={setInput}
                onSubmit={analyze}
                loading={loading}
                maxChars={MAX_CHARS}
              />
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Couldn’t analyse</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="flex flex-col gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-muted-foreground">
                    Your text
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <HighlightedText
                    original={analyzed}
                    issues={result.issues}
                    activeIndex={activeIndex}
                    onActivate={setActiveIndex}
                  />
                </CardContent>
              </Card>

              <section>
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
                  Issues{" "}
                  <span className="font-normal">
                    ({result.issues.length})
                  </span>
                </h2>
                {result.issues.length === 0 ? (
                  <Alert>
                    <AlertTitle>No issues found</AlertTitle>
                    <AlertDescription>
                      This reads clearly and coherently.
                    </AlertDescription>
                  </Alert>
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
                <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
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
        />
      </div>
    </main>
  );
}
