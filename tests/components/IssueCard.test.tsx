import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IssueCard from "@/components/IssueCard";
import { CATEGORY_STYLES } from "@/lib/categories";
import { CATEGORIES } from "@/lib/schema";
import { resolveFixes } from "@/lib/fixes";
import { makeIssue } from "../fixtures";

function setup(overrides: Partial<React.ComponentProps<typeof IssueCard>> = {}) {
  const onActivate = vi.fn();
  const { container } = render(
    <IssueCard
      issue={makeIssue({
        excerpt: "the cat",
        explanation: "This reads awkwardly.",
        rule: "Prefer the active voice.",
        category: "clarity",
      })}
      index={0}
      active={false}
      onActivate={onActivate}
      {...overrides}
    />,
  );
  return { onActivate, container, user: userEvent.setup() };
}

describe("content", () => {
  it("shows the excerpt, explanation and rule", () => {
    setup();
    expect(screen.getByText(/the cat/)).toBeInTheDocument();
    expect(screen.getByText("This reads awkwardly.")).toBeInTheDocument();
    expect(screen.getByText("Prefer the active voice.")).toBeInTheDocument();
    expect(screen.getByText("Rule")).toBeInTheDocument();
  });

  it("labels the issue with its category", () => {
    setup({ issue: makeIssue({ category: "preposition" }) });
    expect(
      screen.getByText(CATEGORY_STYLES.preposition.label),
    ).toBeInTheDocument();
  });

  it.each(CATEGORIES)("renders the %s category without crashing", (category) => {
    setup({ issue: makeIssue({ category }) });
    expect(screen.getByText(CATEGORY_STYLES[category].label)).toBeInTheDocument();
  });
});

describe("scroll anchor", () => {
  it("carries the id HighlightedText scrolls to", () => {
    const { container } = setup({ index: 3 });
    expect(container.querySelector("#issue-3")).not.toBeNull();
  });
});

describe("activation", () => {
  it("activates on hover and clears on leave", async () => {
    const { user, container, onActivate } = setup({ index: 2 });
    const card = container.querySelector("#issue-2") as HTMLElement;
    await user.hover(card);
    expect(onActivate).toHaveBeenLastCalledWith(2);
    await user.unhover(card);
    expect(onActivate).toHaveBeenLastCalledWith(null);
  });

  it("rings the card while active", () => {
    const { container } = setup({ active: true });
    expect(container.querySelector("#issue-0")).toHaveClass("ring-2");
  });

  it("does not ring the card while inactive", () => {
    const { container } = setup({ active: false });
    expect(container.querySelector("#issue-0")).not.toHaveClass("ring-2");
  });
});

describe("before and after", () => {
  const ISSUE = makeIssue({ excerpt: "In the other hand", category: "preposition" });
  const [FIX] = resolveFixes(
    "In the other hand the costs rose.",
    "On the other hand, the costs rose.",
    [ISSUE],
  );

  it("shows just the words the fix changes", () => {
    const { container } = setup({ issue: ISSUE, fix: FIX });
    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
    expect(container.querySelector("del")).toHaveTextContent(/^In$/);
    const added = Array.from(container.querySelectorAll("ins")).map(
      (el) => el.textContent,
    );
    expect(added).toEqual(["On", ","]);
    // Scoped to the excerpt: the rest of the sentence isn't repeated.
    expect(container).not.toHaveTextContent("costs");
  });

  it("marks the excerpt in the category colour on the Before line", () => {
    const { container } = setup({ issue: ISSUE, fix: FIX });
    const [markClass] = CATEGORY_STYLES.preposition.mark.split(" ");
    const marked = Array.from(container.querySelectorAll(`.${markClass}`))
      .map((el) => el.textContent)
      .join("");
    expect(marked).toBe("In the other hand");
  });

  it("keeps the strikethrough off the space after a deleted word", () => {
    const issue = makeIssue({ excerpt: "about" });
    const [fix] = resolveFixes(
      "We discuss about it.",
      "We discuss it.",
      [issue],
    );
    const { container } = setup({ issue, fix });
    expect(container.querySelector("del")).toHaveTextContent(/^about$/);
  });

  it.each([
    ["no fix", null],
    ["an undefined fix", undefined],
  ])("is hidden when there is %s", (_label, fix) => {
    setup({ fix });
    expect(screen.queryByText("Before")).not.toBeInTheDocument();
  });
});
