import { Link } from "react-router-dom";
import { DocumentTitle } from "../components/DocumentTitle";

export function NotFound() {
  return (
    <article className="not-found">
      <DocumentTitle kind="page" page="Not found" />
      <h1 className="page-title">This page isn't here.</h1>
      <p>
        <Link to="/">Back to downeast.dev</Link>
      </p>
      <img
        className="wake"
        src="/wake.png"
        alt=""
        width={2093}
        height={197}
      />
    </article>
  );
}
