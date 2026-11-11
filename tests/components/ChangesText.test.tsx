import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChangesText from "@/components/ChangesText";
import type { Issue } from "@/lib/schema";
import { makeIssue } from "../fixtures";

const ORIGINAL = "In the other hand the costs raised. She is engineer.";
const CORRECTED = "On the other hand, the costs rose. She is an engineer.";
const ISSUES: Issue[] = [
  makeIssue({ excerpt: "raised", start: -1, end: -1, category: "word-choice" }),
  makeIssue({ excerpt: "engineer", start: -1, end: -1, category: "article" }),
];

function setup(props: Partial<Parameters<typeof ChangesText>[0]> = {}) {
  const onPick = vi.fn();
  const { container } = render(
    <ChangesText
      original={ORIGINAL}
      corrected={CORRECTED}
      issues={ISSUES}
      openIndex={null}
      onPick={onPick}
      {...props}
    />,
  );
  const p = container.querySelector("p")!;
  return { onPick, user: userEvent.setup(), p };
}

const texts = (els: NodeListOf<Element>) => [...els].map((el) => el.textContent);

describe("ChangesText", () => {
  it("strikes what the correction removed and highlights what it added", () => {
    const { p } = setup();
    expect(texts(p.querySelectorAll("del"))).toEqual(["In", "raised"]);
    expect(texts(p.querySelectorAll("ins"))).toEqual(["On", ",", "rose", "an"]);
  });

  it("numbers each issue's change, right against the changed word", () => {
    const { p } = setup();
    expect(p).toHaveTextContent(
      "InOn the other hand, the costs raisedrose1. She is an2 engineer.",
    );
  });

  it("opens an issue from its number or its change", async () => {
    const { onPick, user, p } = setup();
    await user.click(screen.getByRole("button", { name: "Issue 2, article" }));
    expect(onPick).toHaveBeenLastCalledWith(1);
    await user.click(p.querySelectorAll("ins")[2]);
    expect(onPick).toHaveBeenLastCalledWith(0);
    await user.click(p.querySelectorAll("del")[1]);
    expect(onPick).toHaveBeenCalledTimes(3);
  });

  it("does nothing for a change that fixes no issue", async () => {
    const { onPick, user, p } = setup();
    const unowned = p.querySelectorAll("del")[0];
    expect(unowned).not.toHaveClass("cursor-pointer");
    await user.click(unowned);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("rings the open issue's added words", () => {
    const { p } = setup({ openIndex: 0 });
    const [, , rose, an] = p.querySelectorAll("ins");
    expect(rose).toHaveClass("ring-2");
    expect(an).not.toHaveClass("ring-2");
  });

  it("drops the number of an issue that isn't shown, but keeps its change", () => {
    const { p } = setup({ shown: (i) => i === 0 });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(texts(p.querySelectorAll("ins"))).toContain("an");
  });
});
