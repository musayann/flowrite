import { describe, expect, it } from "vitest";
import type { Session } from "next-auth";
import type { NextRequest } from "next/server";
import { authorized } from "@/auth";

const SESSION = { user: { name: "yannick" }, expires: "2099-01-01" } as Session;

function gate(pathname: string, auth: Session | null) {
  return authorized({
    auth,
    request: { nextUrl: new URL(`http://localhost${pathname}`) } as NextRequest,
  });
}

function locationOf(result: boolean | Response) {
  expect(result).toBeInstanceOf(Response);
  const res = result as Response;
  expect(res.status).toBeGreaterThanOrEqual(300);
  expect(res.status).toBeLessThan(400);
  return new URL(res.headers.get("location") as string);
}

describe("authorized", () => {
  describe("signed out", () => {
    it.each(["/", "/settings", "/anything"])(
      "redirects %s to the login page",
      (pathname) => {
        expect(locationOf(gate(pathname, null)).pathname).toBe("/login");
      },
    );

    it("redirects without a callbackUrl parameter", () => {
      // Returning `false` would make NextAuth append ?callbackUrl; there is only
      // one destination in this app, so the redirect must stay clean.
      expect(locationOf(gate("/", null)).search).toBe("");
    });

    it("allows the login page through", () => {
      expect(gate("/login", null)).toBe(true);
    });

    it("allows nested login routes through", () => {
      expect(gate("/login/reset", null)).toBe(true);
    });
  });

  describe("signed in", () => {
    it.each(["/", "/settings"])("allows %s", (pathname) => {
      expect(gate(pathname, SESSION)).toBe(true);
    });

    it("redirects away from the login page to the app root", () => {
      expect(locationOf(gate("/login", SESSION)).pathname).toBe("/");
    });
  });

  it("treats a session without a user as signed out", () => {
    expect(locationOf(gate("/", { expires: "2099-01-01" } as Session)).pathname).toBe(
      "/login",
    );
  });

  it("preserves the origin when redirecting", () => {
    const result = authorized({
      auth: null,
      request: { nextUrl: new URL("https://flowrite.example/app") } as NextRequest,
    });
    expect(locationOf(result).origin).toBe("https://flowrite.example");
  });
});
