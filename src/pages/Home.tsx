import { DocumentTitle } from "../components/DocumentTitle";
import { XLink } from "../components/XLink";

export function Home() {
  return (
    <article className="home">
      <DocumentTitle />
      <figure className="hero">
        <img
          src="/boat.png"
          alt="Ink drawing of a man working on a laptop at the stern of a Downeast motorboat."
          width={1936}
          height={979}
        />
      </figure>
      <h1 className="wordmark">downeast.dev</h1>
      <p className="name">Adam Bailey</p>
      <p className="lede">fresh New England software</p>
      <p className="home-links">
        <XLink />
      </p>
    </article>
  );
}
