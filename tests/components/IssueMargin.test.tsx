import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IssueMargin from "@/components/IssueMargin";
import { makeIssue } from "../fixtures";

const ISSUES = [
  makeIssue({ excerpt: "a", category: "coherence" }),
  makeIssue({ excerpt: "b", category: "clarity" }),
  makeIssue({ excerpt: "c", category: "coherence" }),
];

function setup(props: Partial<Parameters<typeof IssueMargin>[0]> = {}) {
  const onToggle = vi.fn();
  const onStep = vi.fn();
  render(
    <IssueMargin
      issues={ISSUES}
      fixes={[null, null, null]}
      visible={[0, 1, 2]}
      openIndex={null}
      onToggle={onToggle}
      onStep={onStep}
      {...props}
    />,
  );
  return { onToggle, onStep, user: userEvent.setup() };
}

const notes = () => screen.getAllByRole("article");

describe("IssueMargin", () => {
  it("lists a note for each visible issue, numbered by its place in the text", () => {
    setup({ visible: [0, 2] });
    expect(notes()).toHaveLength(2);
    expect(notes()[1]).toHaveAttribute("id", "issue-2");
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Issues 2");
  });

  it("shows where the open issue sits among the visible ones", () => {
    setup({ visible: [0, 2], openIndex: 2 });
    expect(screen.getByText("2 of 2")).toBeInTheDocument();
  });

  it("shows a dash when no issue is open", () => {
    setup();
    expect(screen.getByText("– of 3")).toBeInTheDocument();
  });

  it("steps back and forward", async () => {
    const { onStep, user } = setup();
    await user.click(screen.getByRole("button", { name: "Previous issue" }));
    await user.click(screen.getByRole("button", { name: "Next issue" }));
    expect(onStep.mock.calls).toEqual([[-1], [1]]);
  });

  it("toggles the note whose header is clicked", async () => {
    const { onToggle, user } = setup();
    await user.click(screen.getByRole("button", { name: /Issue 2/ }));
    expect(onToggle).toHaveBeenCalledWith(1);
  });

  it("can't step when nothing is visible", () => {
    setup({ visible: [] });
    expect(screen.getByRole("button", { name: "Next issue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous issue" })).toBeDisabled();
  });
});
