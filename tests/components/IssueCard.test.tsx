import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IssueCard from "@/components/IssueCard";
import { CATEGORY_STYLES } from "@/lib/categories";
import { resolveFixes, type Fix } from "@/lib/fixes";
import { makeIssue } from "../fixtures";

const ORIGINAL = "We will discuss about it.";
const CORRECTED = "We will discuss it.";
const ISSUE = makeIssue({
  excerpt: "discuss about",
  start: -1,
  end: -1,
  category: "preposition",
  explanation: "“Discuss” takes a direct object.",
  rule: "Discuss something, not discuss about it.",
});
const FIX = resolveFixes(ORIGINAL, CORRECTED, [ISSUE])[0]!;

function setup(props: Partial<Parameters<typeof IssueCard>[0]> = {}) {
  const onToggle = vi.fn();
  const { container } = render(
    <IssueCard
      issue={ISSUE}
      index={2}
      open={false}
      onToggle={onToggle}
      fix={FIX}
      {...props}
    />,
  );
  const header = screen.getByRole("button");
  return { onToggle, header, article: container.firstElementChild as HTMLElement };
}

describe("IssueCard header", () => {
  it("shows the number, the category and the fix in one line", () => {
    const { header } = setup();
    expect(header).toHaveAccessibleName("Issue 3 Preposition discuss about → discuss");
    expect(header.querySelector("del")).toHaveTextContent("discuss about");
    expect(header.querySelector("ins")).toHaveTextContent(/^discuss$/);
    expect(header).toHaveTextContent("→");
  });

  it("colours the category label", () => {
    setup();
    expect(screen.getByText("Preposition")).toHaveClass(
      ...CATEGORY_STYLES.preposition.text.split(" "),
    );
  });

  it("quotes the excerpt when the correction didn't touch it", () => {
    const { header } = setup({ fix: null });
    expect(header).toHaveTextContent("“discuss about”");
    expect(header.querySelector("del")).toBeNull();
  });

  it("shows only the added side of a pure insertion", () => {
    const fix: Fix = {
      before: [],
      after: [{ text: "an", kind: "added" }],
      afterStart: 0,
      afterEnd: 2,
    };
    const { header } = setup({ fix });
    expect(header.querySelector("ins")).toHaveTextContent("an");
    expect(header.querySelector("del")).toBeNull();
    expect(header).not.toHaveTextContent("→");
  });

  it("asks to be toggled when clicked", async () => {
    const { header, onToggle } = setup();
    await userEvent.setup().click(header);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("is the target the text's numbers scroll to", () => {
    expect(setup().article).toHaveAttribute("id", "issue-2");
  });
});

describe("IssueCard collapsed", () => {
  it("hides its details", () => {
    const { header } = setup();
    expect(header).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Remember")).not.toBeInTheDocument();
    expect(screen.queryByText(ISSUE.explanation)).not.toBeInTheDocument();
  });
});

describe("IssueCard open", () => {
  it("shows the fix, then why, then the rule to remember", () => {
    const { header, article } = setup({ open: true });
    expect(header).toHaveAttribute("aria-expanded", "true");
    const body = document.getElementById(header.getAttribute("aria-controls")!)!;
    expect(body).toHaveTextContent(
      /^Before.*After.*“Discuss” takes a direct object\.RememberDiscuss something/,
    );
    expect(article).toHaveClass(...CATEGORY_STYLES.preposition.active.split(" "));
  });

  it("strikes the removed words on Before and highlights the added ones on After", () => {
    setup({ open: true, fix: resolveFixes("She is engineer.", "She is an engineer.", [
      makeIssue({ excerpt: "engineer", start: -1, end: -1 }),
    ])[0] });
    const before = screen.getByText("Before").nextElementSibling!;
    const after = screen.getByText("After").nextElementSibling!;
    expect(before).toHaveTextContent("engineer");
    expect(after.querySelector("ins")).toHaveTextContent("an");
  });

  it("leaves out the Before/After box when nothing changed", () => {
    setup({ open: true, fix: null });
    expect(screen.queryByText("Before")).not.toBeInTheDocument();
    expect(screen.getByText(ISSUE.rule)).toBeInTheDocument();
  });
});
