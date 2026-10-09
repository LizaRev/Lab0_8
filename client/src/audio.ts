let audioContext: AudioContext | null = null;

let buffers: Record<string, AudioBuffer | undefined> = {};

export function createAudio() {
  audioContext = new AudioContext();

  function setBuffers(assets: Record<string, AudioBuffer | undefined>): void {
    buffers = {
      shoot: assets.shoot,
      hit: assets.hit,
      explosion: assets.explosion,
    };
  }

  function play(name: string): void {
    const buffer = buffers[name];

    if (!buffer) {
      return;
    }

    if (!audioContext) {
      return;
    }

    if (audioContext.state === "suspended") {
      return;
    }

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(audioContext.destination);
    source.start();
  }

  function unlock(): void {
    if (audioContext && audioContext.state === "suspended") {
      void audioContext.resume();
    }
  }

  function attach(world: EventTarget): void {
    world.addEventListener("fired", () => {
      play("shoot");
    });

    world.addEventListener("hit", () => {
      play("hit");
    });

    world.addEventListener("exploded", () => {
      play("explosion");
    });
  }

  return {
    ctx: audioContext,
    setBuffers,
    play,
    unlock,
    attach,
  };
}

