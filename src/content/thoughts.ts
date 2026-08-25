export type Thought = {
  title: string;
  /** ISO date, YYYY-MM-DD. */
  date: string;
  body: string;
};

/**
 * Notes on /thoughts.
 *
 * Add an object. Newest first is nicest; the page sorts by date descending.
 */
export const thoughts: Thought[] = [];
