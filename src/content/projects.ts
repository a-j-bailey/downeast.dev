type ProjectBase = {
  title: string;
  summary: string;
  year: number;
};

export type LinkedProject = ProjectBase & {
  kind: "link";
  url: string;
};

export type ListedProject = ProjectBase & {
  kind: "listed";
};

export type Project = LinkedProject | ListedProject;

/**
 * Work on /projects. The page renders this array in order.
 * An empty array hides Projects from the nav.
 */
export const projects: Project[] = [
  {
    kind: "link",
    url: "https://zoning-radar.com",
    title: "Zoning Radar",
    year: 2026,
    summary: "Rhode Island zoning and planning applications, in your inbox while they're still pending. All 39 towns. You get the source PDF.",
  },
  {
    kind: "link",
    url: "https://potager.app",
    title: "Potager",
    year: 2026,
    summary: "Nearby farm stands and what's in season. Growers list what's fresh on a map they can update.",
  },
  {
    kind: "link",
    url: "https://magicmirrorcreative.com/weatherotter",
    title: "Weather Otter",
    year: 2026,
    summary: "An iPhone app that watches the forecast for a named activity and a place, then shows the next window that fits. Not a weather dashboard.",
  },
];
