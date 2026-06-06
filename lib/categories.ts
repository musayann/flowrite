import type { Category } from "./schema";

/**
 * Shared presentation for each issue category, so a category reads the same
 * in the highlighted text (the `mark` background) and on its issue card badge.
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
    mark: "bg-rose-200 text-rose-950",
    badge: "bg-rose-100 text-rose-800 ring-rose-200",
  },
  "information-flow": {
    label: "Information flow",
    mark: "bg-orange-200 text-orange-950",
    badge: "bg-orange-100 text-orange-800 ring-orange-200",
  },
  structure: {
    label: "Structure",
    mark: "bg-amber-200 text-amber-950",
    badge: "bg-amber-100 text-amber-800 ring-amber-200",
  },
  "word-choice": {
    label: "Word choice",
    mark: "bg-violet-200 text-violet-950",
    badge: "bg-violet-100 text-violet-800 ring-violet-200",
  },
  connector: {
    label: "Connector",
    mark: "bg-sky-200 text-sky-950",
    badge: "bg-sky-100 text-sky-800 ring-sky-200",
  },
  article: {
    label: "Article",
    mark: "bg-emerald-200 text-emerald-950",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  },
  preposition: {
    label: "Preposition",
    mark: "bg-teal-200 text-teal-950",
    badge: "bg-teal-100 text-teal-800 ring-teal-200",
  },
  clarity: {
    label: "Clarity",
    mark: "bg-fuchsia-200 text-fuchsia-950",
    badge: "bg-fuchsia-100 text-fuchsia-800 ring-fuchsia-200",
  },
};
