import { GITHUB_PROFILE_URL, X_PROFILE_URL } from "../content/site";
import { LAYER } from "./layers";
import type {
  BuildingDef,
  InteractDef,
  InteriorDef,
  Mode,
  Place,
  SignDef,
  VehicleDef,
} from "./types";
import { GROUND_Y, OCEAN_MIN, VIEW_H, WALK_MAX, WALK_MIN } from "./view";

export const BUILDINGS: BuildingDef[] = [
  {
    id: "shack-a",
    name: "Zoning Radar",
    facade: "shack-a",
    x: 210,
    y: GROUND_Y - 54,
    w: 56,
    h: 54,
    doorX: 220,
    doorW: 16,
    interiorId: null,
    closedPrompt: "Zoning Radar — closed",
  },
  {
    id: "shack-b",
    name: "Potager",
    facade: "shack-b",
    x: 278,
    y: GROUND_Y - 54,
    w: 56,
    h: 54,
    doorX: 288,
    doorW: 16,
    interiorId: null,
    closedPrompt: "Potager — closed",
  },
  {
    id: "coffee",
    name: "Coffee",
    facade: "coffee-shop",
    x: 360,
    y: GROUND_Y - 78,
    w: 100,
    h: 78,
    doorX: 418,
    doorW: 18,
    interiorId: "coffee",
    closedPrompt: "Closed",
  },
];

/** Locked cafe room. Do not swap `asset` or restyle the PNG. */
export const INTERIORS: Record<"coffee", InteriorDef> = {
  coffee: {
    id: "coffee",
    asset: "coffee-interior",
    w: 320,
    h: VIEW_H,
    floorY: 168,
    spawnX: 48,
    minX: 24,
    maxX: 292,
    door: { x: 14, y: 50, w: 26, h: 68 },
    painting: { x: 58, y: 36, w: 42, h: 22 },
  },
};

export const SIGNS: SignDef[] = [
  {
    id: "github",
    asset: "sign-github",
    x: 520,
    y: GROUND_Y - 46,
    w: 44,
    h: 46,
    href: GITHUB_PROFILE_URL,
    label: "GitHub",
  },
  {
    id: "x",
    asset: "sign-x",
    x: 572,
    y: GROUND_Y - 46,
    w: 44,
    h: 46,
    href: X_PROFILE_URL,
    label: "X",
  },
];

export const VEHICLES: Record<"picnic", VehicleDef> = {
  picnic: {
    id: "picnic",
    dockX: 84,
    dockY: WATER_Y_BOAT(),
    disembarkX: 148,
    minX: OCEAN_MIN,
    maxX: 110,
    boardW: 90,
  },
};

function WATER_Y_BOAT(): number {
  return 88;
}

export const PIER = { x: 88, y: GROUND_Y - 4, w: 88, h: 52 };
export const KAYAK = { x: 186, y: GROUND_Y - 14, w: 52, h: 16 };
export const LIGHTHOUSE = { x: -160, y: 48, w: 72, h: 64 };
export const FAR_SHORE_Y = 76;

export const TRAPS: { x: number; kind: "trap" | "trap-stack" | "trap-buoy" }[] = [
  { x: 470, kind: "trap-stack" },
  { x: 496, kind: "trap" },
  { x: 478, kind: "trap-buoy" },
];

export function clampWalk(x: number): number {
  return Math.max(WALK_MIN, Math.min(WALK_MAX, x));
}

export function interactablesFor(place: Place, mode: Mode, boatX: number): InteractDef[] {
  if (place === "coffee") {
    const room = INTERIORS.coffee;
    return [
      {
        id: "coffee-exit",
        kind: "enter",
        label: "Leave",
        x: room.door.x,
        w: room.door.w,
        layer: LAYER.land,
        buildingId: "coffee",
        place: "coffee",
      },
    ];
  }

  if (mode === "boat") {
    return [
      {
        id: "dock",
        kind: "dock",
        label: "Dock",
        x: VEHICLES.picnic.dockX,
        w: VEHICLES.picnic.boardW,
        layer: LAYER.actors,
        vehicleId: "picnic",
        place: "harbor",
      },
    ];
  }

  const buildings: InteractDef[] = BUILDINGS.map((b) => ({
    id: b.id,
    kind: b.interiorId ? "enter" : "closed",
    label: b.interiorId ? `Enter ${b.name}` : b.closedPrompt,
    x: b.doorX,
    w: b.doorW,
    layer: LAYER.land,
    buildingId: b.id,
    place: "harbor",
  }));

  const signs: InteractDef[] = SIGNS.map((s) => ({
    id: s.id,
    kind: "url",
    label: s.label,
    x: s.x + 8,
    w: 28,
    layer: LAYER.fg,
    href: s.href,
    place: "harbor",
  }));

  const board: InteractDef = {
    id: "board",
    kind: "board",
    label: "Board",
    x: boatX + 20,
    w: VEHICLES.picnic.boardW,
    layer: LAYER.actors,
    vehicleId: "picnic",
    place: "harbor",
  };

  return [...buildings, ...signs, board];
}

export function nearestInteractable(
  list: InteractDef[],
  x: number,
  reach = 28,
): InteractDef | null {
  let best: InteractDef | null = null;
  let bestDist = Infinity;
  for (const it of list) {
    const left = it.x - reach;
    const right = it.x + it.w + reach;
    if (x < left || x > right) {
      continue;
    }
    const dist = Math.abs(it.x + it.w / 2 - x);
    if (dist < bestDist) {
      best = it;
      bestDist = dist;
    }
  }
  return best;
}

export function buildingById(id: string): BuildingDef | undefined {
  return BUILDINGS.find((b) => b.id === id);
}
