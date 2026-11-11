import type { Category } from "./schema";

/**
 * Shared presentation for each issue category, so a category reads the same
 * wherever it appears: the underline and numbered marker in the text, the
 * label and open state of its note, and the dots on filters and history.
 * Every class is a full static string (Tailwind can't see built-up names), and
 * each carries `dark:` variants so it stays legible in dark mode.
 */
type CategoryStyle = {
  label: string;
  /** A small swatch: filter chips, "What it looks at", history entries. */
  dot: string;
  /** Underline colour for the excerpt in the original text. */
  underline: string;
  /** Background and text of the numbered marker. */
  number: string;
  /** The category label on a note. */
  text: string;
  /** Background for the excerpt while its note is open. */
  tint: string;
  /** Border and ring for an open note. */
  active: string;
};

export const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  coherence: {
    label: "Coherence",
    dot: "bg-rose-500",
    underline: "decoration-rose-500",
    number: "bg-rose-700 text-white dark:bg-rose-400 dark:text-rose-950",
    text: "text-rose-800 dark:text-rose-300",
    tint: "bg-rose-100 dark:bg-rose-500/20",
    active: "border-rose-300 ring-3 ring-rose-500/20 dark:border-rose-500/50",
  },
  "information-flow": {
    label: "Information flow",
    dot: "bg-orange-500",
    underline: "decoration-orange-500",
    number: "bg-orange-700 text-white dark:bg-orange-400 dark:text-orange-950",
    text: "text-orange-800 dark:text-orange-300",
    tint: "bg-orange-100 dark:bg-orange-500/20",
    active:
      "border-orange-300 ring-3 ring-orange-500/20 dark:border-orange-500/50",
  },
  structure: {
    label: "Structure",
    dot: "bg-amber-500",
    underline: "decoration-amber-500",
    number: "bg-amber-700 text-white dark:bg-amber-400 dark:text-amber-950",
    text: "text-amber-800 dark:text-amber-300",
    tint: "bg-amber-100 dark:bg-amber-500/20",
    active: "border-amber-300 ring-3 ring-amber-500/20 dark:border-amber-500/50",
  },
  "word-choice": {
    label: "Word choice",
    dot: "bg-violet-500",
    underline: "decoration-violet-500",
    number: "bg-violet-700 text-white dark:bg-violet-400 dark:text-violet-950",
    text: "text-violet-800 dark:text-violet-300",
    tint: "bg-violet-100 dark:bg-violet-500/20",
    active:
      "border-violet-300 ring-3 ring-violet-500/20 dark:border-violet-500/50",
  },
  connector: {
    label: "Connector",
    dot: "bg-sky-500",
    underline: "decoration-sky-500",
    number: "bg-sky-700 text-white dark:bg-sky-400 dark:text-sky-950",
    text: "text-sky-800 dark:text-sky-300",
    tint: "bg-sky-100 dark:bg-sky-500/20",
    active: "border-sky-300 ring-3 ring-sky-500/20 dark:border-sky-500/50",
  },
  article: {
    label: "Article",
    dot: "bg-emerald-500",
    underline: "decoration-emerald-500",
    number:
      "bg-emerald-700 text-white dark:bg-emerald-400 dark:text-emerald-950",
    text: "text-emerald-800 dark:text-emerald-300",
    tint: "bg-emerald-100 dark:bg-emerald-500/20",
    active:
      "border-emerald-300 ring-3 ring-emerald-500/20 dark:border-emerald-500/50",
  },
  preposition: {
    label: "Preposition",
    dot: "bg-teal-500",
    underline: "decoration-teal-500",
    number: "bg-teal-700 text-white dark:bg-teal-400 dark:text-teal-950",
    text: "text-teal-800 dark:text-teal-300",
    tint: "bg-teal-100 dark:bg-teal-500/20",
    active: "border-teal-300 ring-3 ring-teal-500/20 dark:border-teal-500/50",
  },
  clarity: {
    label: "Clarity",
    dot: "bg-fuchsia-500",
    underline: "decoration-fuchsia-500",
    number:
      "bg-fuchsia-700 text-white dark:bg-fuchsia-400 dark:text-fuchsia-950",
    text: "text-fuchsia-800 dark:text-fuchsia-300",
    tint: "bg-fuchsia-100 dark:bg-fuchsia-500/20",
    active:
      "border-fuchsia-300 ring-3 ring-fuchsia-500/20 dark:border-fuchsia-500/50",
  },
};
