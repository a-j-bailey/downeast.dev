import { DocumentTitle } from "../components/DocumentTitle";
import { Harbor } from "../harbor/Harbor";

export function Home() {
  return (
    <>
      <DocumentTitle kind="home" />
      <Harbor />
    </>
  );
}
