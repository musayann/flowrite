import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";
import { LOCALE } from "@/lib/constants";

describe("cn", () => {
  it("merges conflicting tailwind classes, last one wins", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsey values and keeps non-conflicting classes", () => {
    expect(cn("flex", false && "hidden", undefined, "gap-2")).toBe("flex gap-2");
  });
});

describe("LOCALE", () => {
  it("is British English", () => {
    expect(LOCALE).toBe("en-GB");
  });
});
