import { describe, expect, test, vi } from "vitest";

import { TokenBucket } from "./rate-limit.js";

describe("TokenBucket extra cases", () => {
  test("rejects immediately when capacity is zero", () => {
    const bucket = new TokenBucket(0, 10);

    expect(bucket.check()).toBe(false);
  });

  test("does not allow more requests than the capacity", () => {
    const bucket = new TokenBucket(3, 10);

    expect(bucket.check()).toBe(true);
    expect(bucket.check()).toBe(true);
    expect(bucket.check()).toBe(true);
    expect(bucket.check()).toBe(false);
  });

  test("refills tokens after enough time passes", () => {
    vi.useFakeTimers();

    try {
      const bucket = new TokenBucket(1, 1);

      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(false);

      vi.advanceTimersByTime(1000);

      expect(bucket.check()).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  test("keeps the number of tokens bounded by capacity after refill", () => {
    vi.useFakeTimers();

    try {
      const bucket = new TokenBucket(2, 100);

      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(false);

      vi.advanceTimersByTime(10000);

      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

