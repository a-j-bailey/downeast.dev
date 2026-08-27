export const SITE_HOST = "downeast.dev";
export const PERSON_NAME = "Adam Bailey";

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
