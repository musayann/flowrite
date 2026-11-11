import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HighlightedText from "@/components/HighlightedText";
import { CATEGORY_STYLES } from "@/lib/categories";
import type { Issue } from "@/lib/schema";
import { makeIssue } from "../fixtures";

const TEXT = "The cat sat on the mat.";
const ISSUES: Issue[] = [
  makeIssue({ excerpt: "cat", start: -1, end: -1, category: "word-choice" }),
  makeIssue({ excerpt: "the mat", start: -1, end: -1, category: "article" }),
];

function setup(props: Partial<Parameters<typeof HighlightedText>[0]> = {}) {
  const onPick = vi.fn();
  const { container } = render(
    <HighlightedText
      original={TEXT}
      issues={ISSUES}
      openIndex={null}
      onPick={onPick}
      {...props}
    />,
  );
  return { onPick, user: userEvent.setup(), container };
}

const marks = (container: HTMLElement) => [...container.querySelectorAll("mark")];

describe("HighlightedText", () => {
  it("keeps the whole text, with each excerpt followed by its number", () => {
    const { container } = setup();
    expect(container.querySelector("p")).toHaveTextContent(
      "The cat1 sat on the mat2.",
    );
  });

  it("underlines each excerpt in its category colour", () => {
    const { container } = setup();
    const [cat, mat] = marks(container);
    expect(cat).toHaveTextContent("cat");
    expect(cat).toHaveClass("underline", CATEGORY_STYLES["word-choice"].underline);
    expect(mat).toHaveTextContent("the mat");
    expect(mat).toHaveClass(CATEGORY_STYLES.article.underline);
  });

  it("names each number after its issue", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Issue 1, word choice" }),
    ).toHaveTextContent("1");
    expect(screen.getByRole("button", { name: "Issue 2, article" })).toHaveClass(
      ...CATEGORY_STYLES.article.number.split(" "),
    );
  });

  it("opens an issue from its number or its excerpt", async () => {
    const { onPick, user, container } = setup();
    await user.click(screen.getByRole("button", { name: "Issue 2, article" }));
    expect(onPick).toHaveBeenLastCalledWith(1);
    await user.click(marks(container)[0]);
    expect(onPick).toHaveBeenLastCalledWith(0);
  });

  it("tints only the open issue's excerpt and marks its number expanded", () => {
    const { container } = setup({ openIndex: 1 });
    const [cat, mat] = marks(container);
    expect(mat).toHaveClass(...CATEGORY_STYLES.article.tint.split(" "));
    expect(cat).toHaveClass("bg-transparent");
    expect(screen.getByRole("button", { name: "Issue 2, article" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(
      screen.getByRole("button", { name: "Issue 1, word choice" }),
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("leaves issues that aren't shown as plain text", () => {
    const { container } = setup({ shown: (i) => i === 1 });
    expect(marks(container).map((m) => m.textContent)).toEqual(["the mat"]);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(container.querySelector("p")).toHaveTextContent("The cat sat on the mat2.");
  });

  it("marks nothing for an excerpt that isn't in the text", () => {
    const { container } = setup({
      issues: [makeIssue({ excerpt: "dog", start: -1, end: -1 })],
    });
    expect(marks(container)).toHaveLength(0);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("passes its class name to the paragraph", () => {
    const { container } = setup({ className: "text-xl" });
    expect(container.querySelector("p")).toHaveClass("text-xl", "whitespace-pre-wrap");
  });
});
