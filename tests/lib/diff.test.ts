import { describe, expect, it } from "vitest";
import { diffWords, markRange, tokenize, type DiffPart } from "@/lib/diff";

const beforeSide = (parts: DiffPart[]) =>
  parts
    .filter((p) => p.kind !== "added")
    .map((p) => p.text)
    .join("");
const afterSide = (parts: DiffPart[]) =>
  parts
    .filter((p) => p.kind !== "removed")
    .map((p) => p.text)
    .join("");

describe("tokenize", () => {
  it("splits words, whitespace and punctuation", () => {
    expect(tokenize("Hello,  world’s end!")).toEqual([
      "Hello",
      ",",
      "  ",
      "world’s",
      " ",
      "end",
      "!",
    ]);
  });

  it("returns nothing for an empty string", () => {
    expect(tokenize("")).toEqual([]);
  });
});

describe("diffWords", () => {
  it("returns a single unchanged part for identical text", () => {
    expect(diffWords("Costs rose.", "Costs rose.")).toEqual([
      { text: "Costs rose.", kind: "same" },
    ]);
  });

  it("handles empty input", () => {
    expect(diffWords("", "")).toEqual([]);
    expect(diffWords("", "New.")).toEqual([{ text: "New.", kind: "added" }]);
    expect(diffWords("Old.", "")).toEqual([{ text: "Old.", kind: "removed" }]);
  });

  it("pairs a swapped word as removed then added", () => {
    expect(
      diffWords("In the other hand, costs rose.", "On the other hand, costs rose."),
    ).toEqual([
      { text: "In", kind: "removed" },
      { text: "On", kind: "added" },
      { text: " the other hand, costs rose.", kind: "same" },
    ]);
  });

  it("marks a pure insertion", () => {
    expect(diffWords("She is engineer.", "She is an engineer.")).toEqual([
      { text: "She is ", kind: "same" },
      { text: "an ", kind: "added" },
      { text: "engineer.", kind: "same" },
    ]);
  });

  it("marks a pure deletion", () => {
    expect(
      diffWords("We will discuss about it.", "We will discuss it."),
    ).toEqual([
      { text: "We will discuss ", kind: "same" },
      { text: "about ", kind: "removed" },
      { text: "it.", kind: "same" },
    ]);
  });

  it("treats punctuation as its own token", () => {
    expect(diffWords("Moreover we agreed.", "Moreover, we agreed.")).toEqual([
      { text: "Moreover", kind: "same" },
      { text: ",", kind: "added" },
      { text: " we agreed.", kind: "same" },
    ]);
  });

  it("starts an inserted word on a word, not on the space before it", () => {
    // The shared " engineer." suffix would otherwise pull the space forward,
    // leaving " an" inserted after "is" instead of "an " before "engineer".
    expect(diffWords("He is engineer.", "She is an engineer.")).toEqual([
      { text: "He", kind: "removed" },
      { text: "She", kind: "added" },
      { text: " is ", kind: "same" },
      { text: "an ", kind: "added" },
      { text: "engineer.", kind: "same" },
    ]);
  });

  it("keeps a multi-word rewrite together instead of splitting it at spaces", () => {
    expect(
      diffWords("It is a very big problem.", "It is a major issue."),
    ).toEqual([
      { text: "It is a ", kind: "same" },
      { text: "very big problem", kind: "removed" },
      { text: "major issue", kind: "added" },
      { text: ".", kind: "same" },
    ]);
  });

  it.each([
    ["In the other hand the costs raised.", "On the other hand, costs rose."],
    ["Moreover we decided to discuss about it.", "We therefore decided to discuss it."],
    ["The datas shows that.", "The data show that."],
    ["Line one.\nLine two.", "Line one.\n\nLine two!"],
    ["", "Something new."],
    ["Café naïve résumé", "Cafe naive resume"],
    ["He is engineer.", "She is an engineer."],
    ["We met at the  weekend.", "We met  weekend."],
  ])("rebuilds both sides of %j → %j", (before, after) => {
    const parts = diffWords(before, after);
    expect(beforeSide(parts)).toBe(before);
    expect(afterSide(parts)).toBe(after);
  });

  it("never emits empty or adjacent unchanged parts", () => {
    const parts = diffWords(
      "In the other hand the costs raised.",
      "On the other hand, costs rose.",
    );
    expect(parts.every((p) => p.text.length > 0)).toBe(true);
    parts.slice(1).forEach((p, k) => {
      if (p.kind === "same") expect(parts[k].kind).not.toBe("same");
    });
  });
});

describe("markRange", () => {
  const parts: DiffPart[] = [
    { text: "In", kind: "removed" },
    { text: " the other hand", kind: "same" },
  ];

  it("splits a part at the range boundaries", () => {
    // "In the other hand" → mark "the other" (3..12).
    expect(markRange(parts, 3, 12)).toEqual([
      { text: "In", kind: "removed", highlight: false },
      { text: " ", kind: "same", highlight: false },
      { text: "the other", kind: "same", highlight: true },
      { text: " hand", kind: "same", highlight: false },
    ]);
  });

  it("marks a range spanning a removed part and unchanged text", () => {
    expect(markRange(parts, 0, 6)).toEqual([
      { text: "In", kind: "removed", highlight: true },
      { text: " the", kind: "same", highlight: true },
      { text: " other hand", kind: "same", highlight: false },
    ]);
  });

  it("marks a whole part without splitting it", () => {
    expect(markRange(parts, 0, 2)).toEqual([
      { text: "In", kind: "removed", highlight: true },
      { text: " the other hand", kind: "same", highlight: false },
    ]);
  });

  it.each([
    ["an empty range", 4, 4],
    ["a missing excerpt", -1, -1],
    ["a reversed range", 8, 2],
  ])("marks nothing for %s", (_label, start, end) => {
    expect(markRange(parts, start, end)).toEqual(
      parts.map((p) => ({ ...p, highlight: false })),
    );
  });

  it("ignores a range past the end of the text", () => {
    expect(markRange(parts, 40, 50).some((p) => p.highlight)).toBe(false);
  });
});
