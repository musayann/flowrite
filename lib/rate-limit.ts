/**
 * In-memory brute-force throttle for the single-user login.
 *
 * State lives in this module's `Map`, which persists for the lifetime of the
 * Node server process. This is intentionally NOT placed in `proxy.ts`: Next.js
 * proxies may be deployed to a CDN and are documented as unable to rely on
 * shared module state, whereas `authorize()` runs in the server runtime where
 * this Map is stable. For a single-instance, self-hosted deploy that's all we
 * need; a multi-instance deploy would want a shared store (e.g. Redis) instead.
 *
 * Policy: a handful of free attempts, then an exponentially growing lockout
 * keyed by client IP. A successful login clears the IP's record.
 */

/** Failed attempts allowed before lockouts kick in. */
const FREE_ATTEMPTS = 5;
/** Lockout after the first over-limit failure. */
const BASE_LOCK_MS = 30_000; // 30s
/** Upper bound on a single lockout window. */
const MAX_LOCK_MS = 15 * 60_000; // 15 min
/** Forget an IP after this long with no activity (keeps the Map bounded). */
const ENTRY_TTL_MS = 60 * 60_000; // 1h
/** Sweep stale entries once the Map grows past this many keys. */
const SWEEP_THRESHOLD = 1_000;

type Attempt = {
  /** Consecutive failed attempts since the last success/reset. */
  failures: number;
  /** Epoch ms until which this key is locked out; 0 when not locked. */
  lockedUntil: number;
  /** Epoch ms of the most recent activity, used for TTL cleanup. */
  lastSeen: number;
};

const attempts = new Map<string, Attempt>();

/** Drop entries that have been idle past their TTL. Called opportunistically. */
function sweep(now: number): void {
  for (const [key, entry] of attempts) {
    if (now - entry.lastSeen > ENTRY_TTL_MS) {
      attempts.delete(key);
    }
  }
}

export type RateLimitStatus =
  | { limited: false }
  | { limited: true; retryAfterMs: number };

/**
 * Check whether `key` (e.g. a client IP) is currently locked out. Does not
 * record an attempt — call {@link recordFailure} / {@link recordSuccess} after
 * validating credentials.
 */
export function checkRateLimit(key: string): RateLimitStatus {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry) return { limited: false };

  // Expire stale records so a returning IP starts fresh.
  if (now - entry.lastSeen > ENTRY_TTL_MS) {
    attempts.delete(key);
    return { limited: false };
  }

  if (entry.lockedUntil > now) {
    return { limited: true, retryAfterMs: entry.lockedUntil - now };
  }
  return { limited: false };
}

/**
 * Record a failed login for `key` and apply exponential backoff once the free
 * attempts are used up. Returns the resulting status (locked or not).
 */
export function recordFailure(key: string): RateLimitStatus {
  const now = Date.now();
  if (attempts.size > SWEEP_THRESHOLD) sweep(now);

  const entry = attempts.get(key) ?? {
    failures: 0,
    lockedUntil: 0,
    lastSeen: now,
  };
  entry.failures += 1;
  entry.lastSeen = now;

  let status: RateLimitStatus = { limited: false };
  if (entry.failures > FREE_ATTEMPTS) {
    // 6th failure → BASE, 7th → 2×BASE, 8th → 4×BASE, … capped at MAX.
    const overage = entry.failures - FREE_ATTEMPTS - 1;
    const lockMs = Math.min(BASE_LOCK_MS * 2 ** overage, MAX_LOCK_MS);
    entry.lockedUntil = now + lockMs;
    status = { limited: true, retryAfterMs: lockMs };
  }

  attempts.set(key, entry);
  return status;
}

/** Clear a key's record after a successful login. */
export function recordSuccess(key: string): void {
  attempts.delete(key);
}

/** Test/util hook to reset all state. */
export function __resetAll(): void {
  attempts.clear();
}
