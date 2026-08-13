import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HighlightedText from "@/components/HighlightedText";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CATEGORY_STYLES } from "@/lib/categories";
import type { Issue } from "@/lib/schema";
import { makeIssue } from "../fixtures";

const TEXT = "The cat sat";

function setup({
  issues = [makeIssue({ excerpt: "cat", start: 4, end: 7 })],
  activeIndex = null,
  original = TEXT,
  withScrollTarget = true,
}: {
  issues?: Issue[];
  activeIndex?: number | null;
  original?: string;
  withScrollTarget?: boolean;
} = {}) {
  const onActivate = vi.fn();
  const { container } = render(
    <>
      <TooltipProvider>
        <HighlightedText
          original={original}
          issues={issues}
          activeIndex={activeIndex}
          onActivate={onActivate}
        />
      </TooltipProvider>
      {/* The scroll target IssueCard renders in the real page. */}
      {withScrollTarget && <div id="issue-0" />}
    </>,
  );
  return {
    onActivate,
    container,
    user: userEvent.setup(),
    marks: () => Array.from(container.querySelectorAll("mark")),
  };
}

describe("rendering", () => {
  it("marks a resolvable issue and leaves the rest as plain text", () => {
    const { marks, container } = setup();
    expect(marks()).toHaveLength(1);
    expect(marks()[0]).toHaveTextContent("cat");
    expect(container).toHaveTextContent(TEXT);
  });

  it("renders text with no issues without any marks", () => {
    const { marks, container } = setup({ issues: [] });
    expect(marks()).toHaveLength(0);
    expect(container).toHaveTextContent(TEXT);
  });

  it("leaves an unlocatable issue unmarked rather than mis-marking", () => {
    const { marks, container } = setup({
      issues: [makeIssue({ excerpt: "zebra", start: 0, end: 5 })],
    });
    expect(marks()).toHaveLength(0);
    expect(container).toHaveTextContent(TEXT);
  });

  it("marks several issues independently", () => {
    const { marks } = setup({
      issues: [
        makeIssue({ excerpt: "The", start: 0, end: 3 }),
        makeIssue({ excerpt: "sat", start: 8, end: 11 }),
      ],
    });
    expect(marks().map((m) => m.textContent)).toEqual(["The", "sat"]);
  });

  it("styles a mark from its category", () => {
    const { marks } = setup({
      issues: [makeIssue({ excerpt: "cat", start: 4, end: 7, category: "connector" })],
    });
    for (const cls of CATEGORY_STYLES.connector.mark.split(" ")) {
      expect(marks()[0]).toHaveClass(cls);
    }
  });

  it("rings the mark matching the active issue", () => {
    expect(setup({ activeIndex: 0 }).marks()[0]).toHaveClass("ring-2");
  });

  it("does not ring a mark when another issue is active", () => {
    expect(setup({ activeIndex: 1 }).marks()[0]).not.toHaveClass("ring-2");
  });
});

describe("activation", () => {
  it("activates the issue on hover and clears it on leave", async () => {
    const { user, marks, onActivate } = setup();
    await user.hover(marks()[0]);
    expect(onActivate).toHaveBeenLastCalledWith(0);
    await user.unhover(marks()[0]);
    expect(onActivate).toHaveBeenLastCalledWith(null);
  });

  it("activates the issue on focus and clears it on blur", () => {
    // A bare <mark> carries no tabindex, so focus arrives programmatically or
    // from assistive tech rather than from a Tab press.
    const { marks, onActivate } = setup();
    fireEvent.focus(marks()[0]);
    expect(onActivate).toHaveBeenLastCalledWith(0);
    fireEvent.blur(marks()[0]);
    expect(onActivate).toHaveBeenLastCalledWith(null);
  });

  it("reports the index of the issue that was hovered, not its position", async () => {
    const { user, marks, onActivate } = setup({
      issues: [
        makeIssue({ excerpt: "sat", start: 8, end: 11 }),
        makeIssue({ excerpt: "The", start: 0, end: 3 }),
      ],
    });
    // "The" renders first but is issue index 1.
    await user.hover(marks()[0]);
    expect(onActivate).toHaveBeenLastCalledWith(1);
  });
});

describe("scrolling to the matching card", () => {
  it("scrolls the corresponding IssueCard into view on click", async () => {
    const scrollIntoView = vi.spyOn(Element.prototype, "scrollIntoView");
    const { user, marks } = setup();
    await user.click(marks()[0]);
    expect(scrollIntoView).toHaveBeenCalledWith({
      behavior: "smooth",
      block: "center",
    });
    scrollIntoView.mockRestore();
  });

  it("does not throw when the target card is not mounted", async () => {
    const { user, marks } = setup({ withScrollTarget: false });
    expect(document.getElementById("issue-0")).toBeNull();
    await expect(user.click(marks()[0])).resolves.not.toThrow();
  });
});

describe("tooltip", () => {
  it("exposes the explanation to assistive tech on hover", async () => {
    const { user, marks } = setup();
    await user.hover(marks()[0]);
    expect(await screen.findByRole("tooltip")).toHaveTextContent("Explanation.");
  });
});
