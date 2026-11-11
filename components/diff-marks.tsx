import type { ReactNode } from "react";

/**
 * How text added by a correction looks, wherever a fix is shown: the After
 * line of an issue card and the corrected version under the user's text.
 */
export const INSERTED_CLASS =
  "rounded-sm bg-emerald-100 text-emerald-900 no-underline dark:bg-emerald-500/20 dark:text-emerald-100";

/**
 * How text removed by a correction looks, wherever a fix is shown: the Before
 * line of an issue card and the user's own text. Inside an issue highlight,
 * the highlight's text colour takes over from the muted one.
 */
export const REMOVED_CLASS = "text-muted-foreground decoration-2";

/**
 * Wrap only the non-whitespace core of `text`, so a strikethrough or
 * highlight doesn't run on into the spaces around a word.
 */
export function wrapCore(
  text: string,
  wrap: (core: string) => ReactNode,
): ReactNode {
  const [, lead, core, trail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(text)!;
  if (!core) return text;
  return (
    <>
      {lead}
      {wrap(core)}
      {trail}
    </>
  );
}
