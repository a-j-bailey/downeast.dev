import { useEffect } from "react";

const SITE = "downeast.dev";

export function DocumentTitle({ title }: { title?: string }) {
  useEffect(() => {
    document.title = title ? `${title} — ${SITE}` : `${SITE} — Adam Bailey`;
  }, [title]);

  return null;
}
