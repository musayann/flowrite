"use client";

import { useState } from "react";
import { Pencil, Sparkles } from "lucide-react";
import type { AnalysisResult, Issue } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CopyButton from "@/components/CopyButton";
import HighlightedText from "@/components/HighlightedText";
import ChangesText from "@/components/ChangesText";
import { INSERTED_CLASS, REMOVED_CLASS } from "@/components/diff-marks";

type Reading = "original" | "corrected" | "natural";

type Props = {
  /** The text that was analysed. */
  original: string;
  result: AnalysisResult;
  /** `result.issues` in reading order: issue `i` is numbered `i + 1`. */
  issues: Issue[];
  openIndex: number | null;
  onPick: (index: number) => void;
  /** Which issues to mark in the text. */
  shown: (index: number) => boolean;
  /** Go back to the form with this text in it. */
  onEdit: () => void;
  className?: string;
};

const FOOTER: Record<Reading, string> = {
  original:
    "Select a number to open its note. Switch to Corrected to see every change.",
  corrected: "Minimal corrections only: your wording is kept wherever it works.",
  natural: "A freer rewrite. Copy it as it is, or use it as a model.",
};

const PROSE =
  "max-w-[64ch] text-lg leading-loose text-pretty sm:text-xl";

const PANEL = "px-5 pt-7 pb-7 sm:px-11 sm:pt-9 sm:pb-8";

/**
 * The text, once, in three readings: the original with its issues marked, the
 * minimal correction (with or without its changes shown), and a more natural
 * rewrite.
 */
export default function ReviewDocument({
  original,
  result,
  issues,
  openIndex,
  onPick,
  shown,
  onEdit,
  className,
}: Props) {
  const [reading, setReading] = useState<Reading>("original");
  const [showChanges, setShowChanges] = useState(true);

  const text: Record<Reading, string> = {
    original,
    corrected: result.correctedVersion,
    natural: result.naturalVersion,
  };

  return (
    <section
      aria-label="Your text"
      className={cn(
        "overflow-hidden rounded-[14px] border bg-card text-card-foreground shadow-xs",
        className,
      )}
    >
      <Tabs
        value={reading}
        onValueChange={(value) => setReading(value as Reading)}
        className="gap-0"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <TabsList className="h-auto rounded-[10px] p-[3px] group-data-horizontal/tabs:h-auto">
            <TabsTrigger value="original" className="h-8 px-3.5 text-[13px]">
              Original
            </TabsTrigger>
            <TabsTrigger value="corrected" className="h-8 px-3.5 text-[13px]">
              Corrected
            </TabsTrigger>
            <TabsTrigger value="natural" className="h-8 px-3.5 text-[13px]">
              More natural
            </TabsTrigger>
          </TabsList>
          <div className="flex items-center gap-1">
            {reading === "corrected" && (
              <div className="flex h-8 items-center gap-2 px-2.5">
                <Switch
                  id="show-changes"
                  size="sm"
                  checked={showChanges}
                  onCheckedChange={setShowChanges}
                />
                <label
                  htmlFor="show-changes"
                  className="cursor-pointer text-[13px] font-medium"
                >
                  Show changes
                </label>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={onEdit}>
              <Pencil />
              Edit
            </Button>
            <CopyButton text={text[reading]} />
          </div>
        </div>

        <TabsContent value="original" className={PANEL}>
          <HighlightedText
            original={original}
            issues={issues}
            openIndex={openIndex}
            onPick={onPick}
            shown={shown}
            className={PROSE}
          />
        </TabsContent>

        <TabsContent value="corrected" className={cn(PANEL, "flex flex-col gap-6")}>
          {showChanges ? (
            <>
              <ChangesText
                original={original}
                corrected={result.correctedVersion}
                issues={issues}
                openIndex={openIndex}
                onPick={onPick}
                shown={shown}
                className={PROSE}
              />
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
                <span className="flex items-center gap-2">
                  <del className={cn(REMOVED_CLASS, "text-sm")}>removed</del>
                  words the correction took out
                </span>
                <span className="flex items-center gap-2">
                  <ins className={cn(INSERTED_CLASS, "px-1 py-px text-sm")}>
                    added
                  </ins>
                  words it put in
                </span>
                <span>
                  Turn off “Show changes” to read or copy the clean version.
                </span>
              </div>
            </>
          ) : (
            <p className={cn(PROSE, "whitespace-pre-wrap")}>
              {result.correctedVersion}
            </p>
          )}
        </TabsContent>

        <TabsContent value="natural" className={cn(PANEL, "flex flex-col gap-7")}>
          <p className={cn(PROSE, "whitespace-pre-wrap")}>
            {result.naturalVersion}
          </p>
          {result.naturalNote && (
            <div className="flex max-w-[64ch] gap-3 rounded-[10px] bg-emerald-50 px-4 py-3.5 dark:bg-emerald-500/10">
              <Sparkles
                aria-hidden="true"
                className="mt-0.5 size-[18px] flex-none text-emerald-700 dark:text-emerald-300"
              />
              <div className="flex flex-col gap-0.5">
                <p className="text-xs font-semibold tracking-[0.04em] text-emerald-800 uppercase dark:text-emerald-300">
                  What changed
                </p>
                <p className="text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
                  {result.naturalNote}
                </p>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 px-5 py-3 text-[13px] text-muted-foreground">
        <span>{FOOTER[reading]}</span>
        <span>{text[reading].length} characters</span>
      </div>
    </section>
  );
}
