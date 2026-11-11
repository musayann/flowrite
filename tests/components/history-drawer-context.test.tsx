import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  HistoryButton,
  HistoryDrawerProvider,
  useHistoryDrawer,
} from "@/components/history-drawer-context";

function Probe() {
  const { open, openedAt, setOpen } = useHistoryDrawer();
  return (
    <>
      <output>{`${open}:${openedAt}`}</output>
      <button type="button" onClick={() => setOpen(false)}>
        close
      </button>
    </>
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("history drawer context", () => {
  it("opens from the History button and records when", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1234);
    render(
      <HistoryDrawerProvider>
        <HistoryButton />
        <Probe />
      </HistoryDrawerProvider>,
    );
    const user = userEvent.setup();
    const button = screen.getByRole("button", { name: "History" });
    expect(screen.getByRole("status")).toHaveTextContent("false:0");
    expect(button).toHaveAttribute("aria-expanded", "false");

    await user.click(button);
    expect(screen.getByRole("status")).toHaveTextContent("true:1234");
    expect(button).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("button", { name: "close" }));
    expect(screen.getByRole("status")).toHaveTextContent("false:1234");
  });

  it("refuses to be used outside its provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/HistoryDrawerProvider/);
  });
});
