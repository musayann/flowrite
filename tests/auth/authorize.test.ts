import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitError, authorize, clientIp, safeEqual } from "@/auth";
import { __resetAll } from "@/lib/rate-limit";

const USER = "yannick";
const PASS = "correct-horse";

function req(headers: Record<string, string> = { "x-forwarded-for": "203.0.113.7" }) {
  return new Request("http://localhost/api/auth/callback/credentials", { headers });
}

beforeEach(() => {
  vi.stubEnv("AUTH_USERNAME", USER);
  vi.stubEnv("AUTH_PASSWORD", PASS);
});

afterEach(() => {
  vi.unstubAllEnvs();
  __resetAll();
});

describe("clientIp", () => {
  it("takes the first x-forwarded-for entry and trims it", () => {
    expect(clientIp(req({ "x-forwarded-for": " 203.0.113.7 , 10.0.0.1 " }))).toBe(
      "203.0.113.7",
    );
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(req({ "x-real-ip": " 198.51.100.4 " }))).toBe("198.51.100.4");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    expect(
      clientIp(req({ "x-forwarded-for": "203.0.113.7", "x-real-ip": "198.51.100.4" })),
    ).toBe("203.0.113.7");
  });

  it("falls back to a shared bucket when no proxy header is present", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });

  it("falls back to a shared bucket when x-real-ip is blank", () => {
    expect(clientIp(req({ "x-real-ip": "   " }))).toBe("unknown");
  });
});

describe("safeEqual", () => {
  it("is true for identical strings", () => {
    expect(safeEqual("hunter2", "hunter2")).toBe(true);
  });

  it("is false for same-length different strings", () => {
    expect(safeEqual("hunter2", "hunter3")).toBe(false);
  });

  it("is false for different-length strings without throwing", () => {
    // timingSafeEqual throws on mismatched buffers; the length branch must
    // absorb that and still return a boolean.
    expect(() => safeEqual("short", "much longer value")).not.toThrow();
    expect(safeEqual("short", "much longer value")).toBe(false);
  });

  it("handles empty strings", () => {
    expect(safeEqual("", "")).toBe(true);
    expect(safeEqual("", "x")).toBe(false);
  });

  it("compares by bytes, not code units", () => {
    expect(safeEqual("café", "café")).toBe(true);
    expect(safeEqual("café", "cafe")).toBe(false);
  });
});

describe("authorize", () => {
  it("returns the single user for correct credentials", () => {
    expect(authorize({ username: USER, password: PASS }, req())).toEqual({
      id: "1",
      name: USER,
    });
  });

  it.each([
    ["a wrong password", { username: USER, password: "nope" }],
    ["a wrong username", { username: "someone", password: PASS }],
    ["both wrong", { username: "someone", password: "nope" }],
    ["missing credentials", {}],
    ["non-string credentials", { username: 1, password: true }],
  ])("returns null for %s", (_label, credentials) => {
    expect(authorize(credentials, req())).toBeNull();
  });

  it("throws when the account environment variables are not configured", () => {
    vi.stubEnv("AUTH_USERNAME", "");
    expect(() => authorize({ username: USER, password: PASS }, req())).toThrow(
      /AUTH_USERNAME and AUTH_PASSWORD must be set/,
    );
  });

  it("throws when only the password is missing", () => {
    vi.stubEnv("AUTH_PASSWORD", "");
    expect(() => authorize({ username: USER, password: PASS }, req())).toThrow(
      /AUTH_USERNAME and AUTH_PASSWORD must be set/,
    );
  });

  describe("brute-force throttling", () => {
    it("throws RateLimitError on the failure that trips the limit", () => {
      for (let i = 0; i < 5; i++) {
        expect(authorize({ username: USER, password: "nope" }, req())).toBeNull();
      }
      expect(() => authorize({ username: USER, password: "nope" }, req())).toThrow(
        RateLimitError,
      );
    });

    it("surfaces a rate_limited code the login page can distinguish", () => {
      for (let i = 0; i < 6; i++) {
        try {
          authorize({ username: USER, password: "nope" }, req());
        } catch (err) {
          expect((err as RateLimitError).code).toBe("rate_limited");
        }
      }
    });

    it("rejects a locked-out IP even with correct credentials", () => {
      for (let i = 0; i < 6; i++) {
        try {
          authorize({ username: USER, password: "nope" }, req());
        } catch {
          /* expected once locked */
        }
      }
      expect(() => authorize({ username: USER, password: PASS }, req())).toThrow(
        RateLimitError,
      );
    });

    it("throttles per IP, so one attacker doesn't lock everyone out", () => {
      const attacker = req({ "x-forwarded-for": "203.0.113.7" });
      const bystander = req({ "x-forwarded-for": "198.51.100.4" });
      for (let i = 0; i < 6; i++) {
        try {
          authorize({ username: USER, password: "nope" }, attacker);
        } catch {
          /* expected once locked */
        }
      }
      expect(authorize({ username: USER, password: PASS }, bystander)).toEqual({
        id: "1",
        name: USER,
      });
    });

    it("clears the failure count after a successful login", () => {
      for (let i = 0; i < 5; i++) {
        authorize({ username: USER, password: "nope" }, req());
      }
      expect(authorize({ username: USER, password: PASS }, req())).not.toBeNull();
      // Five fresh attempts are available again.
      for (let i = 0; i < 5; i++) {
        expect(authorize({ username: USER, password: "nope" }, req())).toBeNull();
      }
    });
  });
});
