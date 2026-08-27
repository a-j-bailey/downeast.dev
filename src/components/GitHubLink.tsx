import { GITHUB_PROFILE_URL } from "../content/site";

export function GitHubLink() {
  return (
    <a href={GITHUB_PROFILE_URL} rel="me" aria-label="a-j-bailey on GitHub">
      GitHub
    </a>
  );
}
