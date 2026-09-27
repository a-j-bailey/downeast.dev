export const SITE_HOST = "downeast.dev";
export const SITE_URL = `https://${SITE_HOST}`;
export const PERSON_NAME = "Adam Bailey";
export const SITE_BLURB = "Adam Bailey. fresh New England software";
export const X_PROFILE_URL = "https://x.com/downeastdev";
export const GITHUB_PROFILE_URL = "https://github.com/a-j-bailey";
export const TIME_ZONE = "America/New_York";

export function pageTitle(kind) {
  switch (kind) {
    case "home":
      return `${SITE_HOST}, ${PERSON_NAME}`;
    case "projects":
      return `Projects, ${SITE_HOST}`;
    case "thoughts":
      return `Thoughts, ${SITE_HOST}`;
    default: {
      const _exhaustive = kind;
      return _exhaustive;
    }
  }
}
