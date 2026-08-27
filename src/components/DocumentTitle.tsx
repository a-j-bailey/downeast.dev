import { useEffect } from "react";
import { siteTitle, type SiteTitle } from "../content/site";

export function DocumentTitle(props: SiteTitle) {
  const title = siteTitle(props);

  useEffect(() => {
    document.title = title;
  }, [title]);

  return null;
}
