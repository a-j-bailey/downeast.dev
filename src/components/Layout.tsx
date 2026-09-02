import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { projects } from "../content/projects";
import { thoughts } from "../content/thoughts";
import { GitHubLink } from "./GitHubLink";
import { XLink } from "./XLink";

export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  useEffect(() => {
    if (isHome) {
      document.documentElement.classList.add("is-home");
      return;
    }
    document.documentElement.classList.remove("is-home");
  }, [isHome]);

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className={isHome ? "print-root" : "shell"}>
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
        <main id="main" className={isHome ? "print-main" : "site-main"}>
          <Outlet />
        </main>
      </div>
    </>
  );
}
