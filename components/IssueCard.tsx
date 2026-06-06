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
      className={`scroll-mt-20 gap-3 py-4 transition ${active ? "ring-2 ring-ring" : ""
        }`}
    >
      <CardHeader className="px-4">
        <div className="flex flex-col md:flex-row md:items-center gap-2">
          <div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}
            >
              {style.label}
            </span>
          </div>
          <div className="font-mono text-sm text-muted-foreground">
            “{issue.excerpt}”
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-4">
        <p className="text-sm leading-relaxed">{issue.explanation}</p>
        <div className="mt-3 border-l-2 pl-3">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Rule
          </p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">
            {issue.rule}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
