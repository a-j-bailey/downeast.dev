import { DocumentTitle } from "../components/DocumentTitle";
import { projects } from "../content/projects";

export function Projects() {
  return (
    <article>
      <DocumentTitle title="Projects" />
      <h1 className="page-title">Projects</h1>
      {projects.length === 0 ? (
        <p className="empty">Nothing here yet.</p>
      ) : (
        <ul className="list">
          {projects.map((project) => (
            <li key={project.title}>
              <div className="item-head">
                <h2 className="item-title">
                  {project.url ? (
                    <a href={project.url} rel="noreferrer">
                      {project.title}
                    </a>
                  ) : (
                    project.title
                  )}
                </h2>
                {project.year ? (
                  <span className="item-meta">{project.year}</span>
                ) : null}
                {project.example ? (
                  <span className="item-flag">example</span>
                ) : null}
              </div>
              <p className="item-body">{project.summary}</p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
