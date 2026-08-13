import { describe, expect, it } from "vitest";
import { resolveHighlights } from "@/lib/highlight";
import { makeIssue } from "../fixtures";

const TEXT = "The cat sat";
//            0123456789..  "The"=0-3, "cat"=4-7, "sat"=8-11

describe("resolveHighlights", () => {
  describe("degenerate input", () => {
    it("returns no segments for empty text", () => {
      expect(resolveHighlights("", [])).toEqual([]);
    });

    it("returns the whole text as one unflagged segment when there are no issues", () => {
      expect(resolveHighlights(TEXT, [])).toEqual([
        { text: TEXT, issueIndex: null },
      ]);
    });

    it("drops an issue with an empty excerpt", () => {
      const segments = resolveHighlights(TEXT, [makeIssue({ excerpt: "" })]);
      expect(segments).toEqual([{ text: TEXT, issueIndex: null }]);
    });

    it("drops an excerpt that does not occur in the text, leaving others intact", () => {
      const segments = resolveHighlights(TEXT, [
        makeIssue({ excerpt: "zebra", start: 0, end: 5 }),
        makeIssue({ excerpt: "cat", start: 4, end: 7 }),
      ]);
      expect(segments).toEqual([
        { text: "The ", issueIndex: null },
        { text: "cat", issueIndex: 1 },
        { text: " sat", issueIndex: null },
      ]);
    });
  });

  describe("trusting model offsets", () => {
    it("uses start/end when they match the excerpt exactly", () => {
      // "a" occurs at 0 and 2; trusting the offsets must pick the second.
      const segments = resolveHighlights("aXa", [
        makeIssue({ excerpt: "a", start: 2, end: 3 }),
      ]);
      expect(segments).toEqual([
        { text: "aX", issueIndex: null },
        { text: "a", issueIndex: 0 },
      ]);
    });

    it.each([
      ["a negative start", { start: -1, end: 3 }],
      ["a non-integer start", { start: 2.5, end: 3 }],
      ["a non-integer end", { start: 2, end: 3.5 }],
      ["an end past the text length", { start: 2, end: 99 }],
      ["start equal to end", { start: 2, end: 2 }],
      ["start after end", { start: 3, end: 2 }],
      ["offsets that don't match the excerpt", { start: 1, end: 2 }],
    ])("falls back to a substring search given %s", (_label, offsets) => {
      // Search always finds the *first* occurrence, at index 0, so a result of
      // index 0 proves the offsets were rejected.
      const segments = resolveHighlights("aXa", [
        makeIssue({ excerpt: "a", ...offsets }),
      ]);
      expect(segments).toEqual([
        { text: "a", issueIndex: 0 },
        { text: "Xa", issueIndex: null },
      ]);
    });
  });

  describe("repeated and overlapping excerpts", () => {
    it("gives two issues with the same excerpt successive occurrences", () => {
      const segments = resolveHighlights("cat and cat", [
        makeIssue({ excerpt: "cat", start: 0, end: 3 }),
        makeIssue({ excerpt: "cat", start: 0, end: 3 }),
      ]);
      expect(segments).toEqual([
        { text: "cat", issueIndex: 0 },
        { text: " and ", issueIndex: null },
        { text: "cat", issueIndex: 1 },
      ]);
    });

    it("keeps the earlier-listed issue when two ranges overlap and drops the later", () => {
      const segments = resolveHighlights(TEXT, [
        makeIssue({ excerpt: "cat sat", start: 4, end: 11 }),
        makeIssue({ excerpt: "cat", start: 4, end: 7 }),
      ]);
      expect(segments).toEqual([
        { text: "The ", issueIndex: null },
        { text: "cat sat", issueIndex: 0 },
      ]);
    });
  });

  describe("segment assembly", () => {
    it("orders segments by position, not by issue order", () => {
      const segments = resolveHighlights(TEXT, [
        makeIssue({ excerpt: "sat", start: 8, end: 11 }),
        makeIssue({ excerpt: "The", start: 0, end: 3 }),
      ]);
      expect(segments).toEqual([
        { text: "The", issueIndex: 1 },
        { text: " cat ", issueIndex: null },
        { text: "sat", issueIndex: 0 },
      ]);
    });

    it("emits no empty gap between adjacent ranges", () => {
      const segments = resolveHighlights("abcd", [
        makeIssue({ excerpt: "ab", start: 0, end: 2 }),
        makeIssue({ excerpt: "cd", start: 2, end: 4 }),
      ]);
      expect(segments).toEqual([
        { text: "ab", issueIndex: 0 },
        { text: "cd", issueIndex: 1 },
      ]);
      expect(segments.every((s) => s.text.length > 0)).toBe(true);
    });

    it("appends the trailing remainder after the last range", () => {
      const segments = resolveHighlights(TEXT, [
        makeIssue({ excerpt: "The", start: 0, end: 3 }),
      ]);
      expect(segments.at(-1)).toEqual({ text: " cat sat", issueIndex: null });
    });

    it("always reconstructs the original text exactly", () => {
      const segments = resolveHighlights(TEXT, [
        makeIssue({ excerpt: "sat", start: 8, end: 11 }),
        makeIssue({ excerpt: "The", start: 0, end: 3 }),
        makeIssue({ excerpt: "zebra", start: 0, end: 5 }),
      ]);
      expect(segments.map((s) => s.text).join("")).toBe(TEXT);
    });
  });
});
