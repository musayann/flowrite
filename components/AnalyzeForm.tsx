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
      className="flex flex-col gap-3"
    >
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && canSubmit) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder="Paste a sentence or short paragraph…"
        rows={5}
        className="resize-y text-base leading-relaxed"
      />
      <div className="flex items-center justify-between gap-4">
        <span
          className={`text-xs ${tooLong ? "text-destructive" : "text-muted-foreground"}`}
        >
          {value.length}/{maxChars} characters
          <span className="ml-2">· ⌘/Ctrl + Enter to analyse</span>
        </span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange("")}
            disabled={value.length === 0 || loading}
          >
            Clear
          </Button>
          <Button type="submit" disabled={!canSubmit}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Analysing…" : "Analyse"}
          </Button>
        </div>
      </div>
    </form>
  );
}
