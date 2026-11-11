import { describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@testing-library/react";
import CorrectedText from "@/components/CorrectedText";
import { INSERTED_CLASS } from "@/components/diff-marks";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fixRanges, resolveFixes } from "@/lib/fixes";
import { makeIssue } from "../fixtures";

const ORIGINAL = "The cat sit on mat. It purr.";
const CORRECTED = "The cat sits on the mat. It purrs.";

// "sit" → "sits" belongs to an issue; "the " and "purrs" are unflagged changes.
const issues = [
  makeIssue({ excerpt: "sit", start: -1, end: -1, category: "word-choice" }),
];
const ranges = fixRanges(resolveFixes(ORIGINAL, CORRECTED, issues));

function setup(activeIndex: number | null = null) {
  const onActivate = vi.fn();
  const { container } = render(
    <TooltipProvider>
      <CorrectedText
        original={ORIGINAL}
        corrected={CORRECTED}
        issues={issues}
        ranges={ranges}
        activeIndex={activeIndex}
        onActivate={onActivate}
      />
    </TooltipProvider>,
  );
  const ins = Array.from(container.querySelectorAll("ins"));
  return { container, ins, onActivate };
}

describe("rendering", () => {
  it("shows the whole corrected text", () => {
    expect(setup().container).toHaveTextContent(CORRECTED);
  });

  it("highlights each change the correction made, without its spaces", () => {
    expect(setup().ins.map((el) => el.textContent)).toEqual([
      "sits",
      "the",
      "purrs",
    ]);
  });

  it("styles the changes like the After line of an issue card", () => {
    for (const el of setup().ins) {
      expect(el).toHaveClass(...INSERTED_CLASS.split(" "));
    }
  });

  it("shows no removals or issue marks", () => {
    const { container } = setup();
    expect(container.querySelector("del")).toBeNull();
    expect(container.querySelector("mark")).toBeNull();
  });

  it("shows plain text when nothing changed", () => {
    const { container } = render(
      <CorrectedText
        original={CORRECTED}
        corrected={CORRECTED}
        issues={[]}
        ranges={[]}
        activeIndex={null}
        onActivate={() => {}}
      />,
    );
    expect(container.querySelector("ins")).toBeNull();
    expect(container).toHaveTextContent(CORRECTED);
  });
});

describe("linking to issues", () => {
  it("rings the change of the active issue", () => {
    const { ins } = setup(0);
    expect(ins[0]).toHaveClass("ring-2");
    expect(ins[1]).not.toHaveClass("ring-2");
  });

  it("leaves changes unringed when no issue is active", () => {
    for (const el of setup().ins) expect(el).not.toHaveClass("ring-2");
  });

  it("activates the issue when its change is hovered", () => {
    const { ins, onActivate } = setup();
    fireEvent.mouseEnter(ins[0]);
    expect(onActivate).toHaveBeenLastCalledWith(0);
    fireEvent.mouseLeave(ins[0]);
    expect(onActivate).toHaveBeenLastCalledWith(null);
  });

  it("does nothing when an unflagged change is hovered", () => {
    const { ins, onActivate } = setup();
    fireEvent.mouseEnter(ins[1]);
    fireEvent.mouseEnter(ins[2]);
    expect(onActivate).not.toHaveBeenCalled();
    expect(ins[1]).not.toHaveClass("cursor-pointer");
  });

  it("scrolls to the issue card when its change is clicked", () => {
    const card = document.createElement("div");
    card.id = "issue-0";
    card.scrollIntoView = vi.fn();
    document.body.appendChild(card);

    fireEvent.click(setup().ins[0]);
    expect(card.scrollIntoView).toHaveBeenCalled();
    card.remove();
  });
});
