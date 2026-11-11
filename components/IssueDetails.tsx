import { Lightbulb } from "lucide-react";
import type { Issue } from "@/lib/schema";
import type { Fix } from "@/lib/fixes";
import FixDiff from "@/components/FixDiff";

type Props = {
  issue: Issue;
  /** What the minimal correction changed for this issue, if anything. */
  fix?: Fix | null;
};

/**
 * The body of an issue's note, in the order you act on it: the fix, then why
 * it was needed, then the rule to take away.
 */
export default function IssueDetails({ issue, fix }: Props) {
  return (
    <>
      {fix && <FixDiff fix={fix} />}
      <p className="text-[15px] leading-relaxed">{issue.explanation}</p>
      <div className="flex gap-2.5 rounded-[10px] bg-stone-100 px-3.5 py-3 dark:bg-stone-500/15">
        <Lightbulb
          aria-hidden="true"
          className="mt-px size-[18px] flex-none text-stone-600 dark:text-stone-300"
        />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
            Remember
          </span>
          <span className="text-sm leading-[1.55] text-stone-900 dark:text-stone-100">
            {issue.rule}
          </span>
        </div>
      </div>
    </>
  );
}
