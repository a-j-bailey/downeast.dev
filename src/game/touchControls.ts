import { parentIsTall } from "./scaleMode";

/** Shared analog stick / Harbor stick-X deadzone. */
export const STICK_DEADZONE = 0.15;

const NARROW_CSS_PX = 720;

function stickForced(search = window.location.search): boolean {
  return new URLSearchParams(search).get("stick") === "1";
}

/** Show on-screen stick on touch, coarse pointer, narrow, or tall phone. */
export function shouldShowVirtualStick(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if (stickForced()) {
    return true;
  }
  if ("ontouchstart" in window) {
    return true;
  }
  try {
    if (window.matchMedia("(pointer: coarse)").matches) {
      return true;
    }
  } catch {
    // matchMedia can throw in odd runtimes
  }
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  if (w <= NARROW_CSS_PX) {
    return true;
  }
  return parentIsTall(w, h);
}
