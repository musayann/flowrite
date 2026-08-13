import { describe, expect, it } from "vitest";
import manifest from "@/app/manifest";
import { LOCALE } from "@/lib/constants";

describe("web app manifest", () => {
  it("declares the app identity", () => {
    const m = manifest();
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.description).toBeTruthy();
  });

  it("is installable as a standalone app from the root", () => {
    const m = manifest();
    expect(m.start_url).toBe("/");
    expect(m.display).toBe("standalone");
  });

  it("uses the app locale", () => {
    expect(manifest().lang).toBe(LOCALE);
    expect(manifest().dir).toBe("ltr");
  });

  it("ships a maskable icon, which Android requires for an adaptive launcher", () => {
    const maskable = manifest().icons?.filter((i) => i.purpose === "maskable");
    expect(maskable?.length).toBeGreaterThan(0);
  });

  it("ships the 192 and 512 icon sizes PWA installability needs", () => {
    const sizes = manifest().icons?.map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("gives every icon a src and a type", () => {
    for (const icon of manifest().icons ?? []) {
      expect(icon.src).toBeTruthy();
      expect(icon.type).toBeTruthy();
    }
  });
});
