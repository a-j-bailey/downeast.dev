import { parentIsTall } from "./scaleMode";

/** Shared analog stick / Harbor stick-X deadzone. */
export const STICK_DEADZONE = 0.15;

/** Show on-screen stick on touch / coarse pointer / tall phone. */
export function shouldShowVirtualStick(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  if ("ontouchstart" in window) {
    return true;
  }
  try {
    if (window.matchMedia("(pointer: coarse)").matches) {
      return true;
    }
  } catch {
    // ignore
  }
  const w = window.innerWidth || 1;
  const h = window.innerHeight || 1;
  return parentIsTall(w, h);
}
