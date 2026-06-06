"use client";

import type { Issue } from "@/lib/schema";
import { CATEGORY_STYLES } from "@/lib/categories";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type Props = {
  issue: Issue;
  index: number;
  active: boolean;
  onActivate: (index: number | null) => void;
};

export default function IssueCard({ issue, index, active, onActivate }: Props) {
  const style = CATEGORY_STYLES[issue.category];

  return (
    <Card
      id={`issue-${index}`}
      onMouseEnter={() => onActivate(index)}
      onMouseLeave={() => onActivate(null)}
      className={`scroll-mt-20 gap-3 py-4 transition ${
        active ? "ring-2 ring-ring" : ""
      }`}
    >
      <CardHeader className="px-4">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}
          >
            {style.label}
          </span>
          <span className="truncate font-mono text-sm text-muted-foreground">
            “{issue.excerpt}”
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-sm">{issue.explanation}</p>
        <p className="mt-2 border-l-2 pl-3 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Rule: </span>
          {issue.rule}
        </p>
      </CardContent>
    </Card>
  );
}
