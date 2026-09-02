import { ProjectTag, tagColorAt } from "../components/ProjectTag";
import { DocumentTitle } from "../components/DocumentTitle";
import { projects } from "../content/projects";

export function Projects() {
  return (
    <article>
      <DocumentTitle kind="page" page="Projects" />
      <h1 className="page-title">Projects</h1>
      {projects.length === 0 ? (
        <p className="empty">Empty. I'm picky about what goes here.</p>
      ) : (
        <ul className="dock-tags dock-tags-page">
          {projects.map((project, index) => (
            <ProjectTag
              key={project.title}
              project={project}
              color={tagColorAt({ index })}
            />
          ))}
        </ul>
      )}
    </article>
  );
}
