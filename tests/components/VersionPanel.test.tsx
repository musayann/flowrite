import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import VersionPanel from "@/components/VersionPanel";

const NATURAL = "The cat was sitting on the mat.";
const NOTE = "Reordered for flow.";

let writeText: ReturnType<typeof vi.fn>;

function setup(overrides: Partial<React.ComponentProps<typeof VersionPanel>> = {}) {
  render(
    <VersionPanel naturalVersion={NATURAL} naturalNote={NOTE} {...overrides} />,
  );
  return { copyButtons: screen.getAllByRole("button", { name: /copy/i }) };
}

beforeEach(() => {
  writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  });
});

describe("content", () => {
  it("shows the natural rewrite", () => {
    setup();
    expect(screen.getByText(NATURAL)).toBeInTheDocument();
  });

  it("labels the version", () => {
    setup();
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
});

describe("copying", () => {
  it("offers one copy button, which copies the natural version", async () => {
    const { copyButtons } = setup();
    expect(copyButtons).toHaveLength(1);
    fireEvent.click(copyButtons[0]);
    await act(async () => {});
    expect(writeText).toHaveBeenCalledWith(NATURAL);
  });
});
