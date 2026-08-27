import { GITHUB_PROFILE_URL } from "../content/site";

export function GitHubLink() {
  return (
    <a href={GITHUB_PROFILE_URL} rel="me">
      GitHub
    </a>
  );
}
