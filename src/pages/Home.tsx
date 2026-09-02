import { DocumentTitle } from "../components/DocumentTitle";
import { UnderwayHero } from "../components/UnderwayHero";

export function Home() {
  return (
    <article className="home home-underway">
      <DocumentTitle kind="home" />
      <UnderwayHero />
      <h1 className="wordmark">downeast.dev</h1>
      <p className="name">Adam Bailey</p>
      <p className="lede">fresh New England software</p>
    </article>
  );
}
