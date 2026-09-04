import { useEffect, useRef } from "react";
import { EventBus } from "../game/EventBus";
import { skyCss, type WeatherMood } from "../game/weather";

function isMood(value: unknown): value is WeatherMood {
  return (
    value === "clearDay" ||
    value === "overcast" ||
    value === "rain" ||
    value === "fog" ||
    value === "night"
  );
}

function applySky(mood: WeatherMood): void {
  document.documentElement.style.setProperty("--harbor-sky", skyCss(mood));
}

export function HarborGame() {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      return;
    }

    document.documentElement.classList.add("harbor-play");
    parent.tabIndex = 0;
    parent.focus({ preventScroll: true });

    let cancelled = false;
    let game: { destroy: (removeCanvas: boolean) => void; canvas?: HTMLCanvasElement } | undefined;

    const focusParent = (): void => {
      parentRef.current?.focus({ preventScroll: true });
    };

    const onReady = (): void => {
      focusParent();
    };

    const onWeather = (...args: unknown[]): void => {
      const mood = args[0];
      if (isMood(mood)) {
        applySky(mood);
      }
    };

    const onPointerDown = (): void => {
      focusParent();
    };

    EventBus.on("current-scene-ready", onReady);
    EventBus.on("harbor-weather", onWeather);
    parent.addEventListener("pointerdown", onPointerDown);

    void import("../game/createGame").then(({ createHarborGame }) => {
      if (cancelled || !parentRef.current) {
        return;
      }
      game = createHarborGame(parentRef.current);
      focusParent();
      game.canvas?.addEventListener("pointerdown", onPointerDown);
    });

    return () => {
      cancelled = true;
      EventBus.off("current-scene-ready", onReady);
      EventBus.off("harbor-weather", onWeather);
      parent.removeEventListener("pointerdown", onPointerDown);
      game?.canvas?.removeEventListener("pointerdown", onPointerDown);
      document.documentElement.classList.remove("harbor-play");
      document.documentElement.style.removeProperty("--harbor-sky");
      game?.destroy(true);
    };
  }, []);

  return (
    <div
      ref={parentRef}
      className="harbor-root"
      id="harbor-game"
      tabIndex={0}
      role="application"
      aria-label="Downeast harbor"
    />
  );
}
