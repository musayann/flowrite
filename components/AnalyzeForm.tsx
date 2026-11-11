"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  maxChars: number;
};

export default function AnalyzeForm({
  value,
  onChange,
  onSubmit,
  loading,
  maxChars,
}: Props) {
  const tooLong = value.length > maxChars;
  const canSubmit = value.trim().length > 0 && !tooLong && !loading;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit();
      }}
      className="overflow-hidden rounded-[14px] border bg-card shadow-[0_1px_2px_rgba(0,0,0,0.04),0_8px_24px_rgba(0,0,0,0.04)] transition-shadow focus-within:ring-3 focus-within:ring-ring/30"
    >
      <label
        htmlFor="compose-text"
        className="block px-5 pt-4 text-[13px] font-semibold text-muted-foreground"
      >
        Your text
      </label>
      <Textarea
        id="compose-text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Paste a sentence or short paragraph…"
        rows={7}
        className="min-h-48 resize-y rounded-none border-0 bg-transparent px-5 pt-2.5 pb-5 text-lg leading-[1.8] focus-visible:ring-0 md:text-lg dark:bg-transparent"
      />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 bg-muted/40 py-3 pr-4 pl-5">
        <span
          className={`text-[13px] ${tooLong ? "text-destructive" : "text-muted-foreground"}`}
        >
          {value.length}/{maxChars} characters
          <span className="hidden sm:inline"> · ⌘/Ctrl + Enter to analyse</span>
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-3.5"
            onClick={() => onChange("")}
            disabled={value.length === 0 || loading}
          >
            Clear
          </Button>
          <Button type="submit" className="h-10 px-4.5" disabled={!canSubmit}>
            {loading && <Loader2 className="animate-spin" />}
            {loading ? "Analysing…" : "Analyse"}
          </Button>
        </div>
      </div>
    </form>
  );
}
