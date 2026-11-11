import type { Fix } from "@/lib/fixes";
import {
  INSERTED_CLASS,
  REMOVED_CLASS,
  wrapCore,
} from "@/components/diff-marks";

const LABEL =
  "pt-[3px] text-[11px] font-semibold tracking-[0.05em] text-muted-foreground uppercase";

const LINE = "min-w-0 break-words whitespace-pre-wrap";

/**
 * Just the words an issue's fix touches, as two lines in one box: removed
 * words struck through on Before, added words highlighted on After. `<del>`
 * and `<ins>` carry the change for assistive tech, not just the colour.
 */
export default function FixDiff({ fix }: { fix: Fix }) {
  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-y-2 rounded-[10px] border border-border/60 bg-muted/50 px-3.5 py-3 text-[15px] leading-normal">
      <span className={LABEL}>Before</span>
      <span className={LINE}>
        {fix.before.map((part, i) => (
          <span key={i}>
            {part.kind === "removed"
              ? wrapCore(part.text, (core) => (
                  <del className={REMOVED_CLASS}>{core}</del>
                ))
              : part.text}
          </span>
        ))}
      </span>
      <span className={LABEL}>After</span>
      <span className={LINE}>
        {fix.after.map((part, i) => (
          <span key={i}>
            {part.kind === "added"
              ? wrapCore(part.text, (core) => (
                  <ins className={`${INSERTED_CLASS} px-[3px] py-px`}>
                    {core}
                  </ins>
                ))
              : part.text}
          </span>
        ))}
      </span>
    </div>
  );
}
