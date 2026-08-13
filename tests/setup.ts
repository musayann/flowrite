import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// --- jsdom gaps the components under test actually hit ---------------------

// radix Tooltip (HighlightedText) and ScrollArea (HistoryList).
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// HighlightedText scrolls to the matching IssueCard on click.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

// HistoryList scrolls the page to the top when an entry is selected.
window.scrollTo = vi.fn();

// next-themes (ModeToggle) probes the colour-scheme preference.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as unknown as typeof window.matchMedia;

// radix dropdown (ModeToggle) uses the Pointer Capture API.
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
