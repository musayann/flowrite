import { describe, expect, it } from "vitest";
import { CATEGORY_STYLES } from "@/lib/categories";
import { CATEGORIES } from "@/lib/schema";
import { SYSTEM_PROMPT } from "@/lib/prompt";

describe("CATEGORY_STYLES", () => {
  it("styles exactly the categories the schema allows", () => {
    // A category without a style is a runtime TypeError in HighlightedText
    // and IssueCard, which read CATEGORY_STYLES[issue.category] unguarded.
    expect(Object.keys(CATEGORY_STYLES).sort()).toEqual([...CATEGORIES].sort());
  });

  it.each(CATEGORIES)("gives %s a non-empty label, mark and badge", (category) => {
    const style = CATEGORY_STYLES[category];
    expect(style.label).toBeTruthy();
    expect(style.mark).toBeTruthy();
    expect(style.badge).toBeTruthy();
  });
});

describe("SYSTEM_PROMPT", () => {
  it.each(CATEGORIES)("tells the model about the %s category", (category) => {
    // Structured Outputs constrains the model to CATEGORIES, so any schema
    // category the prompt never mentions is one the model won't reach for.
    expect(SYSTEM_PROMPT).toContain(category);
  });

  it("asks for British English", () => {
    expect(SYSTEM_PROMPT).toMatch(/British English \(en-GB\)/);
  });

  it("names every field the schema requires", () => {
    for (const field of [
      "issues",
      "correctedVersion",
      "naturalVersion",
      "naturalNote",
      "excerpt",
      "category",
      "explanation",
      "rule",
    ]) {
      expect(SYSTEM_PROMPT).toContain(field);
    }
  });
});
