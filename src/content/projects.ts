export type Project = {
  title: string;
  summary: string;
  /** Four-digit year, if you want one. */
  year?: string;
  /** Optional outbound link. */
  url?: string;
  /**
   * Set true on the starter row so it is obvious to delete.
   * Remove this object when you add real work.
   */
  example?: boolean;
};

/**
 * Projects on /projects.
 *
 * Add an object. That is the whole workflow.
 * Sort however you like; the page renders this array in order.
 */
export const projects: Project[] = [
  {
    title: "Example project",
    year: "2026",
    summary:
      "A placeholder so you can see the layout. Delete this object and add your own.",
    url: "https://downeast.dev",
    example: true,
  },
];
