export const SITE_HOST = "downeast.dev";
export const SITE_URL = `https://${SITE_HOST}`;
export const PERSON_NAME = "Adam Bailey";
export const X_PROFILE_URL = "https://x.com/downeastdev";
export const GITHUB_PROFILE_URL = "https://github.com/a-j-bailey";

export type SiteTitle =
  | { kind: "home" }
  | { kind: "page"; page: string };

export function siteTitle(title: SiteTitle): string {
  switch (title.kind) {
    case "home":
      return `${SITE_HOST}, ${PERSON_NAME}`;
    case "page":
      return `${title.page}, ${SITE_HOST}`;
    default: {
      const _exhaustive: never = title;
      return _exhaustive;
    }
  }
}
