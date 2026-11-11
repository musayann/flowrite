import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryDrawer from "@/components/HistoryDrawer";
import type { HistoryEntry } from "@/lib/history";
import { makeIssue, makeResult } from "../fixtures";

// vitest.config.mts pins TZ to UTC.
const NOW = Date.UTC(2026, 10, 11, 10, 42);

const entry = (
  id: string,
  input: string,
  createdAt: number,
  categories: ("coherence" | "clarity")[] = [],
): HistoryEntry => ({
  id,
  input,
  result: makeResult({ issues: categories.map((category) => makeIssue({ category })) }),
  createdAt,
});

const ENTRIES = [
  entry("t", "from today", Date.UTC(2026, 10, 11, 9, 5), ["coherence", "clarity", "clarity"]),
  entry("y", "from yesterday", Date.UTC(2026, 10, 10, 16, 5), ["clarity"]),
  entry("e", "from last week", Date.UTC(2026, 10, 3, 17, 12)),
];

function setup(props: Partial<Parameters<typeof HistoryDrawer>[0]> = {}) {
  const handlers = {
    onOpenChange: vi.fn(),
    onSelect: vi.fn(),
    onRemove: vi.fn(),
    onClear: vi.fn(),
  };
  render(
    <HistoryDrawer
      open
      entries={ENTRIES}
      currentId={null}
      now={NOW}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, user: userEvent.setup() };
}

describe("HistoryDrawer", () => {
  it("renders nothing while closed", () => {
    setup({ open: false });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is a titled dialog that says where history is kept", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "History" });
    expect(dialog).toHaveAccessibleDescription("Saved in this browser only");
  });

  it("groups entries by day, with the time for recent ones and the date for older", () => {
    setup();
    const today = screen.getByRole("region", { name: "Today" });
    expect(today).toHaveTextContent("from today3 issues · 09:05");
    expect(screen.getByRole("region", { name: "Yesterday" })).toHaveTextContent(
      "1 issue · 16:05",
    );
    expect(screen.getByRole("region", { name: "Earlier" })).toHaveTextContent(
      "0 issues · 3 Nov 2026, 17:12",
    );
  });

  it("shows one dot per category", () => {
    setup();
    const today = screen.getByRole("region", { name: "Today" });
    const dots = today.querySelector("[aria-hidden=true]")!;
    expect(dots.children).toHaveLength(2);
  });

  it("marks the entry on screen as current", () => {
    setup({ currentId: "y" });
    expect(screen.getByRole("button", { name: /from yesterday/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
    expect(screen.getByRole("button", { name: /from today/ })).not.toHaveAttribute(
      "aria-current",
    );
  });

  it("opens, removes and clears entries", async () => {
    const { onSelect, onRemove, onClear, user } = setup();
    await user.click(screen.getByRole("button", { name: /from yesterday/ }));
    expect(onSelect).toHaveBeenCalledWith(ENTRIES[1]);

    const today = screen.getByRole("region", { name: "Today" });
    await user.click(within(today).getByRole("button", { name: "Remove from history" }));
    expect(onRemove).toHaveBeenCalledWith("t");

    await user.click(screen.getByRole("button", { name: "Clear history" }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it("closes from its close button", async () => {
    const { onOpenChange, user } = setup();
    await user.click(screen.getByRole("button", { name: "Close history" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("says what will appear when empty, with nothing to clear", () => {
    setup({ entries: [] });
    expect(screen.getByText("Your recent analyses will appear here.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear history" })).not.toBeInTheDocument();
  });
});
