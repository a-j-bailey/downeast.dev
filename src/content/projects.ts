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
export const projects: Project[] = [];
