import { describe, expect, it } from "vitest";
import {
  correctedParts,
  fixRanges,
  originalSegments,
  resolveFixes,
  type Fix,
  type OriginalSegment,
} from "@/lib/fixes";
import type { DiffPart } from "@/lib/diff";
import { makeIssue } from "../fixtures";

const ORIGINAL =
  "In the other hand the costs raised. Moreover we will discuss about it. She is engineer.";
const CORRECTED =
  "On the other hand, the costs rose. Moreover, we will discuss it. She is an engineer.";

/** Compact rendering: [-removed-], {+added+}, <excerpt>. */
const show = (parts: (DiffPart & { highlight?: boolean })[]) =>
  parts
    .map((p) => {
      const text = p.highlight ? `<${p.text}>` : p.text;
      if (p.kind === "removed") return `[-${text}-]`;
      if (p.kind === "added") return `{+${text}+}`;
      return text;
    })
    .join("");

/** Locate by excerpt only, as most model offsets are unreliable anyway. */
const issue = (excerpt: string) => makeIssue({ excerpt, start: -1, end: -1 });

function fixOf(excerpt: string, original = ORIGINAL, corrected = CORRECTED) {
  return resolveFixes(original, corrected, [issue(excerpt)])[0];
}

const sides = (fix: Fix | null) => fix && [show(fix.before), show(fix.after)];

describe("resolveFixes", () => {
  it("scopes a fix to its excerpt rather than the whole text", () => {
    expect(sides(fixOf("raised"))).toEqual(["[-<raised>-]", "{+rose+}"]);
  });

  it("keeps the unchanged words of the excerpt around the change", () => {
    expect(sides(fixOf("In the other hand"))).toEqual([
      "[-<In>-]< the other hand>",
      "{+On+} the other hand{+,+}",
    ]);
  });

  it("claims punctuation inserted right after the excerpt", () => {
    expect(sides(fixOf("Moreover"))).toEqual(["<Moreover>", "Moreover{+,+}"]);
  });

  it("claims a word inserted right before the excerpt", () => {
    expect(sides(fixOf("engineer"))).toEqual(["<engineer>", "{+an +}engineer"]);
  });

  it("adds a word either side when the whole excerpt is deleted", () => {
    expect(sides(fixOf("about"))).toEqual([
      "discuss [-<about>-][- -]it.",
      "discuss it.",
    ]);
  });

  it("points afterStart/afterEnd at the fix in the corrected text", () => {
    const cases: [string, string][] = [
      ["In the other hand", "On the other hand,"],
      ["raised", "rose"],
      ["about", "discuss it."],
      ["engineer", "an engineer"],
      // The fix leaves "discuss " behind; the highlight stops at the word.
      ["discuss about", "discuss"],
    ];
    for (const [excerpt, expected] of cases) {
      const fix = fixOf(excerpt)!;
      expect(CORRECTED.slice(fix.afterStart, fix.afterEnd)).toBe(expected);
    }
  });

  it("returns null when the correction leaves the excerpt unchanged", () => {
    expect(fixOf("the costs")).toBeNull();
  });

  it("returns null when the excerpt isn't in the text", () => {
    expect(fixOf("not there")).toBeNull();
  });

  it("returns null for every issue when there is nothing to compare", () => {
    expect(resolveFixes("", CORRECTED, [issue("x")])).toEqual([null]);
    expect(resolveFixes(ORIGINAL, "", [issue("raised")])).toEqual([null]);
  });

  it("lines results up with the issues by index", () => {
    const fixes = resolveFixes(ORIGINAL, CORRECTED, [
      issue("not there"),
      issue("raised"),
      issue("the costs"),
    ]);
    expect(fixes[0]).toBeNull();
    expect(sides(fixes[1])).toEqual(["[-<raised>-]", "{+rose+}"]);
    expect(fixes[2]).toBeNull();
  });

  it("treats identical texts as having no fixes", () => {
    expect(resolveFixes(ORIGINAL, ORIGINAL, [issue("raised")])).toEqual([null]);
  });
});

describe("fixRanges", () => {
  it("returns one corrected-text range per fix, sorted by position", () => {
    const fixes = resolveFixes(ORIGINAL, CORRECTED, [
      issue("raised"),
      issue("not there"),
      issue("In the other hand"),
    ]);
    expect(
      fixRanges(fixes).map((r) => [r.issueIndex, CORRECTED.slice(r.start, r.end)]),
    ).toEqual([
      [2, "On the other hand,"],
      [0, "rose"],
    ]);
  });

  const at = (afterStart: number, afterEnd: number): Fix => ({
    before: [],
    after: [],
    afterStart,
    afterEnd,
  });

  it("keeps the earlier issue when two fixes overlap", () => {
    expect(fixRanges([at(5, 10), at(8, 12), at(10, 14)])).toEqual([
      { start: 5, end: 10, issueIndex: 0 },
      { start: 10, end: 14, issueIndex: 2 },
    ]);
  });

  it("skips fixes with nothing left to mark", () => {
    expect(fixRanges([null, at(3, 3)])).toEqual([]);
  });
});

describe("correctedParts", () => {
  const issues = [issue("raised"), issue("In the other hand")];
  const ranges = fixRanges(resolveFixes(ORIGINAL, CORRECTED, issues));
  const parts = correctedParts(ORIGINAL, CORRECTED, ranges);

  it("rebuilds the corrected text", () => {
    expect(parts.map((p) => p.text).join("")).toBe(CORRECTED);
  });

  it("flags only the text the correction added", () => {
    expect(parts.filter((p) => p.added).map((p) => p.text)).toEqual([
      "On",
      ",",
      "rose",
      ",",
      "an ",
    ]);
  });

  it("links each addition to the issue whose fix it falls in", () => {
    expect(
      parts.filter((p) => p.added).map((p) => [p.text, p.issueIndex]),
    ).toEqual([
      ["On", 1],
      [",", 1],
      ["rose", 0],
      [",", null],
      ["an ", null],
    ]);
  });

  it("never links unchanged text", () => {
    expect(parts.filter((p) => !p.added).every((p) => p.issueIndex === null)).toBe(
      true,
    );
  });

  it("returns the corrected text unchanged when there is no original", () => {
    expect(correctedParts("", CORRECTED, [])).toEqual([
      { text: CORRECTED, added: false, issueIndex: null },
    ]);
  });

  it("returns nothing for an empty correction", () => {
    expect(correctedParts(ORIGINAL, "", [])).toEqual([]);
  });

  it("flags nothing when the texts are identical", () => {
    expect(correctedParts(ORIGINAL, ORIGINAL, [])).toEqual([
      { text: ORIGINAL, added: false, issueIndex: null },
    ]);
  });
});

describe("originalSegments", () => {
  /** Compact rendering: [-removed-], and <#n ...> around issue n's excerpt. */
  const render = (segments: OriginalSegment[]) =>
    segments
      .map(({ issueIndex, parts }) => {
        const text = parts
          .map((p) => (p.removed ? `[-${p.text}-]` : p.text))
          .join("");
        return issueIndex === null ? text : `<#${issueIndex} ${text}>`;
      })
      .join("");

  const issues = [issue("raised"), issue("In the other hand"), issue("discuss about")];
  const segments = originalSegments(ORIGINAL, CORRECTED, issues);

  it("rebuilds the original text", () => {
    expect(
      segments.flatMap((s) => s.parts.map((p) => p.text)).join(""),
    ).toBe(ORIGINAL);
  });

  it("strikes what the correction removed, inside and outside excerpts", () => {
    expect(render(segments)).toBe(
      "<#1 [-In-] the other hand> the costs <#0 [-raised-]>. Moreover we will " +
        "<#2 discuss [-about-]>[- -]it. She is engineer.",
    );
  });

  it("only marks the excerpts, as resolveHighlights does", () => {
    expect(segments.filter((s) => s.issueIndex !== null).map((s) => s.issueIndex)).toEqual([
      1, 0, 2,
    ]);
  });

  it("strikes nothing when there is no corrected text", () => {
    expect(render(originalSegments(ORIGINAL, "", [issue("raised")]))).toBe(
      "In the other hand the costs <#0 raised>. Moreover we will discuss about it. She is engineer.",
    );
  });

  it("strikes nothing when the correction changed nothing", () => {
    expect(render(originalSegments(ORIGINAL, ORIGINAL, []))).toBe(ORIGINAL);
  });

  it("returns nothing for empty text", () => {
    expect(originalSegments("", CORRECTED, [])).toEqual([]);
  });
});
