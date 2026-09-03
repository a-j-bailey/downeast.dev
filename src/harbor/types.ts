import type { LayerId } from "./layers";

export type Rect = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type Period = "day" | "dusk" | "night";

export type Weather = {
  period: Period;
  isDay: boolean;
  precipitation: number;
  cloudCover: number;
  visibilityM: number;
  weatherCode: number;
  fog: boolean;
  rain: boolean;
  solarDeg: number;
  fetched: boolean;
};

export type Place = "harbor" | "coffee";

export type Mode = "walk" | "boat";

export type InteractKind = "url" | "enter" | "closed" | "board" | "dock";

export type InteractDef = {
  id: string;
  kind: InteractKind;
  label: string;
  x: number;
  w: number;
  layer: LayerId;
  href?: string;
  buildingId?: string;
  vehicleId?: string;
  place: Place;
};

export type BuildingDef = {
  id: string;
  name: string;
  facade: string;
  x: number;
  y: number;
  w: number;
  h: number;
  doorX: number;
  doorW: number;
  interiorId: "coffee" | null;
  closedPrompt: string;
};

export type InteriorDef = {
  id: "coffee";
  asset: string;
  w: number;
  h: number;
  floorY: number;
  spawnX: number;
  minX: number;
  maxX: number;
  door: Rect;
  painting: Rect;
};

export type SignDef = {
  id: string;
  asset: string;
  x: number;
  y: number;
  w: number;
  h: number;
  href: string;
  label: string;
};

export type VehicleDef = {
  id: string;
  dockX: number;
  dockY: number;
  disembarkX: number;
  minX: number;
  maxX: number;
  boardW: number;
};

export type Prompt = {
  text: string;
  interactId: string | null;
};
