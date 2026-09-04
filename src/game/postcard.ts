import { SITE_URL } from "../content/site";

export const POSTCARD_STORAGE_KEY = "harbor-postcard-v1";
export const POSTCARD_WALK_S = 30;
export const POSTCARD_FORCE_DELAY_MS = 1200;
export const POSTCARD_SHOT_KEY = "postcard-shot";

const SHARE_LINE = "Greetings from the harbor.";

export function postcardForced(search: string): boolean {
  return new URLSearchParams(search).get("card") === "1";
}

export function postcardAlreadyShown(): boolean {
  try {
    return localStorage.getItem(POSTCARD_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function markPostcardShown(): void {
  try {
    localStorage.setItem(POSTCARD_STORAGE_KEY, "1");
  } catch {
    // quota / private mode
  }
}

export function shouldOfferPostcard(search: string): boolean {
  return postcardForced(search) || !postcardAlreadyShown();
}

/** Visitor share composer — never posts as @downeastdev. */
export function postcardShareUrl(): string {
  const text = `${SHARE_LINE} ${SITE_URL}`;
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

export function openPostcardShare(): void {
  window.open(postcardShareUrl(), "_blank", "noopener,noreferrer");
}

/** Center crop of the view, 1:1 game pixels, fits the cream card. */
export function postcardPhotoRect(
  viewW: number,
  viewH: number,
): { x: number; y: number; width: number; height: number } {
  const width = Math.max(64, Math.min(240, viewW - 40));
  const height = Math.max(48, Math.min(128, viewH - 88));
  return {
    x: Math.floor((viewW - width) / 2),
    y: Math.floor((viewH - height) / 2),
    width,
    height,
  };
}
