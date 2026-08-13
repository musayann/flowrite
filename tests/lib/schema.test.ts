import { describe, expect, it } from "vitest";
import { zodResponseFormat } from "openai/helpers/zod";
import { AnalysisResult, CATEGORIES, Category, Issue } from "@/lib/schema";
import { makeIssue, makeResult } from "../fixtures";

describe("Issue", () => {
  it("accepts a well-formed issue", () => {
    expect(Issue.safeParse(makeIssue()).success).toBe(true);
  });

  it.each([
    ["an unknown category", { category: "vibes" }],
    ["a non-integer start", { start: 1.5 }],
    ["a non-integer end", { end: 2.5 }],
    ["a non-string excerpt", { excerpt: 42 }],
  ])("rejects %s", (_label, override) => {
    expect(Issue.safeParse({ ...makeIssue(), ...override }).success).toBe(false);
  });

  it.each(["excerpt", "start", "end", "category", "explanation", "rule"])(
    "requires %s",
    (field) => {
      const issue: Record<string, unknown> = { ...makeIssue() };
      delete issue[field];
      expect(Issue.safeParse(issue).success).toBe(false);
    },
  );
});

describe("Category", () => {
  it.each(CATEGORIES)("accepts %s", (category) => {
    expect(Category.parse(category)).toBe(category);
  });

  it("has no duplicate members", () => {
    expect(new Set(CATEGORIES).size).toBe(CATEGORIES.length);
  });
});

describe("AnalysisResult", () => {
  it("accepts a result with no issues", () => {
    expect(AnalysisResult.safeParse(makeResult()).success).toBe(true);
  });

  it("accepts a result carrying issues", () => {
    const parsed = AnalysisResult.safeParse(
      makeResult({ issues: [makeIssue(), makeIssue({ category: "connector" })] }),
    );
    expect(parsed.success).toBe(true);
  });

  it("rejects a result whose issues are invalid", () => {
    const result = makeResult({
      issues: [{ ...makeIssue(), category: "nope" } as never],
    });
    expect(AnalysisResult.safeParse(result).success).toBe(false);
  });

  it.each(["issues", "correctedVersion", "naturalVersion", "naturalNote"])(
    "requires %s",
    (field) => {
      const result: Record<string, unknown> = { ...makeResult() };
      delete result[field];
      expect(AnalysisResult.safeParse(result).success).toBe(false);
    },
  );
});

describe("structured-output wiring", () => {
  it("converts to a strict OpenAI json_schema payload", () => {
    const format = zodResponseFormat(AnalysisResult, "analysis");
    expect(format.type).toBe("json_schema");
    expect(format.json_schema.name).toBe("analysis");
    expect(format.json_schema.strict).toBe(true);

    const schema = format.json_schema.schema as {
      properties: Record<string, unknown>;
      required: string[];
    };
    expect(Object.keys(schema.properties).sort()).toEqual([
      "correctedVersion",
      "issues",
      "naturalNote",
      "naturalVersion",
    ]);
    expect(schema.required.sort()).toEqual([
      "correctedVersion",
      "issues",
      "naturalNote",
      "naturalVersion",
    ]);
  });

  it("constrains category to exactly the CATEGORIES enum", () => {
    const format = zodResponseFormat(AnalysisResult, "analysis");
    const json = JSON.stringify(format.json_schema.schema);
    // The enum must reach the model, or it can invent categories we can't style.
    expect(json).toContain(JSON.stringify([...CATEGORIES]));
  });
});
