import { loadAssets, type Assets } from "./assets";
import { bindInput, type Input } from "./input";
import { drawFrame, type DrawState } from "./render";
import type { Mode, Place, Prompt, Weather } from "./types";
import { GROUND_Y, VIEW_H, VIEW_W } from "./view";
import { cachedWeather, loadWeather } from "./weather";
import {
  BUILDINGS,
  INTERIORS,
  VEHICLES,
  buildingById,
  clampWalk,
  interactablesFor,
  nearestInteractable,
} from "./world";

export type GameHooks = {
  onPrompt: (prompt: Prompt) => void;
  onPeriod: (period: Weather["period"]) => void;
};

type Shark = DrawState["shark"] & { wait: number; vx: number };

type State = {
  place: Place;
  mode: Mode;
  playerX: number;
  facing: 1 | -1;
  walkAcc: number;
  using: number;
  boatX: number;
  boatFacing: 1 | -1;
  boatVx: number;
  boarded: boolean;
  camX: number;
  fade: number;
  fadeVel: number;
  fadeJob: "enter" | "leave" | null;
  weather: Weather;
  time: number;
  shark: Shark;
  walkTarget: number | null;
  pendingUse: boolean;
};

const WALK_SPEED = 58;
const BOAT_ACCEL = 90;
const BOAT_MAX = 110;
const REACH = 24;

function playerY(place: Place): number {
  if (place === "coffee") {
    return INTERIORS.coffee.floorY - 32;
  }
  return GROUND_Y - 32;
}

function emptyShark(): Shark {
  return {
    alive: false,
    kind: "fin",
    x: 0,
    y: 112,
    facing: 1,
    wait: 4000 + Math.random() * 8000,
    vx: 0,
  };
}

function makeState(weather: Weather): State {
  return {
    place: "harbor",
    mode: "walk",
    playerX: 400,
    facing: 1,
    walkAcc: 0,
    using: 0,
    boatX: VEHICLES.picnic.dockX,
    boatFacing: -1,
    boatVx: 0,
    boarded: false,
    camX: 400 - VIEW_W / 2,
    fade: 0,
    fadeVel: 0,
    fadeJob: null,
    weather,
    time: 0,
    shark: emptyShark(),
    walkTarget: null,
    pendingUse: false,
  };
}

function followCam(state: State, focusX: number): void {
  const deadL = 90;
  const deadR = VIEW_W - 110;
  const view = focusX - state.camX;
  if (view < deadL) {
    state.camX = focusX - deadL;
  } else if (view > deadR) {
    state.camX = focusX - deadR;
  }
  const min = state.mode === "boat" ? -680 : 0;
  const max = 680 - VIEW_W;
  state.camX = Math.round(Math.max(min, Math.min(max, state.camX)));
}

function applyUse(state: State): void {
  state.using = 180;
  const x = state.boarded ? state.boatX + 40 : state.playerX;
  const list = interactablesFor(state.place, state.mode, state.boatX);
  const hit = nearestInteractable(list, x, REACH);
  if (!hit) {
    return;
  }
  switch (hit.kind) {
    case "url":
      if (hit.href) {
        window.open(hit.href, "_blank", "noopener,noreferrer");
      }
      return;
    case "closed":
      return;
    case "enter":
      if (state.place === "harbor") {
        const b = hit.buildingId ? buildingById(hit.buildingId) : undefined;
        if (b?.interiorId) {
          state.fadeVel = 3.2;
          state.fadeJob = "enter";
        }
      } else {
        state.fadeVel = 3.2;
        state.fadeJob = "leave";
      }
      return;
    case "board":
      state.mode = "boat";
      state.boarded = true;
      state.walkTarget = null;
      return;
    case "dock":
      if (Math.abs(state.boatX - VEHICLES.picnic.dockX) < 50) {
        state.mode = "walk";
        state.boarded = false;
        state.playerX = VEHICLES.picnic.disembarkX;
        state.boatX = VEHICLES.picnic.dockX;
        state.boatVx = 0;
        state.boatFacing = -1;
      }
      return;
    default: {
      const _x: never = hit.kind;
      return _x;
    }
  }
}

function finishFade(state: State): void {
  if (state.fadeJob === "enter") {
    state.place = "coffee";
    state.mode = "walk";
    state.boarded = false;
    state.playerX = INTERIORS.coffee.spawnX;
    state.facing = 1;
    state.camX = 0;
  }
  if (state.fadeJob === "leave") {
    const b = BUILDINGS.find((item) => item.id === "coffee");
    state.place = "harbor";
    state.playerX = b ? b.doorX + 4 : 420;
    state.camX = state.playerX - VIEW_W / 2;
  }
  state.fadeJob = null;
  state.fadeVel = -3.2;
}

function tickShark(state: State, dt: number): void {
  const shark = state.shark;
  if (shark.alive) {
    shark.x += shark.vx * dt;
    if (shark.x < -800 || shark.x > 80) {
      state.shark = emptyShark();
    }
    return;
  }
  shark.wait -= dt * 1000;
  const inOcean = state.boarded && state.boatX < 40;
  if (!inOcean || shark.wait > 0) {
    return;
  }
  const full = Math.random() < 0.4;
  const facing: 1 | -1 = Math.random() < 0.5 ? 1 : -1;
  state.shark = {
    alive: true,
    kind: full ? "full" : "fin",
    x: facing > 0 ? -700 : 40,
    y: full ? 110 : 108,
    facing,
    wait: 0,
    vx: facing * (22 + Math.random() * 18),
  };
}

function promptFor(state: State): Prompt {
  const x = state.boarded ? state.boatX + 40 : state.playerX;
  const list = interactablesFor(state.place, state.mode, state.boatX);
  const hit = nearestInteractable(list, x, REACH);
  if (!hit) {
    return { text: "", interactId: null };
  }
  const prefix = "E  ";
  return { text: `${prefix}${hit.label}`, interactId: hit.id };
}

function toDraw(state: State): DrawState {
  return {
    place: state.place,
    camX: state.camX,
    playerX: state.playerX,
    playerY: playerY(state.place),
    facing: state.facing,
    moving: Math.abs(state.walkAcc) > 0.2 && !state.boarded,
    using: state.using > 0,
    walkFrame: Math.floor(state.time / 125) % 4,
    boatX: state.boatX,
    boatY: VEHICLES.picnic.dockY,
    boatFacing: state.boatFacing,
    boatSpeed: state.boatVx,
    boarded: state.boarded,
    weather: state.weather,
    time: state.time,
    fade: Math.min(1, Math.max(0, state.fade)),
    shark: state.shark,
  };
}

export type GameHandle = {
  destroy: () => void;
};

export function createGame(canvas: HTMLCanvasElement, hooks: GameHooks): GameHandle {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D unavailable");
  }
  canvas.width = VIEW_W;
  canvas.height = VIEW_H;
  ctx.imageSmoothingEnabled = false;

  const input: Input = bindInput(canvas);
  let assets: Assets | null = null;
  let raf = 0;
  let last = performance.now();
  let alive = true;
  const state = makeState(cachedWeather());
  hooks.onPeriod(state.weather.period);
  let lastPrompt = "";
  let lastPeriod = state.weather.period;

  void loadAssets().then((loaded) => {
    if (alive) {
      assets = loaded;
    }
  });
  void loadWeather().then((w) => {
    if (!alive) {
      return;
    }
    state.weather = w;
    hooks.onPeriod(w.period);
  });
  const weatherTimer = window.setInterval(() => {
    void loadWeather().then((w) => {
      if (!alive) {
        return;
      }
      state.weather = w;
      hooks.onPeriod(w.period);
    });
  }, 15 * 60 * 1000);

  const step = (now: number) => {
    if (!alive) {
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    state.time += dt * 1000;
    if (state.using > 0) {
      state.using -= dt * 1000;
    }

    if (state.fadeVel !== 0) {
      state.fade += state.fadeVel * dt;
      if (state.fade >= 1 && state.fadeJob) {
        state.fade = 1;
        finishFade(state);
      }
      if (state.fade <= 0) {
        state.fade = 0;
        state.fadeVel = 0;
      }
    }

    const tap = input.consumeTap();
    if (tap && state.place === "harbor" && !state.boarded && state.fade === 0) {
      const worldX = tap.x + state.camX;
      state.walkTarget = clampWalk(worldX);
      const list = interactablesFor(state.place, state.mode, state.boatX);
      const hit = nearestInteractable(list, worldX, 18);
      state.pendingUse = Boolean(hit && tap.use);
      if (hit) {
        state.walkTarget = hit.x + hit.w / 2;
      }
    }
    if (tap && state.place === "coffee") {
      const room = INTERIORS.coffee;
      state.walkTarget = Math.max(room.minX, Math.min(room.maxX, tap.x));
      const hit = nearestInteractable(
        interactablesFor(state.place, state.mode, state.boatX),
        tap.x,
        18,
      );
      state.pendingUse = Boolean(hit);
    }

    const use = input.consumeUse() || (state.pendingUse && state.walkTarget === null);
    if (input.consumeEscape() && state.place !== "harbor" && state.fade === 0) {
      state.fadeVel = 3.2;
      state.fadeJob = "leave";
    }

    if (state.fade === 0) {
      if (state.boarded) {
        let ax = 0;
        if (input.left) {
          ax -= BOAT_ACCEL;
        }
        if (input.right) {
          ax += BOAT_ACCEL;
        }
        if (input.up) {
          ax += state.boatFacing * BOAT_ACCEL * 0.8;
        }
        if (input.down) {
          ax -= state.boatFacing * BOAT_ACCEL * 0.6;
        }
        state.boatVx += ax * dt;
        state.boatVx *= 1 - 1.6 * dt;
        if (state.boatVx > BOAT_MAX) {
          state.boatVx = BOAT_MAX;
        }
        if (state.boatVx < -BOAT_MAX) {
          state.boatVx = -BOAT_MAX;
        }
        if (Math.abs(state.boatVx) > 4) {
          state.boatFacing = state.boatVx > 0 ? 1 : -1;
        }
        state.boatX += state.boatVx * dt;
        const v = VEHICLES.picnic;
        state.boatX = Math.max(v.minX, Math.min(v.maxX, state.boatX));
        followCam(state, state.boatX + 40);
        tickShark(state, dt);
      } else {
        let dir = 0;
        if (input.left) {
          dir -= 1;
        }
        if (input.right) {
          dir += 1;
        }
        if (dir !== 0) {
          state.walkTarget = null;
          state.pendingUse = false;
        }
        if (state.walkTarget !== null) {
          const d = state.walkTarget - state.playerX;
          if (Math.abs(d) < 1.5) {
            state.playerX = state.walkTarget;
            state.walkTarget = null;
            dir = 0;
            if (state.pendingUse) {
              state.pendingUse = false;
              applyUse(state);
            }
          } else {
            dir = d > 0 ? 1 : -1;
          }
        }
        if (dir !== 0) {
          state.facing = dir > 0 ? 1 : -1;
          state.walkAcc = dir;
          state.playerX += dir * WALK_SPEED * dt;
        } else {
          state.walkAcc = 0;
        }
        if (state.place === "coffee") {
          const room = INTERIORS.coffee;
          state.playerX = Math.max(room.minX, Math.min(room.maxX, state.playerX));
        } else {
          state.playerX = clampWalk(state.playerX);
          followCam(state, state.playerX);
        }
      }
      if (use && state.walkTarget === null) {
        applyUse(state);
      }
    }

    const prompt = promptFor(state);
    if (prompt.text !== lastPrompt) {
      lastPrompt = prompt.text;
      hooks.onPrompt(prompt);
    }
    if (state.weather.period !== lastPeriod) {
      lastPeriod = state.weather.period;
      hooks.onPeriod(state.weather.period);
    }

    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    if (assets) {
      drawFrame(ctx, toDraw(state), assets);
    } else {
      ctx.fillStyle = "#fffcf0";
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }

    raf = requestAnimationFrame(step);
  };

  raf = requestAnimationFrame(step);

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      window.clearInterval(weatherTimer);
      input.destroy();
    },
  };
}
