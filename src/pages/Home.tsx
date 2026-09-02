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

function HomeProject({ project }: { project: Project }) {
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

export function Home() {
  return (
    <article className="home">
      <DocumentTitle kind="home" />
      <div className="cut">
        <img
          className="cut-print"
          src="/cut-and-beam.svg"
          alt=""
          width={1600}
          height={1000}
          aria-hidden="true"
        />
        <img
          className="cut-grain"
          src="/print-grain.png"
          alt=""
          width={800}
          height={500}
          aria-hidden="true"
        />
        <img
          className="cut-boat"
          src="/boat-cut.png"
          alt="Ink drawing of a man working on a laptop at the stern of a Downeast motorboat."
          width={1895}
          height={907}
        />
      </div>
      <div className="caption">
        <p className="wordmark">downeast.dev</p>
        <h1 className="name">Adam Bailey</h1>
        <p className="lede">fresh New England software</p>
        {projects.length > 0 ? (
          <ul className="list home-work">
            {projects.map((project) => (
              <HomeProject key={project.title} project={project} />
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}
