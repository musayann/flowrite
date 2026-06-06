"use client";

import type { HistoryEntry } from "@/lib/history";

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
    <aside className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">History</h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="text-xs text-slate-400 hover:text-slate-700"
          >
            Clear
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <p className="text-xs text-slate-400">
          Your recent analyses will appear here (saved in this browser).
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id} className="group flex items-start gap-2">
              <button
                type="button"
                onClick={() => onSelect(entry)}
                className="flex-1 rounded-md px-2 py-1.5 text-left text-sm text-slate-700 hover:bg-slate-100"
              >
                <span className="line-clamp-2">{entry.input}</span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  {entry.result.issues.length} issue
                  {entry.result.issues.length === 1 ? "" : "s"} ·{" "}
                  {new Date(entry.createdAt).toLocaleString()}
                </span>
              </button>
              <button
                type="button"
                aria-label="Remove from history"
                onClick={() => onRemove(entry.id)}
                className="mt-1 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-500"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
