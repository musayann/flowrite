import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import VersionPanel from "@/components/VersionPanel";

const CORRECTED = "The cat sat on the mat.";
const NATURAL = "The cat was sitting on the mat.";
const NOTE = "Reordered for flow.";

let writeText: ReturnType<typeof vi.fn>;

function setup(overrides: Partial<React.ComponentProps<typeof VersionPanel>> = {}) {
  render(
    <VersionPanel
      correctedVersion={CORRECTED}
      naturalVersion={NATURAL}
      naturalNote={NOTE}
      {...overrides}
    />,
  );
  return { copyButtons: screen.getAllByRole("button", { name: /copy/i }) };
}

/**
 * Click and flush the awaited `navigator.clipboard.writeText` promise.
 * `fireEvent` is used rather than `user-event`, whose internal delays don't
 * cooperate with fake timers.
 */
async function click(button: HTMLElement) {
  fireEvent.click(button);
  await act(async () => {});
}

beforeEach(() => {
  vi.useFakeTimers();
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("content", () => {
  it("shows both rewrites", () => {
    setup();
    expect(screen.getByText(CORRECTED)).toBeInTheDocument();
    expect(screen.getByText(NATURAL)).toBeInTheDocument();
  });

  it("labels the two versions", () => {
    setup();
    expect(screen.getByText("Corrected")).toBeInTheDocument();
    expect(screen.getByText("More natural")).toBeInTheDocument();
  });

  it("shows the note explaining the natural rewrite", () => {
    setup();
    expect(screen.getByText(NOTE)).toBeInTheDocument();
  });

  it("hides the note when the model didn't supply one", () => {
    setup({ naturalNote: "" });
    expect(screen.queryByText(NOTE)).not.toBeInTheDocument();
  });

  it("offers a copy button per version", () => {
    expect(setup().copyButtons).toHaveLength(2);
  });
});

describe("copying", () => {
  it("copies the corrected version", async () => {
    const { copyButtons } = setup();
    await click(copyButtons[0]);
    expect(writeText).toHaveBeenCalledWith(CORRECTED);
  });

  it("copies the natural version", async () => {
    const { copyButtons } = setup();
    await click(copyButtons[1]);
    expect(writeText).toHaveBeenCalledWith(NATURAL);
  });

  it("confirms the copy, then reverts after 1.5s", async () => {
    const { copyButtons } = setup();
    await click(copyButtons[0]);
    expect(copyButtons[0]).toHaveTextContent("Copied");

    await act(async () => {
      vi.advanceTimersByTime(1_500);
    });
    expect(copyButtons[0]).toHaveTextContent("Copy");
  });

  it("keeps the confirmation visible until the timeout elapses", async () => {
    const { copyButtons } = setup();
    await click(copyButtons[0]);
    await act(async () => {
      vi.advanceTimersByTime(1_400);
    });
    expect(copyButtons[0]).toHaveTextContent("Copied");
  });

  it("confirms each button independently", async () => {
    const { copyButtons } = setup();
    await click(copyButtons[0]);
    expect(copyButtons[0]).toHaveTextContent("Copied");
    expect(copyButtons[1]).toHaveTextContent("Copy");
  });

  it("stays un-copied and does not throw when the clipboard is unavailable", async () => {
    writeText.mockRejectedValue(new Error("permission denied"));
    const { copyButtons } = setup();
    await click(copyButtons[0]);
    expect(copyButtons[0]).toHaveTextContent("Copy");
    expect(copyButtons[0]).not.toHaveTextContent("Copied");
  });
});
