export type Thought = {
  title: string;
  /** Calendar day as YYYY-MM-DD. */
  date: `${number}-${number}-${number}`;
  body: string;
};

/**
 * Notes on /thoughts. The page sorts by date, newest first.
 * An empty array hides Thoughts from the nav.
 */
export const thoughts: Thought[] = [];
