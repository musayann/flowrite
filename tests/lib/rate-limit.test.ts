import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetAll,
  checkRateLimit,
  recordFailure,
  recordSuccess,
} from "@/lib/rate-limit";

const IP = "203.0.113.7";
const FREE_ATTEMPTS = 5;
const SECOND = 1_000;
const MINUTE = 60 * SECOND;

/** Burn `n` failed attempts and return the status of the last one. */
function fail(times: number, key = IP) {
  let status = recordFailure(key);
  for (let i = 1; i < times; i++) status = recordFailure(key);
  return status;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
});

afterEach(() => {
  // State lives in a module-level Map that outlives individual tests.
  __resetAll();
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("does not limit an unseen key", () => {
    expect(checkRateLimit("never-seen")).toEqual({ limited: false });
  });

  it("does not limit a key that has failures but no lockout", () => {
    fail(FREE_ATTEMPTS);
    expect(checkRateLimit(IP)).toEqual({ limited: false });
  });

  it("reports a shrinking retryAfterMs while locked", () => {
    fail(6);
    expect(checkRateLimit(IP)).toEqual({ limited: true, retryAfterMs: 30 * SECOND });
    vi.advanceTimersByTime(10 * SECOND);
    expect(checkRateLimit(IP)).toEqual({ limited: true, retryAfterMs: 20 * SECOND });
  });

  it("stops limiting once the lock window elapses", () => {
    fail(6);
    vi.advanceTimersByTime(30 * SECOND);
    expect(checkRateLimit(IP)).toEqual({ limited: false });
  });

  it("forgets an entry idle past the 1h TTL", () => {
    fail(6);
    vi.advanceTimersByTime(60 * MINUTE + SECOND);
    expect(checkRateLimit(IP)).toEqual({ limited: false });
    // The record was dropped, so the free attempts start over.
    expect(fail(FREE_ATTEMPTS)).toEqual({ limited: false });
  });
});

describe("recordFailure", () => {
  it("allows the first five failures without locking", () => {
    for (let i = 0; i < FREE_ATTEMPTS; i++) {
      expect(recordFailure(IP)).toEqual({ limited: false });
    }
  });

  it("locks on the sixth failure", () => {
    expect(fail(6)).toEqual({ limited: true, retryAfterMs: 30 * SECOND });
  });

  it.each([
    [6, 30 * SECOND],
    [7, 60 * SECOND],
    [8, 120 * SECOND],
    [9, 240 * SECOND],
    [10, 480 * SECOND],
    [11, 15 * MINUTE], // 960s would exceed the cap
    [12, 15 * MINUTE],
    [20, 15 * MINUTE],
  ])("backs off exponentially: failure %i locks for %i ms", (failures, expected) => {
    expect(fail(failures)).toEqual({ limited: true, retryAfterMs: expected });
  });

  it("does not reset the failure count when a lock expires, so the next lock is longer", () => {
    fail(6); // 30s
    vi.advanceTimersByTime(31 * SECOND);
    expect(checkRateLimit(IP)).toEqual({ limited: false });
    // A single further failure re-locks for the *next* window, not the first.
    expect(recordFailure(IP)).toEqual({ limited: true, retryAfterMs: 60 * SECOND });
  });

  it("keeps keys independent", () => {
    fail(6, "1.1.1.1");
    expect(checkRateLimit("1.1.1.1").limited).toBe(true);
    expect(checkRateLimit("2.2.2.2")).toEqual({ limited: false });
  });
});

describe("recordSuccess", () => {
  it("clears the record so the free attempts start over", () => {
    fail(FREE_ATTEMPTS);
    recordSuccess(IP);
    expect(fail(FREE_ATTEMPTS)).toEqual({ limited: false });
    expect(recordFailure(IP)).toEqual({ limited: true, retryAfterMs: 30 * SECOND });
  });

  it("releases an active lockout", () => {
    fail(6);
    expect(checkRateLimit(IP).limited).toBe(true);
    recordSuccess(IP);
    expect(checkRateLimit(IP)).toEqual({ limited: false });
  });

  it("is a no-op for an unknown key", () => {
    expect(() => recordSuccess("never-seen")).not.toThrow();
  });
});

describe("stale-entry sweep", () => {
  it("drops idle entries once the map grows past the sweep threshold", () => {
    // 1001 keys go stale, then one fresh failure trips the sweep.
    for (let i = 0; i < 1_001; i++) recordFailure(`stale-${i}`);
    vi.advanceTimersByTime(60 * MINUTE + SECOND);
    recordFailure("fresh");

    // Swept keys start over: five more free attempts, lock on the sixth.
    expect(fail(FREE_ATTEMPTS, "stale-0")).toEqual({ limited: false });
    expect(recordFailure("stale-0")).toEqual({
      limited: true,
      retryAfterMs: 30 * SECOND,
    });
  });
});
