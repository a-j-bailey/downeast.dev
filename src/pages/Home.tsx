import { ProjectTag, tagColorAt } from "../components/ProjectTag";
import { DocumentTitle } from "../components/DocumentTitle";
import { projects } from "../content/projects";

export function Home() {
  return (
    <article className="home">
      <DocumentTitle kind="home" />
      <figure className="hero">
        <img
          className="hero-print"
          src="/boat-print.png"
          alt="Ink drawing of a man working on a laptop at the stern of a Downeast motorboat."
          width={1936}
          height={979}
        />
      </figure>
      <h1 className="wordmark">downeast.dev</h1>
      <p className="name">Adam Bailey</p>
      <p className="lede">fresh New England software</p>
      {projects.length > 0 ? (
        <section className="dock" aria-labelledby="dock-label">
          <h2 id="dock-label" className="dock-label">
            Projects
          </h2>
          <img
            className="dock-rail"
            src="/textures/dock-plank.jpg"
            alt=""
            width={1350}
            height={220}
          />
          <img
            className="rope-line"
            src="/textures/rope-line.jpg"
            alt=""
            width={1200}
            height={96}
          />
          <ul className="dock-tags">
            {projects.map((project, index) => (
              <ProjectTag
                key={project.title}
                project={project}
                color={tagColorAt({ index })}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
