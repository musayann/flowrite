import { describe, expect, it } from "vitest";
import { config } from "@/proxy";

/** Next compiles matcher entries to regexes; mirror that to test the pattern. */
const matcher = new RegExp(`^${config.matcher[0]}$`);
const matches = (pathname: string) => matcher.test(pathname);

describe("proxy matcher", () => {
  it("declares exactly one matcher", () => {
    expect(config.matcher).toHaveLength(1);
  });

  it.each(["/", "/login", "/settings", "/some/nested/page"])(
    "gates the page route %s",
    (pathname) => {
      expect(matches(pathname)).toBe(true);
    },
  );

  it.each([
    "/api/auth/session",
    "/api/auth/callback/credentials",
    "/api/auth/csrf",
    "/api/analyze",
  ])("leaves the API route %s alone", (pathname) => {
    // NextAuth's own endpoints must never be intercepted, or sign-in breaks.
    expect(matches(pathname)).toBe(false);
  });

  it.each(["/_next/static/chunks/main.js", "/_next/image"])(
    "skips the build asset %s",
    (pathname) => {
      expect(matches(pathname)).toBe(false);
    },
  );

  it.each([
    "/favicon.ico",
    "/icon.svg",
    "/apple-icon.png",
    "/icon-192.png",
    "/icon-maskable-512.png",
    "/manifest.webmanifest",
  ])("keeps the PWA asset %s publicly fetchable", (pathname) => {
    // Android/Chrome fetch these unauthenticated to offer app installation.
    expect(matches(pathname)).toBe(false);
  });
});
