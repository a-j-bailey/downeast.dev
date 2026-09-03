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
    y: GROUND_Y - 91,
    w: 76,
    h: 91,
    doorX: 224,
    doorW: 22,
    interiorId: null,
    closedPrompt: "Zoning Radar — closed",
  },
  {
    id: "shack-b",
    name: "Potager",
    facade: "shack-b",
    x: 278,
    y: GROUND_Y - 85,
    w: 77,
    h: 85,
    doorX: 292,
    doorW: 22,
    interiorId: null,
    closedPrompt: "Potager — closed",
  },
  {
    id: "coffee",
    name: "Coffee",
    facade: "coffee-shop",
    x: 360,
    y: GROUND_Y - 99,
    w: 116,
    h: 99,
    doorX: 427,
    doorW: 21,
    interiorId: "coffee",
    closedPrompt: "Closed",
  },
];

/** Locked cafe room. Do not swap `asset` or restyle the PNG. */
export const INTERIORS: Record<"coffee", InteriorDef> = {
  coffee: {
    id: "coffee",
    asset: "coffee-interior",
    w: 640,
    h: VIEW_H,
    floorY: 336,
    spawnX: 96,
    minX: 48,
    maxX: 584,
    door: { x: 28, y: 100, w: 52, h: 136 },
    painting: { x: 116, y: 72, w: 84, h: 44 },
  },
};

export const SIGNS: SignDef[] = [
  {
    id: "github",
    asset: "sign-github",
    x: 520,
    y: GROUND_Y - 53,
    w: 35,
    h: 53,
    href: GITHUB_PROFILE_URL,
    label: "GitHub",
  },
  {
    id: "x",
    asset: "sign-x",
    x: 572,
    y: GROUND_Y - 52,
    w: 34,
    h: 52,
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
  // Boat sits on the pier deck, which is slightly above the street's
  // ground line.
  return GROUND_Y - 28;
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
