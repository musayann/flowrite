import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ComposeView from "@/components/ComposeView";
import { CATEGORIES } from "@/lib/schema";
import type { HistoryEntry } from "@/lib/history";
import { makeIssue, makeResult } from "../fixtures";

const entry = (id: string, input: string, issues = 1): HistoryEntry => ({
  id,
  input,
  result: makeResult({ issues: Array.from({ length: issues }, () => makeIssue()) }),
  createdAt: Date.UTC(2026, 10, 10, 16, 5),
});

function setup(props: Partial<Parameters<typeof ComposeView>[0]> = {}) {
  const handlers = {
    onInputChange: vi.fn(),
    onSubmit: vi.fn(),
    onSelectEntry: vi.fn(),
    onShowHistory: vi.fn(),
  };
  render(
    <ComposeView
      input=""
      loading={false}
      error={null}
      history={[]}
      {...handlers}
      {...props}
    />,
  );
  return { ...handlers, user: userEvent.setup() };
}

describe("ComposeView", () => {
  it("introduces the app above the form", () => {
    setup();
    expect(
      screen.getByRole("heading", { level: 1, name: "Sharpen your sentences" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Your text" })).toBeInTheDocument();
  });

  it("lists every category it looks at", () => {
    setup();
    const list = screen.getByRole("region", { name: "What it looks at" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(CATEGORIES.length);
    expect(list).toHaveTextContent("Information flow");
  });

  it("shows no Recent section without history", () => {
    setup();
    expect(screen.queryByRole("region", { name: "Recent" })).not.toBeInTheDocument();
  });

  it("shows the three most recent texts, with their issue counts", () => {
    setup({
      history: [
        entry("a", "first", 2),
        entry("b", "second", 1),
        entry("c", "third"),
        entry("d", "fourth"),
      ],
    });
    const recent = screen.getByRole("region", { name: "Recent" });
    const items = within(recent).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("first2 issues · 10 Nov, 16:05");
    expect(items[1]).toHaveTextContent("1 issue ·");
    expect(recent).not.toHaveTextContent("fourth");
  });

  it("opens a recent text, or the whole history", async () => {
    const history = [entry("a", "first")];
    const { onSelectEntry, onShowHistory, user } = setup({ history });
    await user.click(screen.getByRole("button", { name: /first/ }));
    expect(onSelectEntry).toHaveBeenCalledWith(history[0]);
    await user.click(screen.getByRole("button", { name: "See all" }));
    expect(onShowHistory).toHaveBeenCalledTimes(1);
  });

  it("explains a failed analysis", () => {
    setup({ error: "Too long." });
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn’t analyseToo long.");
  });
});
