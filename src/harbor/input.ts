const ARROWS = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"]);
const GAME = new Set([
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyE",
  "Enter",
  "Escape",
]);

function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

export type Input = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  use: boolean;
  escape: boolean;
  tapX: number | null;
  tapUse: boolean;
  consumeUse: () => boolean;
  consumeEscape: () => boolean;
  consumeTap: () => { x: number; use: boolean } | null;
  destroy: () => void;
};

export function bindInput(
  canvas: HTMLCanvasElement,
  toLocalX?: (clientX: number) => number,
): Input {
  const down = new Set<string>();
  let useLatch = false;
  let escapeLatch = false;
  let tapX: number | null = null;
  let tapUse = false;

  const onKeyDown = (e: KeyboardEvent) => {
    if (typing(e.target)) {
      return;
    }
    if (!GAME.has(e.code)) {
      return;
    }
    if (ARROWS.has(e.code)) {
      e.preventDefault();
    }
    down.add(e.code);
    if (e.code === "KeyE" || e.code === "Enter") {
      useLatch = true;
    }
    if (e.code === "Escape") {
      escapeLatch = true;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    down.delete(e.code);
  };

  const toLocalXLegacy = (clientX: number): number => {
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / canvas.width;
    return (clientX - rect.left) / scale;
  };

  const onPointer = (e: PointerEvent) => {
    if (e.button !== 0) {
      return;
    }
    const x = (toLocalX ?? toLocalXLegacy)(e.clientX);
    tapX = x;
    tapUse = true;
  };

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  canvas.addEventListener("pointerdown", onPointer);

  return {
    get left() {
      return down.has("ArrowLeft") || down.has("KeyA");
    },
    get right() {
      return down.has("ArrowRight") || down.has("KeyD");
    },
    get up() {
      return down.has("ArrowUp") || down.has("KeyW");
    },
    get down() {
      return down.has("ArrowDown") || down.has("KeyS");
    },
    get use() {
      return useLatch;
    },
    get escape() {
      return escapeLatch;
    },
    get tapX() {
      return tapX;
    },
    get tapUse() {
      return tapUse;
    },
    consumeUse() {
      const v = useLatch;
      useLatch = false;
      return v;
    },
    consumeEscape() {
      const v = escapeLatch;
      escapeLatch = false;
      return v;
    },
    consumeTap() {
      if (tapX === null) {
        return null;
      }
      const x = tapX;
      const use = tapUse;
      tapX = null;
      tapUse = false;
      return { x, use };
    },
    destroy() {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("pointerdown", onPointer);
    },
  };
}
