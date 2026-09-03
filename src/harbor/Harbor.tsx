import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { GitHubLink } from "../components/GitHubLink";
import { XLink } from "../components/XLink";
import { projects } from "../content/projects";
import { thoughts } from "../content/thoughts";
import { GITHUB_PROFILE_URL, PERSON_NAME, X_PROFILE_URL } from "../content/site";
import { createGame } from "./game";
import "./harbor.css";
import type { Period, Prompt } from "./types";

export function Harbor() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prompt, setPrompt] = useState<Prompt>({ text: "", interactId: null });
  const [period, setPeriod] = useState<Period>("day");

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) {
      return;
    }
    const game = createGame(canvas, {
      onPrompt: setPrompt,
      onPeriod: setPeriod,
    });
    return () => {
      game.destroy();
    };
  }, []);

  return (
    <div className="harbor" data-period={period} ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="harbor-canvas"
        width={1}
        height={1}
        aria-hidden="true"
      />
      <div className="harbor-sky">
        <h1 className="harbor-wordmark">downeast.dev</h1>
        <p className="harbor-name">{PERSON_NAME}</p>
        <p className="harbor-lede">fresh New England software</p>
      </div>
      <header className="harbor-bar">
        <nav className="nav" aria-label="Site">
          {projects.length > 0 ? <NavLink to="/projects">Projects</NavLink> : null}
          {thoughts.length > 0 ? <NavLink to="/thoughts">Thoughts</NavLink> : null}
          <GitHubLink />
          <XLink />
        </nav>
      </header>
      <p className="harbor-help">
        Arrows or WASD to walk. E or Enter to use. Tap the ground to walk, tap a
        door or sign to use it.
      </p>
      {prompt.text ? (
        <p className="harbor-prompt" aria-live="polite">
          {prompt.text}
        </p>
      ) : null}
      <nav className="harbor-sr" aria-label="Harbor links">
        <a href={GITHUB_PROFILE_URL} rel="me">
          GitHub
        </a>
        <a href={X_PROFILE_URL} rel="me">
          X
        </a>
        {projects.length > 0 ? <NavLink to="/projects">Projects</NavLink> : null}
      </nav>
    </div>
  );
}
