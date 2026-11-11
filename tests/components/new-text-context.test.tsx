import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  BrandLink,
  NewTextProvider,
  useNewText,
} from "@/components/new-text-context";
import { navigate } from "../next-link";

vi.mock("next/link", () => import("../next-link"));

function Page({ onNewText }: { onNewText: () => void }) {
  useNewText(onNewText);
  return null;
}

const brand = () => screen.getByRole("link", { name: "Flowrite" });

afterEach(() => {
  vi.clearAllMocks();
});

describe("brand link", () => {
  it("links home", () => {
    render(<BrandLink />);
    expect(brand()).toHaveAttribute("href", "/");
  });

  it("starts a new text in place while the page is showing", async () => {
    const onNewText = vi.fn();
    render(
      <NewTextProvider>
        <BrandLink />
        <Page onNewText={onNewText} />
      </NewTextProvider>,
    );
    await userEvent.setup().click(brand());
    expect(onNewText).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
  });

  it("navigates home from anywhere else", async () => {
    const onNewText = vi.fn();
    const { rerender } = render(
      <NewTextProvider>
        <BrandLink />
        <Page onNewText={onNewText} />
      </NewTextProvider>,
    );
    rerender(
      <NewTextProvider>
        <BrandLink />
      </NewTextProvider>,
    );
    await userEvent.setup().click(brand());
    expect(onNewText).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith("/");
  });

  it("is an ordinary link outside its provider", async () => {
    render(<BrandLink />);
    await userEvent.setup().click(brand());
    expect(navigate).toHaveBeenCalledWith("/");
  });
});
