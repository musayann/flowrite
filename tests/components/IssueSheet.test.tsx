import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import IssueSheet from "@/components/IssueSheet";
import { makeIssue } from "../fixtures";

const ISSUE = makeIssue({
  category: "coherence",
  explanation: "It contradicts the delay.",
  rule: "Say how the problem was handled.",
});

function setup() {
  const onStep = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <IssueSheet
      issue={ISSUE}
      index={1}
      fix={null}
      position={2}
      total={5}
      onStep={onStep}
      onClose={onClose}
    />,
  );
  return { onStep, onClose, user: userEvent.setup(), ...view };
}

describe("IssueSheet", () => {
  it("shows which issue it is, and where it sits among the rest", () => {
    setup();
    const sheet = screen.getByRole("region", { name: "Issue 2" });
    expect(sheet).toHaveTextContent("Coherence");
    expect(sheet).toHaveTextContent("2 of 5");
  });

  it("shows the note's details", () => {
    setup();
    expect(screen.getByText("It contradicts the delay.")).toBeInTheDocument();
    expect(screen.getByText("Say how the problem was handled.")).toBeInTheDocument();
  });

  it("steps through issues and closes", async () => {
    const { onStep, onClose, user } = setup();
    await user.click(screen.getByRole("button", { name: "Previous issue" }));
    await user.click(screen.getByRole("button", { name: "Next issue" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onStep.mock.calls).toEqual([[-1], [1]]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape, and stops listening once gone", async () => {
    const { onClose, user, unmount } = setup();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.keyboard("a");
    expect(onClose).toHaveBeenCalledTimes(1);
    unmount();
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
