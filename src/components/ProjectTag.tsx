import type { Project } from "../content/projects";

export const TAG_COLORS = ["yellow", "red", "green"] as const;
export type TagColor = (typeof TAG_COLORS)[number];

const TAG_PLATE: Record<TagColor, string> = {
  yellow: "/tags/tag-yellow.png",
  red: "/tags/tag-red.png",
  green: "/tags/tag-green.png",
};

export function tagColorAt({ index }: { index: number }): TagColor {
  const color = TAG_COLORS[index % TAG_COLORS.length];
  if (!color) {
    return "yellow";
  }
  return color;
}

function TagHeading({ project }: { project: Project }) {
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

export function ProjectTag({
  project,
  color,
}: {
  project: Project;
  color: TagColor;
}) {
  return (
    <li className={`tag tag-${color}`}>
      <img
        className="tag-hanger"
        src="/tags/hanger.png"
        alt=""
        width={131}
        height={406}
      />
      <div className="tag-body">
        <img
          className="tag-plate"
          src={TAG_PLATE[color]}
          alt=""
          width={420}
          height={630}
        />
        <div className="tag-copy">
          <h2 className="tag-title">
            <TagHeading project={project} />
          </h2>
          <p className="tag-year">{project.year}</p>
          <p className="tag-summary">{project.summary}</p>
        </div>
      </div>
    </li>
  );
}
