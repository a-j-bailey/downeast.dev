import { useEffect } from "react";
import { DocumentTitle } from "../components/DocumentTitle";
import { useCoastWeather } from "../weather/useCoastWeather";
import {
  groundOf,
  inkOf,
  washOf,
  type PrintInk,
  type Wash,
  type WeatherWindow,
} from "../weather/window";

const WASH_SRC = {
  clear: "/open-water/wash-clear.jpg",
  cloud: "/open-water/wash-cloud.jpg",
  rain: "/open-water/wash-rain.jpg",
  snow: "/open-water/wash-snow.jpg",
  fog: "/open-water/wash-fog.jpg",
  night: "/open-water/wash-night.jpg",
} satisfies Record<Wash, string>;

function PrintSky({
  wash,
  veil,
  islands,
}: {
  wash: Wash;
  veil: boolean;
  islands: boolean;
}) {
  return (
    <div className="print-sky" aria-hidden="true">
      <img
        className="print-wash"
        src={WASH_SRC[wash]}
        alt=""
        width={1536}
        height={1024}
      />
      {veil ? (
        <img
          className="print-veil"
          src="/open-water/fog-veil.jpg"
          alt=""
          width={1536}
          height={1024}
        />
      ) : null}
      {islands ? (
        <img
          className="print-islands"
          src="/open-water/islands.svg"
          alt=""
          width={320}
          height={90}
        />
      ) : null}
      <img
        className="print-washi"
        src="/open-water/washi-grain.jpg"
        alt=""
        width={1536}
        height={1024}
      />
    </div>
  );
}

function Forecast({ weather }: { weather: WeatherWindow }) {
  if (weather.kind !== "open") {
    return null;
  }

  return (
    <p className="forecast" aria-live="polite">
      {weather.lines.map((line) => (
        <span key={line} className="forecast-line">
          {line}
        </span>
      ))}
      <span className="forecast-place">{weather.place}</span>
    </p>
  );
}

function usePrintRoot({ wash, ink }: { wash: Wash; ink: PrintInk }) {
  useEffect(() => {
    const root = document.documentElement;
    const theme = document.querySelector('meta[name="theme-color"]');
    const previousTheme = theme?.getAttribute("content");

    root.classList.add("is-home");
    root.dataset.wash = wash;
    root.dataset.ink = ink;
    root.style.setProperty("--print-ground", groundOf(wash));
    theme?.setAttribute("content", groundOf(wash));

    return () => {
      root.classList.remove("is-home");
      delete root.dataset.wash;
      delete root.dataset.ink;
      root.style.removeProperty("--print-ground");
      if (theme && previousTheme) {
        theme.setAttribute("content", previousTheme);
      }
    };
  }, [wash, ink]);
}

export function Home() {
  const weather = useCoastWeather();
  const wash = washOf(weather);
  const ink = inkOf(wash);
  const boatSrc = ink === "paper" ? "/boat-paper.png" : "/boat.png";

  usePrintRoot({ wash, ink });

  return (
    <article className="print">
      <DocumentTitle kind="home" />
      <PrintSky
        wash={wash}
        veil={weather.kind === "fogbound"}
        islands={weather.kind === "open" && ink === "ink"}
      />
      <Forecast weather={weather} />
      <figure className="print-boat">
        {ink === "ink" ? (
          <img
            className="print-water"
            src="/open-water/water.svg"
            alt=""
            width={800}
            height={220}
          />
        ) : null}
        <img
          className="print-hull"
          src={boatSrc}
          alt="Ink drawing of a man working on a laptop at the stern of a Downeast motorboat."
          width={1936}
          height={979}
        />
      </figure>
      <div className="print-colophon">
        <h1 className="wordmark">downeast.dev</h1>
        <p className="name">Adam Bailey</p>
        <p className="lede">fresh New England software</p>
      </div>
    </article>
  );
}
