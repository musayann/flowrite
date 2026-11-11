import { describe, expect, it } from "vitest";
import {
  changeParts,
  fixSummary,
  resolveFixes,
  type ChangePart,
  type Fix,
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

describe("fixSummary", () => {
  const summary = (before: string, after: string, excerpt: string) =>
    fixSummary(
      resolveFixes(before, after, [issue(excerpt)])[0]!,
    );

  it("joins each side of a fix into one line", () => {
    expect(fixSummary(fixOf("In the other hand")!)).toEqual({
      before: "In the other hand",
      after: "On the other hand,",
    });
  });

  it("leaves out the words both sides share at either end", () => {
    expect(
      summary("We look forward for it.", "We look forward to it.", "look forward for"),
    ).toEqual({ before: "for", after: "to" });
    expect(
      summary(
        "Then the results were discussed today.",
        "Then we discussed the results today.",
        "Then the results were discussed",
      ),
    ).toEqual({
      before: "the results were discussed",
      after: "we discussed the results",
    });
  });

  it("keeps a word on each side of an insertion or deletion", () => {
    expect(fixSummary(fixOf("engineer")!)).toEqual({
      before: "engineer",
      after: "an engineer",
    });
    expect(fixSummary(fixOf("about")!)).toEqual({
      before: "about it.",
      after: "it.",
    });
    expect(summary("We discuss about it.", "We discuss it.", "discuss about")).toEqual({
      before: "discuss about",
      after: "discuss",
    });
  });
});

describe("changeParts", () => {
  /** [-removed-] and {+added+}, each change tagged @issue, and #n where a number goes. */
  const showChanges = (parts: ChangePart[]) =>
    parts
      .map((p) => {
        if (p.kind === "same") return p.text;
        const text = p.kind === "removed" ? `[-${p.text}-]` : `{+${p.text}+}`;
        const owner = p.issueIndex === null ? "" : `@${p.issueIndex}`;
        return text + owner + (p.markerAfter ? `#${p.issueIndex! + 1}` : "");
      })
      .join("");

  const ISSUES = [
    issue("In the other hand"),
    issue("raised"),
    issue("about"),
    issue("engineer"),
  ];

  it("rebuilds the original without its additions and the correction without its removals", () => {
    const parts = changeParts(ORIGINAL, CORRECTED, ISSUES);
    const join = (skip: ChangePart["kind"]) =>
      parts
        .filter((p) => p.kind !== skip)
        .map((p) => p.text)
        .join("");
    expect(join("added")).toBe(ORIGINAL);
    expect(join("removed")).toBe(CORRECTED);
  });

  it("gives each change to the issue it fixes, numbered after its last part", () => {
    expect(showChanges(changeParts(ORIGINAL, CORRECTED, ISSUES))).toBe(
      "[-In-]@0{+On+}@0 the other hand{+,+}@0#1 the costs [-raised-]@1{+rose+}@1#2." +
        " Moreover{+,+} we will discuss [-about -]@2#3it. She is {+an +}@3#4engineer.",
    );
  });

  it("leaves a change that fixes no issue unowned and unnumbered", () => {
    const moreover = changeParts(ORIGINAL, CORRECTED, ISSUES).find(
      (p) => p.kind === "added" && p.text === "," && p.issueIndex === null,
    );
    expect(moreover).toMatchObject({ issueIndex: null, markerAfter: false });
  });

  it("numbers nothing for an issue whose excerpt can't be found", () => {
    const parts = changeParts(ORIGINAL, CORRECTED, [issue("not there")]);
    expect(parts.some((p) => p.issueIndex !== null)).toBe(false);
  });

  it("gives a change touched by two issues to the first", () => {
    const parts = changeParts(ORIGINAL, CORRECTED, [
      issue("costs raised"),
      issue("raised"),
    ]);
    const owners = parts.filter((p) => p.kind !== "same").map((p) => p.issueIndex);
    expect(owners).not.toContain(1);
    expect(parts.find((p) => p.text === "rose")).toMatchObject({
      issueIndex: 0,
      markerAfter: true,
    });
  });

  it("returns the text unchanged when there is nothing to compare", () => {
    expect(changeParts(ORIGINAL, "", ISSUES)).toEqual([
      { text: ORIGINAL, kind: "same", issueIndex: null, markerAfter: false },
    ]);
    expect(changeParts("", CORRECTED, ISSUES)).toEqual([
      { text: CORRECTED, kind: "same", issueIndex: null, markerAfter: false },
    ]);
    expect(changeParts("", "", ISSUES)).toEqual([]);
  });

  it("shows identical texts as one unchanged stretch", () => {
    expect(changeParts(ORIGINAL, ORIGINAL, ISSUES)).toEqual([
      { text: ORIGINAL, kind: "same", issueIndex: null, markerAfter: false },
    ]);
  });
});
