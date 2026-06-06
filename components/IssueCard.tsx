"use client";

import type { Issue } from "@/lib/schema";
import { CATEGORY_STYLES } from "@/lib/categories";

type Props = {
  issue: Issue;
  index: number;
  active: boolean;
  onActivate: (index: number | null) => void;
};

export default function IssueCard({ issue, index, active, onActivate }: Props) {
  const style = CATEGORY_STYLES[issue.category];

  return (
    <li
      id={`issue-${index}`}
      onMouseEnter={() => onActivate(index)}
      onMouseLeave={() => onActivate(null)}
      className={`rounded-lg border bg-white p-4 shadow-sm transition ${
        active ? "border-slate-900/40 ring-2 ring-slate-900/20" : "border-slate-200"
      }`}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}
        >
          {style.label}
        </span>
        <span className="truncate font-mono text-sm text-slate-600">
          “{issue.excerpt}”
        </span>
      </div>
      <p className="text-sm text-slate-800">{issue.explanation}</p>
      <p className="mt-2 border-l-2 border-slate-300 pl-3 text-sm text-slate-600">
        <span className="font-medium text-slate-700">Rule: </span>
        {issue.rule}
      </p>
    </li>
  );
}
