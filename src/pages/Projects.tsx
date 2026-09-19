import { DocumentTitle } from "../components/DocumentTitle";
import { projects, type Project } from "../content/projects";

function ProjectHeading({ project }: { project: Project }) {
  switch (project.kind) {
    case "link":
      return (
        <a href={project.url} rel="noreferrer">
          {project.title}
        </a>
      );
    case "listed":
      return project.title;
    default: {
      const _exhaustive: never = project;
      return _exhaustive;
    }
  }
}

function ProjectItem({ project }: { project: Project }) {
  return (
    <li>
      <div className="item-head">
        <h2 className="item-title">
          <ProjectHeading project={project} />
        </h2>
        <span className="item-meta">{project.year}</span>
      </div>
      <p className="item-body">{project.summary}</p>
    </li>
  );
}

export function Projects() {
  return (
    <article>
      <DocumentTitle kind="page" page="Projects" />
      <h1 className="page-title">Projects</h1>
      {projects.length > 0 ? (
        <ul className="list">
          {projects.map((project) => (
            <ProjectItem key={project.title} project={project} />
          ))}
        </ul>
      ) : null}
    </article>
  );
}
