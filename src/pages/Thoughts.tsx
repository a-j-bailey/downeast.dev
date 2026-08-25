import { DocumentTitle } from "../components/DocumentTitle";
import { thoughts } from "../content/thoughts";

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  if (!year || !month || !day) {
    return iso;
  }
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function Thoughts() {
  const sorted = [...thoughts].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <article>
      <DocumentTitle title="Thoughts" />
      <h1 className="page-title">Thoughts</h1>
      {sorted.length === 0 ? (
        <p className="empty">Nothing here yet.</p>
      ) : (
        <ul className="list">
          {sorted.map((thought) => (
            <li key={`${thought.date}-${thought.title}`}>
              <div className="item-head">
                <h2 className="item-title">{thought.title}</h2>
                <time className="item-meta" dateTime={thought.date}>
                  {formatDate(thought.date)}
                </time>
              </div>
              <p className="thought-body item-body">{thought.body}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
