import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";

const nextThemesProvider = vi.fn();

vi.mock("next-themes", () => ({
  ThemeProvider: (props: { children: React.ReactNode }) => {
    nextThemesProvider(props);
    return <>{props.children}</>;
  },
}));

describe("ThemeProvider", () => {
  it("renders its children", () => {
    render(
      <ThemeProvider>
        <p>app content</p>
      </ThemeProvider>,
    );
    expect(screen.getByText("app content")).toBeInTheDocument();
  });

  it("forwards configuration to next-themes", () => {
    render(
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <p>app content</p>
      </ThemeProvider>,
    );
    expect(nextThemesProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        attribute: "class",
        defaultTheme: "system",
        enableSystem: true,
      }),
    );
  });
});
