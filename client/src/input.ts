type TouchState = {
  left: boolean;
  right: boolean;
  thrust: boolean;
  fire: boolean;
};

export function createInput(target: Window) {
  const keys = new Set<string>();
  const justPressedKeys = new Set<string>();

  const touch: TouchState = {
    left: false,
    right: false,
    thrust: false,
    fire: false,
  };

  function onKeyDown(event: KeyboardEvent): void {
    if (!keys.has(event.code)) {
      justPressedKeys.add(event.code);
    }

    keys.add(event.code);

    if (event.code === "Space") {
      event.preventDefault();
    }
  }

  function onKeyUp(event: KeyboardEvent): void {
    keys.delete(event.code);
  }

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);

  return {
    isDown(code: string): boolean {
      if (code === "ArrowLeft") {
        return keys.has(code) || touch.left;
      }

      if (code === "ArrowRight") {
        return keys.has(code) || touch.right;
      }

      if (code === "ArrowUp") {
        return keys.has(code) || touch.thrust;
      }

      if (code === "Space") {
        return keys.has(code) || touch.fire;
      }

      return keys.has(code);
    },

    setTouchState(state: Partial<TouchState>): void {
      Object.assign(touch, state);
    },

    justPressed(code: string): boolean {
      return justPressedKeys.has(code);
    },

    endFrame(): void {
      justPressedKeys.clear();
    },
  };
}

type GameInput = ReturnType<typeof createInput>;

export function createMobileControls(input: GameInput): void {
  if (!window.matchMedia("(pointer: coarse)").matches) {
    return;
  }

  const style = (
    element: HTMLElement,
    values: Partial<CSSStyleDeclaration>
  ): void => {
    Object.assign(element.style, values);
  };

  const controls = document.createElement("div");

  style(controls, {
    position: "fixed",
    inset: "0",
    zIndex: "10000",
    pointerEvents: "none",
    userSelect: "none",
  });

  const joystick = document.createElement("div");

  style(joystick, {
    position: "absolute",
    left: "max(16px, env(safe-area-inset-left))",
    bottom: "calc(20px + env(safe-area-inset-bottom))",
    width: "clamp(100px, 16vw, 124px)",
    height: "clamp(100px, 16vw, 124px)",
    borderRadius: "50%",
    background: "rgba(50, 75, 120, 0.55)",
    border: "2px solid rgba(180, 205, 255, 0.8)",
    boxSizing: "border-box",
    pointerEvents: "auto",
    touchAction: "none",
  });

  const knob = document.createElement("div");

  style(knob, {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "rgba(160, 195, 255, 0.95)",
    border: "2px solid white",
    boxSizing: "border-box",
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  });

  joystick.appendChild(knob);
  controls.appendChild(joystick);

  const fire = document.createElement("button");

  fire.type = "button";
  fire.textContent = "FIRE";
  fire.setAttribute("aria-label", "Shoot");

  style(fire, {
    position: "absolute",
    right: "max(18px, env(safe-area-inset-right))",
    bottom: "calc(28px + env(safe-area-inset-bottom))",
    width: "clamp(72px, 12vw, 88px)",
    height: "clamp(72px, 12vw, 88px)",
    borderRadius: "50%",
    background: "rgba(190, 40, 65, 0.9)",
    color: "white",
    border: "3px solid white",
    fontSize: "clamp(15px, 3vw, 18px)",
    fontWeight: "bold",
    pointerEvents: "auto",
    touchAction: "none",
  });

  controls.appendChild(fire);
  document.body.appendChild(controls);

  let joystickPointer: number | null = null;

  function updateJoystick(event: PointerEvent): void {
    const rect = joystick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = event.clientX - centerX;
    const dy = event.clientY - centerY;

    const maxDistance = rect.width * 0.28;
    const distance = Math.hypot(dx, dy);
    const scale =
      distance > maxDistance ? maxDistance / distance : 1;

    knob.style.left =
      `${50 + (dx * scale / rect.width) * 100}%`;

    knob.style.top =
      `${50 + (dy * scale / rect.height) * 100}%`;

    input.setTouchState({
      left: dx < -rect.width * 0.12,
      right: dx > rect.width * 0.12,
      thrust: dy < -rect.height * 0.12,
    });
  }

  function resetJoystick(): void {
    joystickPointer = null;

    knob.style.left = "50%";
    knob.style.top = "50%";

    input.setTouchState({
      left: false,
      right: false,
      thrust: false,
    });
  }

  joystick.addEventListener("pointerdown", (event) => {
    if (joystickPointer !== null) {
      return;
    }

    event.preventDefault();
    joystickPointer = event.pointerId;
    joystick.setPointerCapture(event.pointerId);
    updateJoystick(event);
  });

  joystick.addEventListener("pointermove", (event) => {
    if (event.pointerId === joystickPointer) {
      event.preventDefault();
      updateJoystick(event);
    }
  });

  joystick.addEventListener("pointerup", (event) => {
    if (event.pointerId === joystickPointer) {
      resetJoystick();
    }
  });

  joystick.addEventListener("pointercancel", () => {
    resetJoystick();
  });

  joystick.addEventListener("lostpointercapture", () => {
    resetJoystick();
  });

  function stopFire(): void {
    input.setTouchState({ fire: false });
  }

  fire.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    fire.setPointerCapture(event.pointerId);
    input.setTouchState({ fire: true });
  });

  fire.addEventListener("pointerup", stopFire);
  fire.addEventListener("pointercancel", stopFire);
  fire.addEventListener("lostpointercapture", stopFire);

  window.addEventListener("blur", () => {
    resetJoystick();
    stopFire();
  });

  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}