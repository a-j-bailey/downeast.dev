import { useEffect, useRef } from "react";
import { EventBus } from "../game/EventBus";

export function HarborGame() {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = parentRef.current;
    if (!parent) {
      return;
    }

    document.documentElement.classList.add("harbor-play");
    parent.focus();

    let cancelled = false;
    let game: { destroy: (removeCanvas: boolean) => void } | undefined;

    const onReady = (): void => {
      parentRef.current?.focus();
    };
    EventBus.on("current-scene-ready", onReady);

    void import("../game/createGame").then(({ createHarborGame }) => {
      if (cancelled || !parentRef.current) {
        return;
      }
      game = createHarborGame(parentRef.current);
    });

    return () => {
      cancelled = true;
      EventBus.off("current-scene-ready", onReady);
      document.documentElement.classList.remove("harbor-play");
      game?.destroy(true);
    };
  }, []);

  return (
    <div
      ref={parentRef}
      className="harbor-root"
      id="harbor-game"
      tabIndex={-1}
      role="application"
      aria-label="Downeast harbor"
    />
  );
}
