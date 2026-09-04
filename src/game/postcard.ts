import { SITE_URL } from "../content/site";

export const POSTCARD_STORAGE_KEY = "harbor-postcard-v1";
export const POSTCARD_WALK_S = 30;
export const POSTCARD_FORCE_DELAY_MS = 1200;
export const POSTCARD_ART_KEY = "postcard-harbor";
export const POSTCARD_STAMP_KEY = "postcard-stamp";
export const POSTCARD_ART_W = 384;
export const POSTCARD_ART_H = 216;

const SHARE_LINE = "Greetings from Downeast.dev.";

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
