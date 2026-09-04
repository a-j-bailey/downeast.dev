import { GITHUB_PROFILE_URL, X_PROFILE_URL } from "../content/site";
import { projects } from "../content/projects";

export const INTERACT_IDS = [
  "cafe",
  "board",
  "dismount",
  "github",
  "x",
  "zoning",
  "potager",
  "weatherOtter",
  "leave",
] as const;

export type InteractId = (typeof INTERACT_IDS)[number];

export type Possession = "walker" | "boat";

/** Door knock beat before an interior fade. Keep in the 200–400ms window. */
export const DOOR_KNOCK_MS = 320;
/** Short use pose for board / links; does not delay the action. */
export const USE_POSE_MS = 220;

export function isDoorInteract(id: InteractId): boolean {
  switch (id) {
    case "cafe":
      return true;
    case "board":
    case "dismount":
    case "github":
    case "x":
    case "zoning":
    case "potager":
    case "weatherOtter":
    case "leave":
      return false;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function promptText(id: InteractId): string {
  switch (id) {
    case "cafe":
      return "[E] Enter cafe";
    case "board":
      return "[E] Board boat";
    case "dismount":
      return "[E] Disembark";
    case "github":
      return "[E] GitHub";
    case "x":
      return "[E] X";
    case "zoning":
      return "[E] Zoning Radar";
    case "potager":
      return "[E] Potager";
    case "weatherOtter":
      return "[E] Weather Otter";
    case "leave":
      return "[E] Leave cafe";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function linkedProjectUrl(title: string): string | null {
  for (const project of projects) {
    if (project.title === title && project.kind === "link") {
      return project.url;
    }
  }
  return null;
}

export function interactUrl(id: InteractId): string | null {
  switch (id) {
    case "github":
      return GITHUB_PROFILE_URL;
    case "x":
      return X_PROFILE_URL;
    case "zoning":
      return linkedProjectUrl("Zoning Radar");
    case "potager":
      return linkedProjectUrl("Potager");
    case "weatherOtter":
      return linkedProjectUrl("Weather Otter");
    case "cafe":
    case "board":
    case "dismount":
    case "leave":
      return null;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function openInteractUrl(id: InteractId): void {
  const url = interactUrl(id);
  if (!url) {
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
