"use client";

import { Trash2 } from "lucide-react";
import type { HistoryEntry } from "@/lib/history";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type Props = {
  entries: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

export default function HistoryList({
  entries,
  onSelect,
  onRemove,
  onClear,
}: Props) {
  return (
    <Card className="gap-3 lg:sticky lg:top-20">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">History</CardTitle>
        {entries.length > 0 && (
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={onClear}
            >
              Clear
            </Button>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
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
                    onClick={() => onSelect(entry)}
                    className="flex-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-accent"
                  >
                    <span className="line-clamp-2">{entry.input}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {entry.result.issues.length} issue
                      {entry.result.issues.length === 1 ? "" : "s"} ·{" "}
                      {new Date(entry.createdAt).toLocaleString()}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Remove from history"
                    onClick={() => onRemove(entry.id)}
                    className="mt-1 size-7 opacity-0 transition group-hover:opacity-100"
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
