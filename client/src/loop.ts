type LoopOptions = {
  step?: number;
  simulate: (step: number) => void;
  render: (alpha: number) => void;
};

const MAX_FRAME_SAMPLES = 2000;

export function createLoop({
  step = 1 / 60,
  simulate,
  render
}: LoopOptions) {
  let running = false;
  let lastTime: number | null = null;
  let accumulator = 0;
  let animationId: number | null = null;

  let stepsCount = 0;
  let framesCount = 0;
  let lastFrameDuration = 0;
  let statsTimer = 0;
  let stepsPerSecond = 0;
  let framesPerSecond = 0;

  const frameTimeSamples: number[] = [];

  function frame(time: number): void {
    if (!running) {
      return;
    }

    const frameStart = performance.now();

    if (lastTime === null) {
      lastTime = time;
      statsTimer = time;
    }

    const delta = Math.min((time - lastTime) / 1000, 0.25);
    lastTime = time;
    accumulator += delta;

    while (accumulator >= step) {
      simulate(step);
      stepsCount++;
      accumulator -= step;
    }

    const alpha = accumulator / step;
    render(alpha);
    framesCount++;

    lastFrameDuration = performance.now() - frameStart;

    if (frameTimeSamples.length < MAX_FRAME_SAMPLES) {
      frameTimeSamples.push(lastFrameDuration);
    }

    if (time - statsTimer >= 1000) {
      const elapsed = (time - statsTimer) / 1000;

      stepsPerSecond = Math.round(stepsCount / elapsed);
      framesPerSecond = Math.round(framesCount / elapsed);

      stepsCount = 0;
      framesCount = 0;
      statsTimer = time;
    }

    animationId = requestAnimationFrame(frame);
  }

  return {
    start(): void {
      if (running) {
        return;
      }

      running = true;
      lastTime = null;
      accumulator = 0;
      frameTimeSamples.length = 0;

      animationId = requestAnimationFrame(frame);
    },

    stop(): void {
      if (!running) {
        return;
      }

      running = false;

      if (animationId !== null) {
        cancelAnimationFrame(animationId);
      }
    },

    getStats() {
      return {
        stepsPerSecond,
        framesPerSecond,
        lastFrameDuration,
        frameTimeSamples: [...frameTimeSamples]
      };
    }
  };
}

