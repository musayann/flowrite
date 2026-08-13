import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ModeToggle } from "@/components/mode-toggle";

const setTheme = vi.fn();

vi.mock("next-themes", () => ({
  useTheme: () => ({ setTheme, theme: "system" }),
}));

async function openMenu() {
  const user = userEvent.setup();
  render(<ModeToggle />);
  await user.click(screen.getByRole("button"));
  return user;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ModeToggle", () => {
  it("renders an accessibly-labelled trigger", () => {
    render(<ModeToggle />);
    expect(screen.getByRole("button")).toHaveAccessibleName(/theme/i);
  });

  it("offers the three theme choices", async () => {
    await openMenu();
    for (const name of ["Light", "Dark", "System"]) {
      expect(await screen.findByRole("menuitem", { name })).toBeInTheDocument();
    }
  });

  it.each([
    ["Light", "light"],
    ["Dark", "dark"],
    ["System", "system"],
  ])("applies the %s theme", async (label, expected) => {
    const user = await openMenu();
    await user.click(await screen.findByRole("menuitem", { name: label }));
    expect(setTheme).toHaveBeenCalledWith(expected);
  });
});
