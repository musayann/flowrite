import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReviewView from "@/components/ReviewView";
import { resolveFixes } from "@/lib/fixes";
import type { Issue } from "@/lib/schema";
import { makeIssue, makeResult } from "../fixtures";

const ORIGINAL = "The cat sat on mat. It was happy.";
const CORRECTED = "The cat sat on the mat. It was happy.";
const ISSUES: Issue[] = [
  makeIssue({ excerpt: "cat", start: -1, end: -1, category: "word-choice" }),
  makeIssue({ excerpt: "mat", start: -1, end: -1, category: "article" }),
  makeIssue({ excerpt: "happy", start: -1, end: -1, category: "word-choice" }),
];

function setup(issues: Issue[] = ISSUES) {
  const onEdit = vi.fn();
  const onNewText = vi.fn();
  const result = makeResult({ issues, correctedVersion: CORRECTED });
  render(
    <ReviewView
      original={ORIGINAL}
      result={result}
      issues={issues}
      fixes={resolveFixes(ORIGINAL, CORRECTED, issues)}
      analysedAt={Date.now()}
      onEdit={onEdit}
      onNewText={onNewText}
    />,
  );
  const margin = () => screen.getByRole("complementary", { name: "Issues" });
  const note = (n: number) =>
    within(margin()).getByRole("button", { name: new RegExp(`^Issue ${n} `) });
  return { onEdit, onNewText, user: userEvent.setup(), margin, note };
}

const sheet = () => screen.queryByRole("region", { name: /^Issue \d$/ });

describe("ReviewView heading", () => {
  it("says how many things it found, and when", () => {
    setup();
    expect(screen.getByText("Analysed just now")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "3 things a careful reader would stumble over",
    );
  });

  it("is singular for one issue", () => {
    setup(ISSUES.slice(1, 2));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "1 thing a careful reader would stumble over",
    );
  });

  it("reports a clean text instead of a margin of notes", () => {
    setup([]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Nothing a careful reader would stumble over",
    );
    expect(screen.getByText("No issues found")).toBeInTheDocument();
  });

  it("starts over or goes back to editing", async () => {
    const { onEdit, onNewText, user } = setup();
    await user.click(screen.getByRole("button", { name: "New text" }));
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(onNewText).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});

describe("ReviewView notes", () => {
  it("starts with every note closed", () => {
    const { note } = setup();
    expect(note(1)).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("– of 3")).toBeInTheDocument();
  });

  it("opens a note from the text, and the sheet for small screens", async () => {
    const { user, margin, note } = setup();
    await user.click(screen.getByRole("button", { name: "Issue 2, article" }));
    expect(note(2)).toHaveAttribute("aria-expanded", "true");
    expect(margin()).toHaveTextContent("2 of 3");
    expect(sheet()).toHaveTextContent("Article");
    expect(sheet()).toHaveTextContent("2 of 3");
  });

  it("toggles a note from the margin without the sheet", async () => {
    const { user, note } = setup();
    await user.click(note(3));
    expect(note(3)).toHaveAttribute("aria-expanded", "true");
    expect(sheet()).not.toBeInTheDocument();
    await user.click(note(3));
    expect(note(3)).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps only one note open", async () => {
    const { user, note } = setup();
    await user.click(note(1));
    await user.click(note(2));
    expect(note(1)).toHaveAttribute("aria-expanded", "false");
    expect(note(2)).toHaveAttribute("aria-expanded", "true");
  });

  it("steps through the notes, wrapping at either end", async () => {
    const { user, margin, note } = setup();
    const next = within(margin()).getByRole("button", { name: "Next issue" });
    const prev = within(margin()).getByRole("button", { name: "Previous issue" });

    await user.click(prev);
    expect(note(3)).toHaveAttribute("aria-expanded", "true");
    await user.click(next);
    expect(note(1)).toHaveAttribute("aria-expanded", "true");
    await user.click(next);
    expect(note(2)).toHaveAttribute("aria-expanded", "true");
  });

  it("starts stepping from the first note", async () => {
    const { user, margin, note } = setup();
    await user.click(within(margin()).getByRole("button", { name: "Next issue" }));
    expect(note(1)).toHaveAttribute("aria-expanded", "true");
  });

  it("steps and closes from the sheet", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Issue 1, word choice" }));
    await user.click(within(sheet()!).getByRole("button", { name: "Next issue" }));
    expect(sheet()).toHaveAccessibleName("Issue 2");
    await user.click(within(sheet()!).getByRole("button", { name: "Close" }));
    expect(sheet()).not.toBeInTheDocument();
  });
});

describe("ReviewView filter", () => {
  const chip = (name: RegExp) =>
    within(screen.getByRole("group", { name: "Show issues by category" })).getByRole(
      "button",
      { name },
    );

  it("offers a chip per category present, with counts", () => {
    setup();
    expect(chip(/^All 3$/)).toHaveAttribute("aria-pressed", "true");
    expect(chip(/^Word choice 2$/)).toHaveAttribute("aria-pressed", "false");
    expect(chip(/^Article 1$/)).toBeInTheDocument();
  });

  it("isn't offered when every issue shares a category", () => {
    setup([ISSUES[0], ISSUES[2]]);
    expect(screen.queryByRole("group")).not.toBeInTheDocument();
  });

  it("hides other categories' notes and numbers", async () => {
    const { user, margin } = setup();
    await user.click(chip(/^Article/));
    expect(within(margin()).getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Issue 1, word choice" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Issue 2, article" })).toBeInTheDocument();
    expect(screen.getByText("– of 1")).toBeInTheDocument();
  });

  it("closes an open note the filter hides, but keeps one it shows", async () => {
    const { user, note } = setup();
    await user.click(note(1));
    await user.click(chip(/^Word choice/));
    expect(note(1)).toHaveAttribute("aria-expanded", "true");
    await user.click(chip(/^Article/));
    await user.click(chip(/^All/));
    expect(note(1)).toHaveAttribute("aria-expanded", "false");
  });

  it("clears when its chip is pressed again", async () => {
    const { user } = setup();
    await user.click(chip(/^Article/));
    await user.click(chip(/^Article/));
    expect(chip(/^All/)).toHaveAttribute("aria-pressed", "true");
  });
});

describe("ReviewView scrolling", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** Pretend the margin sits beside the text (or not), and watch scrolling. */
  function layout(wide: boolean) {
    vi.spyOn(window, "matchMedia").mockReturnValue({ matches: wide } as MediaQueryList);
    return vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
  }

  it("brings the note into view when the margin is beside the text", async () => {
    const scroll = layout(true);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Issue 3, word choice" }));
    await waitFor(() => expect(scroll).toHaveBeenCalled());
    expect(scroll.mock.contexts[0]).toBe(document.getElementById("issue-2"));
  });

  it("keeps the number in view above the sheet on small screens", async () => {
    const scroll = layout(false);
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Issue 3, word choice" }));
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(1));
    expect(scroll.mock.contexts[0]).toHaveAttribute("data-marker", "2");

    await user.click(within(sheet()!).getByRole("button", { name: "Next issue" }));
    await waitFor(() => expect(scroll).toHaveBeenCalledTimes(2));
    expect(scroll.mock.contexts[1]).toHaveAttribute("data-marker", "0");
  });

  it("doesn't scroll a number that is already clear of the sheet", async () => {
    const scroll = layout(false);
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(function (
      this: Element,
    ) {
      const top = this.id === "issue-sheet" ? 500 : 100;
      return { top, bottom: top + 20 } as DOMRect;
    });
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Issue 3, word choice" }));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(scroll).not.toHaveBeenCalled();
  });

  it("brings the note into view when stepping in the margin", async () => {
    const scroll = layout(false);
    const { user, margin } = setup();
    await user.click(within(margin()).getByRole("button", { name: "Next issue" }));
    await waitFor(() => expect(scroll).toHaveBeenCalled());
  });
});
