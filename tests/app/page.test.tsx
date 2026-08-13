import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/app/page";
import { makeIssue, makeResult } from "../fixtures";

const loadHistory = vi.fn();
const addHistory = vi.fn();
const removeHistory = vi.fn();

vi.mock("@/lib/history", () => ({
  loadHistory: () => loadHistory(),
  addHistory: (input: string, result: unknown) => addHistory(input, result),
  removeHistory: (id: string) => removeHistory(id),
}));

const RESULT = makeResult({
  issues: [makeIssue({ excerpt: "cat", start: 4, end: 7 })],
  correctedVersion: "The cat sat.",
  naturalVersion: "A cat was sitting.",
  naturalNote: "Smoother phrasing.",
});

const fetchMock = vi.fn();

function setup() {
  render(
    <TooltipProvider>
      <Home />
    </TooltipProvider>,
  );
  return {
    user: userEvent.setup(),
    textarea: screen.getByRole("textbox"),
    submit: screen.getByRole("button", { name: /analyse/i }),
  };
}

/** Resolve the next fetch with a given status and JSON body. */
function respond(body: unknown, { ok = true, status = 200 } = {}) {
  fetchMock.mockResolvedValue({ ok, status, json: async () => body });
}

async function analyse(text = "The cat sat") {
  const { user, textarea, submit } = setup();
  await user.type(textarea, text);
  await user.click(submit);
  return { user, textarea, submit };
}

beforeEach(() => {
  loadHistory.mockReturnValue([]);
  addHistory.mockReturnValue([]);
  removeHistory.mockReturnValue([]);
  vi.stubGlobal("fetch", fetchMock);
  respond({ result: RESULT });
});

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("initial render", () => {
  it("shows the page heading and an empty form", () => {
    const { textarea, submit } = setup();
    expect(
      screen.getByRole("heading", { name: /sharpen your sentences/i }),
    ).toBeInTheDocument();
    expect(textarea).toHaveValue("");
    expect(submit).toBeDisabled();
  });

  it("loads history from storage after mount", async () => {
    loadHistory.mockReturnValue([
      { id: "a", input: "stored text", result: makeResult(), createdAt: Date.now() },
    ]);
    setup();
    expect(await screen.findByText("stored text")).toBeInTheDocument();
  });

  it("shows no results before anything is analysed", () => {
    setup();
    expect(screen.queryByText("Rewrites")).not.toBeInTheDocument();
  });
});

describe("analysing", () => {
  it("posts the trimmed text to the API", async () => {
    const { user, textarea, submit } = setup();
    await user.type(textarea, "  spaced  ");
    await user.click(submit);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock).toHaveBeenCalledWith("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "spaced" }),
    });
  });

  it("renders the issues and the rewrites", async () => {
    await analyse();
    expect(await screen.findByText("Rewrites")).toBeInTheDocument();
    expect(screen.getByText("The cat sat.")).toBeInTheDocument();
    expect(screen.getByText("A cat was sitting.")).toBeInTheDocument();
    expect(screen.getByText(/Issues/)).toHaveTextContent("(1)");
  });

  it("saves the analysis to history", async () => {
    await analyse();
    await waitFor(() =>
      expect(addHistory).toHaveBeenCalledWith("The cat sat", RESULT),
    );
  });

  it("reports when the text has no issues", async () => {
    respond({ result: makeResult({ issues: [] }) });
    await analyse();
    expect(await screen.findByText("No issues found")).toBeInTheDocument();
  });

  it("clears the loading state when the request finishes", async () => {
    const { submit } = await analyse();
    await waitFor(() => expect(submit).toHaveTextContent("Analyse"));
  });
});

describe("error handling", () => {
  it("surfaces the error message from the API", async () => {
    respond({ error: "Text is too long (max 1500 characters)." }, {
      ok: false,
      status: 400,
    });
    await analyse();
    expect(
      await screen.findByText("Text is too long (max 1500 characters)."),
    ).toBeInTheDocument();
  });

  it("falls back to a generic message when the API sends no error text", async () => {
    respond({}, { ok: false, status: 500 });
    await analyse();
    expect(await screen.findByText("Something went wrong.")).toBeInTheDocument();
  });

  it("reports a network failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await analyse();
    expect(
      await screen.findByText("Network error. Please try again."),
    ).toBeInTheDocument();
  });

  it("does not save a failed analysis to history", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    await analyse();
    await screen.findByText("Network error. Please try again.");
    expect(addHistory).not.toHaveBeenCalled();
  });

  it("clears the loading state after a failure", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { submit } = await analyse();
    await waitFor(() => expect(submit).toHaveTextContent("Analyse"));
  });

  it("clears a previous error on the next successful run", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { user, submit } = await analyse();
    await screen.findByText("Network error. Please try again.");

    respond({ result: RESULT });
    await user.click(submit);
    await waitFor(() =>
      expect(
        screen.queryByText("Network error. Please try again."),
      ).not.toBeInTheDocument(),
    );
  });
});

describe("history interaction", () => {
  it("restores a stored analysis without calling the API", async () => {
    loadHistory.mockReturnValue([
      { id: "a", input: "stored text", result: RESULT, createdAt: Date.now() },
    ]);
    const { user } = setup();
    await user.click(await screen.findByText("stored text"));

    expect(screen.getByRole("textbox")).toHaveValue("stored text");
    expect(screen.getByText("The cat sat.")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("removes an entry from the list", async () => {
    loadHistory.mockReturnValue([
      { id: "doomed", input: "stored text", result: RESULT, createdAt: Date.now() },
    ]);
    const { user } = setup();
    await user.click(
      await screen.findByRole("button", { name: "Remove from history" }),
    );
    expect(removeHistory).toHaveBeenCalledWith("doomed");
    await waitFor(() =>
      expect(screen.queryByText("stored text")).not.toBeInTheDocument(),
    );
  });
});
