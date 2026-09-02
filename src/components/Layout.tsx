import { NavLink, Outlet, useLocation } from "react-router-dom";
import { projects } from "../content/projects";
import { thoughts } from "../content/thoughts";
import { GitHubLink } from "./GitHubLink";
import { XLink } from "./XLink";

export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="shell">
        <header className={isHome ? "site-header is-home" : "site-header"}>
          {isHome ? null : (
            <NavLink to="/" className="wordmark-link">
              downeast.dev
            </NavLink>
          )}
          <nav className="nav" aria-label="Site">
            {projects.length > 0 ? (
              <NavLink to="/projects">Projects</NavLink>
            ) : null}
            {thoughts.length > 0 ? (
              <NavLink to="/thoughts">Thoughts</NavLink>
            ) : null}
            <GitHubLink />
            <XLink />
          </nav>
        </header>
        <img
          className="header-rope"
          src="/textures/rope-line.jpg"
          alt=""
          width={1200}
          height={96}
        />
        <main id="main" className="site-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}
