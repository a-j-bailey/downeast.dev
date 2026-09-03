import { DocumentTitle } from "../components/DocumentTitle";
import { HarborGame } from "../components/HarborGame";

export function Home() {
  return (
    <div className="harbor-page">
      <DocumentTitle kind="home" />
      <HarborGame />
      <h1 className="harbor-wordmark">downeast.dev</h1>
    </div>
  );
}
