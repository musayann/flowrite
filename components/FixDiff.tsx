import type { Category } from "@/lib/schema";
import type { Fix } from "@/lib/fixes";
import { CATEGORY_STYLES } from "@/lib/categories";
import { cn } from "@/lib/utils";
import {
  INSERTED_CLASS,
  REMOVED_CLASS,
  wrapCore,
} from "@/components/diff-marks";

type Props = {
  fix: Fix;
  category: Category;
};

const LABEL =
  "text-xs font-medium tracking-wide text-muted-foreground uppercase";

/**
 * Just the words an issue's fix touches: removed words struck through on the
 * Before line and added words highlighted on the After line. `<del>` and
 * `<ins>` carry the change for assistive tech, not just the colour.
 */
export default function FixDiff({ fix, category }: Props) {
  const mark = CATEGORY_STYLES[category].mark;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className={LABEL}>Before</p>
        <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {fix.before.map((part, i) => {
            const highlight = part.highlight ? `rounded-sm ${mark}` : undefined;
            if (part.kind === "removed") {
              return (
                <span key={i}>
                  {wrapCore(part.text, (core) => (
                    <del className={cn(REMOVED_CLASS, highlight)}>
                      {core}
                    </del>
                  ))}
                </span>
              );
            }
            return highlight ? (
              <mark key={i} className={highlight}>
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            );
          })}
        </p>
      </div>
      <div>
        <p className={LABEL}>After</p>
        <p className="mt-1 text-sm leading-relaxed break-words whitespace-pre-wrap">
          {fix.after.map((part, i) => (
            <span key={i}>
              {part.kind === "added"
                ? wrapCore(part.text, (core) => (
                    <ins className={INSERTED_CLASS}>{core}</ins>
                  ))
                : part.text}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
