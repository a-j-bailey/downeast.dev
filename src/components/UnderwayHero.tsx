import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "../hooks/usePrefersReducedMotion";
import {
  WAKE_PATHS,
  WAKE_PNG_SIZE,
  WAKE_VIEWBOX,
  type WakePath,
} from "../wake/geometry";
import {
  layoutWake,
  wakeProgress,
  type WakeLayout,
} from "../wake/motion";

function strokeWidth(kind: WakePath["kind"]): number {
  switch (kind) {
    case "arm":
      return 1.35;
    case "chevron":
      return 1.05;
    case "tick":
      return 0.9;
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

function WakeStroke({
  path,
  offset,
}: {
  path: WakePath;
  offset: number;
}) {
  switch (path.kind) {
    case "arm":
    case "chevron":
    case "tick":
      return (
        <path
          className={`wake-stroke wake-stroke-${path.kind}`}
          d={path.d}
          pathLength={1}
          strokeWidth={strokeWidth(path.kind)}
          strokeDasharray={1}
          strokeDashoffset={offset}
        />
      );
    default: {
      const _exhaustive: never = path.kind;
      return _exhaustive;
    }
  }
}

export function UnderwayHero() {
  const reduced = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const boatRef = useRef<HTMLImageElement>(null);
  const [layout, setLayout] = useState<WakeLayout | null>(null);
  const [progress, setProgress] = useState(0.16);

  useEffect(() => {
    document.documentElement.classList.add("is-underway");
    return () => {
      document.documentElement.classList.remove("is-underway");
    };
  }, []);

  useLayoutEffect(() => {
    const boat = boatRef.current;
    const stage = stageRef.current;
    if (!boat || !stage) {
      return;
    }

    const measure = () => {
      setLayout(
        layoutWake(boat.getBoundingClientRect(), stage.getBoundingClientRect()),
      );
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(boat);
    observer.observe(stage);
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    if (reduced) {
      return;
    }

    const boat = boatRef.current;
    const stage = stageRef.current;
    if (!boat || !stage) {
      return;
    }

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const update = () => {
      frame = 0;
      const stageBox = stage.getBoundingClientRect();
      const nextLayout = layoutWake(boat.getBoundingClientRect(), stageBox);
      const next = wakeProgress({
        pointer,
        scrollY: window.scrollY,
        stern: {
          x: stageBox.left + nextLayout.stern.x,
          y: stageBox.top + nextLayout.stern.y,
        },
        range: Math.max(window.innerWidth * 0.55, 280),
      });
      setProgress((prev) => (Math.abs(prev - next) < 0.008 ? prev : next));
    };

    const requestTick = () => {
      if (frame === 0) {
        frame = requestAnimationFrame(update);
      }
    };

    const onPointer = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      requestTick();
    };

    window.addEventListener("pointermove", onPointer);
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("scroll", requestTick, { passive: true });
    requestTick();

    return () => {
      if (frame !== 0) {
        cancelAnimationFrame(frame);
      }
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("scroll", requestTick);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [reduced]);

  const clip = `inset(0 0 0 ${(1 - progress) * 100}%)`;
  const offset = 1 - progress;

  return (
    <div className="underway-stage" ref={stageRef}>
      {reduced || layout === null ? null : (
        <div className="wake-field">
          <img
            className="wake-png"
            src="/underway-wake.png"
            alt=""
            width={WAKE_PNG_SIZE.width}
            height={WAKE_PNG_SIZE.height}
            style={{
              left: layout.png.left,
              top: layout.png.top,
              width: layout.png.width,
              height: layout.png.height,
              clipPath: clip,
            }}
          />
          <svg
            className="wake-svg"
            viewBox={`0 0 ${WAKE_VIEWBOX.width} ${WAKE_VIEWBOX.height}`}
            aria-hidden="true"
            style={{
              left: layout.svg.left,
              top: layout.svg.top,
              width: layout.svg.width,
              height: layout.svg.height,
            }}
          >
            <g
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {WAKE_PATHS.filter((path) => path.kind === "arm").map(
                (path, index) => (
                  <WakeStroke key={index} path={path} offset={offset} />
                ),
              )}
            </g>
          </svg>
        </div>
      )}
      <figure className="hero">
        <img
          ref={boatRef}
          src="/boat.png"
          alt="Ink drawing of a man working on a laptop at the stern of a Downeast motorboat."
          width={1936}
          height={979}
        />
      </figure>
    </div>
  );
}
