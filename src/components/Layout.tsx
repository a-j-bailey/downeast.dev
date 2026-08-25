import { NavLink, Outlet, useLocation } from "react-router-dom";
import { XLink } from "./XLink";

export function Layout() {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className={isHome ? "site-header is-home" : "site-header"}>
        {isHome ? null : (
          <NavLink to="/" className="wordmark-link">
            downeast.dev
          </NavLink>
        )}
        <nav className="nav" aria-label="Site">
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/thoughts">Thoughts</NavLink>
          <XLink />
        </nav>
      </header>
      <main id="main" className="site-main">
        <Outlet />
      </main>
    </>
  );
}
