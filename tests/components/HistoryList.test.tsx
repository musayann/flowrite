import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HistoryList from "@/components/HistoryList";
import type { HistoryEntry } from "@/lib/history";
import { makeIssue, makeResult } from "../fixtures";

function entry(overrides: Partial<HistoryEntry> = {}): HistoryEntry {
  return {
    id: "id-1",
    input: "The cat sat on the mat.",
    result: makeResult(),
    createdAt: Date.parse("2026-08-13T14:30:00Z"),
    ...overrides,
  };
}

function setup(entries: HistoryEntry[] = [entry()]) {
  const onSelect = vi.fn();
  const onRemove = vi.fn();
  render(
    <HistoryList entries={entries} onSelect={onSelect} onRemove={onRemove} />,
  );
  return {
    onSelect,
    onRemove,
    user: userEvent.setup(),
    // Anchored so it can't match the "Remove from history" buttons.
    toggle: screen.getByRole("button", { name: /^History/ }),
  };
}

describe("empty state", () => {
  it("explains where history comes from", () => {
    setup([]);
    expect(
      screen.getByText(/recent analyses will appear here/i),
    ).toBeInTheDocument();
  });

  it("does not show a count", () => {
    const { toggle } = setup([]);
    expect(toggle).toHaveTextContent(/^History$/);
  });
});

describe("entry list", () => {
  it("shows the count alongside the heading", () => {
    const { toggle } = setup([entry({ id: "a" }), entry({ id: "b" })]);
    expect(toggle).toHaveTextContent("(2)");
  });

  it("shows the analysed text", () => {
    setup();
    expect(screen.getByText("The cat sat on the mat.")).toBeInTheDocument();
  });

  it("renders one row per entry", () => {
    setup([entry({ id: "a" }), entry({ id: "b" }), entry({ id: "c" })]);
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  it.each([
    [0, "0 issues"],
    [1, "1 issue"],
    [2, "2 issues"],
  ])("pluralises %i as %s", (count, expected) => {
    setup([
      entry({ result: makeResult({ issues: Array.from({ length: count }, () => makeIssue()) }) }),
    ]);
    const row = screen.getAllByRole("listitem")[0];
    expect(within(row).getByText(new RegExp(expected))).toBeInTheDocument();
  });

  it("formats the timestamp in en-GB order rather than the browser locale", () => {
    setup();
    // en-GB renders "13 Aug 2026, 14:30"; en-US would be "Aug 13, 2026, 2:30 PM".
    const row = screen.getAllByRole("listitem")[0];
    expect(row).toHaveTextContent(/\d{1,2} \w{3} \d{4}, \d{2}:\d{2}/);
    expect(row).not.toHaveTextContent(/[AP]M/);
  });
});

describe("selecting an entry", () => {
  it("hands the whole entry back to the page", async () => {
    const target = entry({ id: "target" });
    const { user, onSelect } = setup([target]);
    await user.click(screen.getByText(target.input));
    expect(onSelect).toHaveBeenCalledWith(target);
  });

  it("scrolls the page back to the top", async () => {
    const { user } = setup();
    await user.click(screen.getByText("The cat sat on the mat."));
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("collapses the mobile disclosure after choosing", async () => {
    const { user, toggle } = setup();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(screen.getByText("The cat sat on the mat."));
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});

describe("removing an entry", () => {
  it("reports the id to remove", async () => {
    const { user, onRemove } = setup([entry({ id: "doomed" })]);
    await user.click(screen.getByRole("button", { name: "Remove from history" }));
    expect(onRemove).toHaveBeenCalledWith("doomed");
  });

  it("does not also select the entry", async () => {
    const { user, onSelect } = setup();
    await user.click(screen.getByRole("button", { name: "Remove from history" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("offers one remove button per entry", () => {
    setup([entry({ id: "a" }), entry({ id: "b" })]);
    expect(
      screen.getAllByRole("button", { name: "Remove from history" }),
    ).toHaveLength(2);
  });
});

describe("mobile disclosure", () => {
  it("starts collapsed", () => {
    expect(setup().toggle).toHaveAttribute("aria-expanded", "false");
  });

  it("toggles open and shut", async () => {
    const { user, toggle } = setup();
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
  });
});
