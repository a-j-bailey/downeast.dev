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
import { VIEW_H, VIEW_W } from "./view";

function fit(wrap: HTMLElement, canvas: HTMLCanvasElement): void {
  const scale = Math.max(
    1,
    Math.floor(Math.min(wrap.clientWidth / VIEW_W, wrap.clientHeight / VIEW_H)),
  );
  canvas.style.width = `${VIEW_W * scale}px`;
  canvas.style.height = `${VIEW_H * scale}px`;
}

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
    const resize = () => fit(wrap, canvas);
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    return () => {
      game.destroy();
      ro.disconnect();
    };
  }, []);

  return (
    <div className="harbor" data-period={period} ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="harbor-canvas"
        width={VIEW_W}
        height={VIEW_H}
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
