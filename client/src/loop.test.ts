import { describe, expect, test, vi } from "vitest";
import { createLoop } from "./loop.js";

describe("createLoop", () => {
  test("runs simulation with fixed steps", () => {
    const callback: {
      current: ((time: number) => void) | null;
    } = {
      current: null
    };

    const requestAnimationFrameMock = vi.fn(
      (nextCallback: (time: number) => void) => {
        callback.current = nextCallback;
        return 1;
      }
    );

    const cancelAnimationFrameMock = vi.fn();

    vi.stubGlobal("requestAnimationFrame", requestAnimationFrameMock);
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrameMock);

    try {
      let simulateCalls = 0;
      let lastStep = 0;
      let renderCalls = 0;

      const loop = createLoop({
        step: 1 / 60,
        simulate: (step) => {
          simulateCalls++;
          lastStep = step;
        },
        render: () => {
          renderCalls++;
        }
      });

      loop.start();

      expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1);

      callback.current?.(0);
      callback.current?.(100);

      expect(simulateCalls).toBeGreaterThan(0);
      expect(lastStep).toBeCloseTo(1 / 60);
      expect(renderCalls).toBe(2);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("does not start twice", () => {
    const callback: {
      current: ((time: number) => void) | null;
    } = {
      current: null
    };

    const requestAnimationFrameMock = vi.fn(
      (nextCallback: (time: number) => void) => {
        callback.current = nextCallback;
        return 1;
      }
    );

    vi.stubGlobal("requestAnimationFrame", requestAnimationFrameMock);

    try {
      const loop = createLoop({
        simulate: () => {},
        render: () => {}
      });

      loop.start();
      loop.start();

      expect(requestAnimationFrameMock).toHaveBeenCalledTimes(1);

      callback.current?.(0);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("stops rendering after stop", () => {
    const callback: {
      current: ((time: number) => void) | null;
    } = {
      current: null
    };

    const requestAnimationFrameMock = vi.fn(
      (nextCallback: (time: number) => void) => {
        callback.current = nextCallback;
        return 1;
      }
    );

    const cancelAnimationFrameMock = vi.fn();

    vi.stubGlobal("requestAnimationFrame", requestAnimationFrameMock);
    vi.stubGlobal("cancelAnimationFrame", cancelAnimationFrameMock);

    try {
      let renderCalls = 0;

      const loop = createLoop({
        simulate: () => {},
        render: () => {
          renderCalls++;
        }
      });

      loop.start();
      callback.current?.(0);

      expect(renderCalls).toBe(1);

      loop.stop();

      expect(cancelAnimationFrameMock).toHaveBeenCalledTimes(1);

      callback.current?.(100);

      expect(renderCalls).toBe(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  test("limits a long frame to 0.25 seconds", () => {
    const callback: {
      current: ((time: number) => void) | null;
    } = {
      current: null
    };

    const requestAnimationFrameMock = vi.fn(
      (nextCallback: (time: number) => void) => {
        callback.current = nextCallback;
        return 1;
      }
    );

    vi.stubGlobal("requestAnimationFrame", requestAnimationFrameMock);

    try {
      let simulateCalls = 0;

      const loop = createLoop({
        step: 1 / 60,
        simulate: () => {
          simulateCalls++;
        },
        render: () => {}
      });

      loop.start();

      callback.current?.(0);
      callback.current?.(1000);

      expect(simulateCalls).toBe(15);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

