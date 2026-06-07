import { describe, it, expect, beforeEach } from "vitest";

// Rate limiting logic extracted for testing
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000;

interface RateLimitEntry {
  count: number;
  lockedUntil: number;
}

function createRateLimiter() {
  const attempts = new Map<string, RateLimitEntry>();

  function checkRateLimit(key: string): { allowed: boolean; remainingMs?: number } {
    const entry = attempts.get(key);
    if (!entry) return { allowed: true };
    if (Date.now() < entry.lockedUntil) {
      return { allowed: false, remainingMs: entry.lockedUntil - Date.now() };
    }
    if (entry.count >= MAX_ATTEMPTS) {
      entry.lockedUntil = Date.now() + LOCKOUT_MS;
      entry.count = 0;
      return { allowed: false, remainingMs: LOCKOUT_MS };
    }
    return { allowed: true };
  }

  function recordFailedAttempt(key: string): void {
    const entry = attempts.get(key);
    if (entry) {
      entry.count += 1;
    } else {
      attempts.set(key, { count: 1, lockedUntil: 0 });
    }
  }

  function resetAttempts(key: string): void {
    attempts.delete(key);
  }

  return { checkRateLimit, recordFailedAttempt, resetAttempts, attempts };
}

describe("rate limiting", () => {
  let limiter: ReturnType<typeof createRateLimiter>;

  beforeEach(() => {
    limiter = createRateLimiter();
  });

  it("should allow first attempt", () => {
    const result = limiter.checkRateLimit("user-1");
    expect(result.allowed).toBe(true);
  });

  it("should allow up to MAX_ATTEMPTS failed attempts", () => {
    for (let i = 0; i < MAX_ATTEMPTS - 1; i++) {
      limiter.recordFailedAttempt("user-1");
      const result = limiter.checkRateLimit("user-1");
      expect(result.allowed).toBe(true);
    }
  });

  it("should lock out after MAX_ATTEMPTS failed attempts", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      limiter.recordFailedAttempt("user-1");
    }

    const result = limiter.checkRateLimit("user-1");
    expect(result.allowed).toBe(false);
    expect(result.remainingMs).toBeDefined();
    expect(result.remainingMs!).toBeGreaterThan(0);
    expect(result.remainingMs!).toBeLessThanOrEqual(LOCKOUT_MS);
  });

  it("should track attempts per key independently", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      limiter.recordFailedAttempt("user-1");
    }
    limiter.checkRateLimit("user-1"); // triggers lockout

    // Different user should still be allowed
    const result = limiter.checkRateLimit("user-2");
    expect(result.allowed).toBe(true);
  });

  it("should reset attempts on successful login", () => {
    for (let i = 0; i < 3; i++) {
      limiter.recordFailedAttempt("user-1");
    }
    limiter.resetAttempts("user-1");

    const result = limiter.checkRateLimit("user-1");
    expect(result.allowed).toBe(true);
    expect(limiter.attempts.has("user-1")).toBe(false);
  });

  it("should remain locked during lockout period", () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      limiter.recordFailedAttempt("user-1");
    }
    // Trigger lockout
    limiter.checkRateLimit("user-1");

    // Immediate subsequent check should still be locked
    const result = limiter.checkRateLimit("user-1");
    expect(result.allowed).toBe(false);
  });
});
