"use client";

import { Trash2, X } from "lucide-react";
import type { HistoryEntry } from "@/lib/history";
import type { Category } from "@/lib/schema";
import { CATEGORY_STYLES } from "@/lib/categories";
import {
  dayGroup,
  formatDateTime,
  formatTime,
  issueCount,
  type DayGroup,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Newest first, as `lib/history` keeps them. */
  entries: HistoryEntry[];
  /** The entry on screen, if any; it is highlighted. */
  currentId: string | null;
  /** The time to group entries against (today, yesterday, earlier). */
  now: number;
  onSelect: (entry: HistoryEntry) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
};

const GROUP_TITLE: Record<DayGroup, string> = {
  today: "Today",
  yesterday: "Yesterday",
  earlier: "Earlier",
};

/** Each category in an entry once, in the order its issues came. */
function categoriesOf(entry: HistoryEntry): Category[] {
  return [...new Set(entry.result.issues.map((issue) => issue.category))];
}

/** Past analyses, kept in this browser, in a drawer from the right. */
export default function HistoryDrawer({
  open,
  onOpenChange,
  entries,
  currentId,
  now,
  onSelect,
  onRemove,
  onClear,
}: Props) {
  const groups = new Map<DayGroup, HistoryEntry[]>();
  for (const entry of entries) {
    const group = dayGroup(entry.createdAt, now);
    groups.set(group, [...(groups.get(group) ?? []), entry]);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 bg-card p-0 sm:max-w-[400px]"
      >
        <SheetHeader className="flex-row items-start justify-between gap-3 border-b border-border/60 px-5 pt-[18px] pb-3.5">
          <div className="flex flex-col gap-0.5">
            <SheetTitle className="text-[17px] font-semibold">History</SheetTitle>
            <SheetDescription className="text-[13px]">
              Saved in this browser only
            </SheetDescription>
          </div>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" aria-label="Close history" className="size-9">
              <X className="size-[18px]" />
            </Button>
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-2.5 pt-2.5 pb-4">
          {entries.length === 0 ? (
            <p className="px-2.5 py-2 text-sm text-muted-foreground">
              Your recent analyses will appear here.
            </p>
          ) : (
            [...groups].map(([group, items]) => (
              <section key={group} aria-label={GROUP_TITLE[group]}>
                <h3 className="mx-2.5 mt-3.5 mb-1 text-xs font-semibold tracking-[0.04em] text-muted-foreground uppercase">
                  {GROUP_TITLE[group]}
                </h3>
                <ul className="flex flex-col gap-0.5">
                  {items.map((entry) => {
                    const current = entry.id === currentId;
                    const when =
                      group === "earlier"
                        ? formatDateTime(entry.createdAt)
                        : formatTime(entry.createdAt);
                    return (
                      <li
                        key={entry.id}
                        className={cn(
                          "flex items-start gap-1 rounded-[10px]",
                          current && "bg-muted",
                        )}
                      >
                        <button
                          type="button"
                          aria-current={current ? "true" : undefined}
                          onClick={() => onSelect(entry)}
                          className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-[10px] px-3 py-2.5 text-left outline-none hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <span className="line-clamp-2 text-sm leading-normal">
                            {entry.input}
                          </span>
                          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span aria-hidden="true" className="flex gap-[3px]">
                              {categoriesOf(entry).map((category) => (
                                <span
                                  key={category}
                                  className={cn(
                                    "size-1.5 rounded-full",
                                    CATEGORY_STYLES[category].dot,
                                  )}
                                />
                              ))}
                            </span>
                            {issueCount(entry.result.issues.length)} · {when}
                          </span>
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Remove from history"
                          onClick={() => onRemove(entry.id)}
                          className="mt-1.5 mr-1 size-9 text-muted-foreground"
                        >
                          <Trash2 className="size-[15px]" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>

        {entries.length > 0 && (
          <SheetFooter className="flex-row justify-end border-t border-border/60 px-4 py-3">
            <Button
              variant="ghost"
              onClick={onClear}
              className="h-9 text-[13px] text-destructive hover:text-destructive"
            >
              Clear history
            </Button>
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  );
}
