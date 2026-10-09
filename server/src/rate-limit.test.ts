import { describe, expect, test, vi } from "vitest";

import { TokenBucket } from "./rate-limit.js";

describe("TokenBucket", () => {
  test("allows requests while tokens are available", () => {
    const bucket = new TokenBucket(3, 1);

    expect(bucket.check()).toBe(true);
    expect(bucket.check()).toBe(true);
    expect(bucket.check()).toBe(true);
    expect(bucket.check()).toBe(false);
  });

  test("refills tokens over time", () => {
    vi.useFakeTimers();

    try {
      const bucket = new TokenBucket(2, 1);

      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(false);

      vi.advanceTimersByTime(1000);

      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  test("does not exceed capacity", () => {
    vi.useFakeTimers();

    try {
      const bucket = new TokenBucket(2, 1);

      vi.advanceTimersByTime(10_000);

      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  test("refills fractional tokens correctly", () => {
    vi.useFakeTimers();

    try {
      const bucket = new TokenBucket(1, 2);

      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(false);

      vi.advanceTimersByTime(500);

      expect(bucket.check()).toBe(true);
      expect(bucket.check()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

