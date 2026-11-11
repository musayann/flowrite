import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import {
  HistoryButton,
  HistoryDrawerProvider,
} from "@/components/history-drawer-context";
import { BrandLink, NewTextProvider } from "@/components/new-text-context";
import type { HistoryEntry } from "@/lib/history";
import type { AnalysisResult } from "@/lib/schema";
import { makeIssue, makeResult } from "../fixtures";

// An in-memory stand-in for the history store, so tests control what's saved.
let entries: HistoryEntry[] = [];
const listeners = new Set<() => void>();
function save(next: HistoryEntry[]) {
  entries = next;
  listeners.forEach((listener) => listener());
  return next;
}
const addHistory = vi.fn((input: string, result: AnalysisResult) =>
  save([
    { id: `saved-${input}`, input, result, createdAt: Date.now() },
    ...entries.filter((e) => e.input !== input),
  ]),
);
const removeHistory = vi.fn((id: string) => save(entries.filter((e) => e.id !== id)));
const clearHistory = vi.fn(() => save([]));

vi.mock("next/link", () => import("../next-link"));
vi.mock("next/navigation", () => import("../next-navigation"));

vi.mock("@/lib/history", () => ({
  addHistory: (input: string, result: AnalysisResult) => addHistory(input, result),
  removeHistory: (id: string) => removeHistory(id),
  clearHistory: () => clearHistory(),
  subscribeHistory: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getHistorySnapshot: () => entries,
  getServerHistorySnapshot: () => [],
}));

const RESULT = makeResult({
  issues: [
    makeIssue({ excerpt: "sat", start: -1, end: -1, category: "word-choice" }),
    makeIssue({ excerpt: "cat", start: -1, end: -1, category: "article" }),
  ],
  correctedVersion: "The fat cat sits.",
  naturalVersion: "A cat was sitting.",
  naturalNote: "Smoother phrasing.",
});

const stored = (id: string, input: string, result = RESULT): HistoryEntry => ({
  id,
  input,
  result,
  createdAt: Date.now(),
});

const fetchMock = vi.fn();

const app = (
  <HistoryDrawerProvider>
    <NewTextProvider>
      <BrandLink />
      <HistoryButton />
      <Home />
    </NewTextProvider>
  </HistoryDrawerProvider>
);

function setup() {
  render(app);
  return { user: userEvent.setup() };
}

/** The text the URL names, if any. */
const textParam = () => new URLSearchParams(window.location.search).get("text");

const textbox = () => screen.getByRole("textbox", { name: "Your text" });
const submit = () => screen.getByRole("button", { name: /^Analys/ });
const heading = () => screen.getByRole("heading", { level: 1 });

/** Resolve the next fetch with a given status and JSON body. */
function respond(body: unknown, { ok = true, status = 200 } = {}) {
  fetchMock.mockResolvedValue({ ok, status, json: async () => body });
}

async function analyse(text = "The cat sat.") {
  const { user } = setup();
  await user.type(textbox(), text);
  await user.click(submit());
  return { user };
}

/** Analyse, and wait for the review screen. */
async function review(text = "The cat sat.") {
  const view = await analyse(text);
  await screen.findByRole("tablist");
  return view;
}

beforeEach(() => {
  entries = [];
  listeners.clear();
  window.history.replaceState(null, "", "/");
  vi.stubGlobal("fetch", fetchMock);
  respond({ result: RESULT });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("compose", () => {
  it("starts on the form, empty", () => {
    setup();
    expect(heading()).toHaveTextContent("Sharpen your sentences");
    expect(textbox()).toHaveValue("");
    expect(submit()).toBeDisabled();
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("lists recent texts from history", () => {
    entries = [stored("a", "stored text")];
    setup();
    const recent = screen.getByRole("region", { name: "Recent" });
    expect(recent).toHaveTextContent("stored text");
  });
});

describe("analysing", () => {
  it("posts the trimmed text to the API", async () => {
    await analyse("  spaced  ");
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "spaced" }),
    });
  });

  it("says it is analysing while the request runs", async () => {
    let finish!: () => void;
    fetchMock.mockReturnValue(
      new Promise((resolve) => {
        finish = () => resolve({ ok: true, status: 200, json: async () => ({ result: RESULT }) });
      }),
    );
    await analyse();
    expect(submit()).toHaveTextContent("Analysing…");
    expect(submit()).toBeDisabled();
    finish();
    await screen.findByRole("tablist");
  });

  it("moves to the review, with the text shown once", async () => {
    await review();
    expect(heading()).toHaveTextContent("2 things a careful reader would stumble over");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("The cat1 sat2.");
  });

  it("numbers issues in the order they appear in the text", async () => {
    await review();
    const margin = screen.getByRole("complementary", { name: "Issues" });
    const [first, second] = within(margin).getAllByRole("article");
    expect(first).toHaveTextContent("Article");
    expect(second).toHaveTextContent("Word choice");
  });

  it("opens a note from its number in the text, with its fix", async () => {
    const { user } = await review();
    await user.click(screen.getByRole("button", { name: "Issue 2, word choice" }));
    const note = document.getElementById("issue-1")!;
    expect(within(note).getByRole("button", { expanded: true })).toBeInTheDocument();
    expect(note.querySelector("del")).toHaveTextContent("sat");
    expect(note.querySelector("ins")).toHaveTextContent("sits");
  });

  it("shows every change in the corrected reading", async () => {
    const { user } = await review();
    await user.click(screen.getByRole("tab", { name: "Corrected" }));
    const panel = screen.getByRole("tabpanel");
    // "fat " is inserted right at the edge of the "cat" excerpt, so it is
    // issue 1's change and its number follows it.
    expect(panel.querySelector("p")).toHaveTextContent("The fat1 cat satsits2.");
  });

  it("saves the analysis to history and marks it current", async () => {
    const { user } = await review();
    expect(addHistory).toHaveBeenCalledWith("The cat sat.", RESULT);
    await user.click(screen.getByRole("button", { name: "History" }));
    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: /The cat sat\./ }),
    ).toHaveAttribute("aria-current", "true");
  });

  it("reports when the text has no issues", async () => {
    respond({ result: makeResult({ issues: [] }) });
    await review();
    expect(screen.getByText("No issues found")).toBeInTheDocument();
  });
});

describe("leaving the review", () => {
  it("goes back to the form with the text, to edit it", async () => {
    const { user } = await review();
    await user.click(screen.getByRole("button", { name: "Edit" }));
    expect(textbox()).toHaveValue("The cat sat.");
  });

  it("starts over with an empty form", async () => {
    const { user } = await review();
    await user.click(screen.getByRole("button", { name: "New text" }));
    expect(textbox()).toHaveValue("");
  });

  it("starts over from the brand too", async () => {
    const { user } = await review();
    await user.click(screen.getByRole("link", { name: "Flowrite" }));
    expect(textbox()).toHaveValue("");
  });

  it("keeps a draft on the form when the brand is clicked", async () => {
    const { user } = setup();
    await user.type(textbox(), "Half a thought");
    await user.click(screen.getByRole("link", { name: "Flowrite" }));
    expect(textbox()).toHaveValue("Half a thought");
  });

  it("copies the corrected text", async () => {
    const { user } = await review();
    await user.click(screen.getByRole("button", { name: "Copy corrected" }));
    expect(await navigator.clipboard.readText()).toBe("The fat cat sits.");
  });
});

describe("error handling", () => {
  it("surfaces the error message from the API", async () => {
    respond({ error: "Text is too long (max 1500 characters)." }, {
      ok: false,
      status: 400,
    });
    await analyse();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Text is too long (max 1500 characters).",
    );
  });

  it("falls back to a generic message when the API sends no error text", async () => {
    respond({}, { ok: false, status: 500 });
    await analyse();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
  });

  it("reports a network failure and keeps the text", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await analyse();
    expect(
      await screen.findByText("Network error. Please try again."),
    ).toBeInTheDocument();
    expect(textbox()).toHaveValue("The cat sat.");
    expect(submit()).toHaveTextContent("Analyse");
  });

  it("does not save a failed analysis to history", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await analyse();
    await screen.findByText("Network error. Please try again.");
    expect(addHistory).not.toHaveBeenCalled();
  });

  it("clears a previous error on the next run", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { user } = await analyse();
    await screen.findByText("Network error. Please try again.");

    respond({ result: RESULT });
    await user.click(submit());
    await screen.findByRole("tablist");
    await user.click(screen.getByRole("button", { name: "New text" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("history", () => {
  it("opens a stored analysis from the drawer without calling the API", async () => {
    entries = [stored("a", "The cat sat.")];
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "History" }));
    await user.click(
      within(screen.getByRole("dialog")).getByRole("button", { name: /The cat sat\./ }),
    );

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("tabpanel")).toHaveTextContent("The cat1 sat2.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("opens a recent text from the form", async () => {
    entries = [stored("a", "The cat sat.")];
    const { user } = setup();
    const recent = screen.getByRole("region", { name: "Recent" });
    await user.click(within(recent).getByRole("button", { name: /The cat sat\./ }));
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });

  it("opens the whole history from See all", async () => {
    entries = [stored("a", "stored text")];
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "See all" }));
    expect(screen.getByRole("dialog", { name: "History" })).toBeInTheDocument();
  });

  it("removes one entry, or all of them", async () => {
    entries = [stored("doomed", "first text"), stored("also", "second text")];
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "History" }));
    const dialog = screen.getByRole("dialog");

    await user.click(within(dialog).getAllByRole("button", { name: "Remove from history" })[0]);
    expect(removeHistory).toHaveBeenCalledWith("doomed");
    expect(dialog).not.toHaveTextContent("first text");

    await user.click(within(dialog).getByRole("button", { name: "Clear history" }));
    expect(clearHistory).toHaveBeenCalled();
    expect(dialog).toHaveTextContent("Your recent analyses will appear here.");
  });
});

describe("the URL", () => {
  it("names the text under review, and forgets it on leaving", async () => {
    const { user } = await review();
    expect(textParam()).toBe("saved-The cat sat.");
    await user.click(screen.getByRole("button", { name: "New text" }));
    expect(window.location.search).toBe("");
  });

  it("names a text opened from history", async () => {
    entries = [stored("a", "The cat sat.")];
    const { user } = setup();
    const recent = screen.getByRole("region", { name: "Recent" });
    await user.click(within(recent).getByRole("button", { name: /The cat sat\./ }));
    expect(textParam()).toBe("a");
  });

  it("comes back to the same text on refresh", () => {
    entries = [stored("a", "The cat sat.")];
    window.history.replaceState(null, "", "/?text=a");
    setup();
    expect(screen.getByRole("tabpanel")).toHaveTextContent("The cat1 sat2.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("goes back to the form, and forward to the text again", async () => {
    await review();
    window.history.back();
    expect(await screen.findByRole("textbox", { name: "Your text" })).toBeInTheDocument();
    window.history.forward();
    expect(await screen.findByRole("tablist")).toBeInTheDocument();
  });

  it("drops a text history doesn't have, and shows the form", () => {
    window.history.replaceState(null, "", "/?text=gone");
    setup();
    expect(textbox()).toBeInTheDocument();
    expect(window.location.search).toBe("");
  });

  it("doesn't flash the form while restoring a text", () => {
    entries = [stored("a", "The cat sat.")];
    window.history.replaceState(null, "", "/?text=a");
    // The server, and hydration, can't see history yet.
    expect(renderToString(app)).not.toContain("Your text");
  });
});
