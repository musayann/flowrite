import type { Category } from "./schema";

/**
 * Shared presentation for each issue category, so a category reads the same
 * in the highlighted text (the `mark` background) and on its issue card badge.
 * Each style carries `dark:` variants so highlights stay legible in dark mode.
 */
type CategoryStyle = {
  label: string;
  /** Background + text for the inline highlight `mark`. */
  mark: string;
  /** Badge classes for the issue card. */
  badge: string;
};

export const CATEGORY_STYLES: Record<Category, CategoryStyle> = {
  coherence: {
    label: "Coherence",
    mark: "bg-rose-200 text-rose-950 dark:bg-rose-500/25 dark:text-rose-100",
    badge:
      "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-500/15 dark:text-rose-200 dark:ring-rose-500/30",
  },
  "information-flow": {
    label: "Information flow",
    mark: "bg-orange-200 text-orange-950 dark:bg-orange-500/25 dark:text-orange-100",
    badge:
      "bg-orange-100 text-orange-800 ring-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:ring-orange-500/30",
  },
  structure: {
    label: "Structure",
    mark: "bg-amber-200 text-amber-950 dark:bg-amber-500/25 dark:text-amber-100",
    badge:
      "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:ring-amber-500/30",
  },
  "word-choice": {
    label: "Word choice",
    mark: "bg-violet-200 text-violet-950 dark:bg-violet-500/25 dark:text-violet-100",
    badge:
      "bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-500/15 dark:text-violet-200 dark:ring-violet-500/30",
  },
  connector: {
    label: "Connector",
    mark: "bg-sky-200 text-sky-950 dark:bg-sky-500/25 dark:text-sky-100",
    badge:
      "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/30",
  },
  article: {
    label: "Article",
    mark: "bg-emerald-200 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-100",
    badge:
      "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:ring-emerald-500/30",
  },
  preposition: {
    label: "Preposition",
    mark: "bg-teal-200 text-teal-950 dark:bg-teal-500/25 dark:text-teal-100",
    badge:
      "bg-teal-100 text-teal-800 ring-teal-200 dark:bg-teal-500/15 dark:text-teal-200 dark:ring-teal-500/30",
  },
  clarity: {
    label: "Clarity",
    mark: "bg-fuchsia-200 text-fuchsia-950 dark:bg-fuchsia-500/25 dark:text-fuchsia-100",
    badge:
      "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200 dark:bg-fuchsia-500/15 dark:text-fuchsia-200 dark:ring-fuchsia-500/30",
  },
};
