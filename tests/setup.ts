import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

// --- jsdom gaps the components under test actually hit ---------------------

// radix primitives measure themselves with ResizeObserver.
if (!("ResizeObserver" in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Picking an issue in the text scrolls its note into view.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

// The page scrolls to the top when it switches between compose and review.
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
