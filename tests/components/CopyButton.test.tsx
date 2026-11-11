import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import CopyButton from "@/components/CopyButton";

const TEXT = "The cat sat on the mat.";

let writeText: ReturnType<typeof vi.fn>;

function setup() {
  render(<CopyButton text={TEXT} />);
  return screen.getByRole("button", { name: /copy/i });
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

describe("copying", () => {
  it("copies the text", async () => {
    await click(setup());
    expect(writeText).toHaveBeenCalledWith(TEXT);
  });

  it("confirms the copy, then reverts after 1.5s", async () => {
    const button = setup();
    await click(button);
    expect(button).toHaveTextContent("Copied");

    await act(async () => {
      vi.advanceTimersByTime(1_500);
    });
    expect(button).toHaveTextContent("Copy");
  });

  it("keeps the confirmation visible until the timeout elapses", async () => {
    const button = setup();
    await click(button);
    await act(async () => {
      vi.advanceTimersByTime(1_400);
    });
    expect(button).toHaveTextContent("Copied");
  });

  it("stays un-copied and does not throw when the clipboard is unavailable", async () => {
    writeText.mockRejectedValue(new Error("permission denied"));
    const button = setup();
    await click(button);
    expect(button).toHaveTextContent("Copy");
    expect(button).not.toHaveTextContent("Copied");
  });
});

describe("labelling", () => {
  it("can say what it copies, and still confirms the copy", async () => {
    render(<CopyButton text={TEXT} label="Copy corrected" variant="default" />);
    const button = screen.getByRole("button", { name: "Copy corrected" });
    expect(button).toHaveAttribute("data-variant", "default");
    await click(button);
    expect(button).toHaveTextContent("Copied");
  });

  it("is a ghost button by default", () => {
    expect(setup()).toHaveAttribute("data-variant", "ghost");
  });
});
