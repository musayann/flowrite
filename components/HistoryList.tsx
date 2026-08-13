"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { LOCALE } from "@/lib/constants";
import type { HistoryEntry } from "@/lib/history";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

/** en-GB day/month order and 24-hour clock, regardless of browser locale. */
const timestamp = new Intl.DateTimeFormat(LOCALE, {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatTimestamp(createdAt: number): string {
  return timestamp.format(new Date(createdAt));
}

type Props = {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
};

export default function HistoryList({ entries, onSelect, onRemove }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Card className="gap-3 lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex items-center gap-1.5 lg:pointer-events-none"
          >
            History
            {entries.length > 0 && (
              <span className="font-normal text-muted-foreground">
                ({entries.length})
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform lg:hidden",
                open && "rotate-180",
              )}
            />
          </button>
        </CardTitle>
      </CardHeader>
      <CardContent className={cn("lg:block", open ? "block" : "hidden")}>
        {entries.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Your recent analyses will appear here (saved in this browser).
          </p>
        ) : (
          <ScrollArea className="h-[60vh] pr-3">
            <ul className="flex flex-col gap-1">
              {entries.map((entry) => (
                <li key={entry.id} className="group flex items-start gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSelect(entry);
                      setOpen(false);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="flex-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span className="line-clamp-2">{entry.input}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {entry.result.issues.length} issue
                      {entry.result.issues.length === 1 ? "" : "s"} ·{" "}
                      {formatTimestamp(entry.createdAt)}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove from history"
                    onClick={() => onRemove(entry.id)}
                    className="mt-1 size-7 transition lg:opacity-0 lg:group-hover:opacity-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
