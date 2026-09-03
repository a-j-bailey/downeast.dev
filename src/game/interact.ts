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
  "leave",
] as const;

export type InteractId = (typeof INTERACT_IDS)[number];

export type Possession = "walker" | "boat";

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
