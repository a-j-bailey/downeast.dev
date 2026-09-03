import type { Assets } from "./assets";
import { facadeImage, trapImage } from "./assets";
import { LAYERS } from "./layers";
import { PAL } from "./palette";
import type { Period, Place, Weather } from "./types";
import { GROUND_Y, VIEW_H, VIEW_W, WATER_Y } from "./view";
import {
  BUILDINGS,
  FAR_SHORE_Y,
  INTERIORS,
  KAYAK,
  LIGHTHOUSE,
  PIER,
  SIGNS,
  TRAPS,
} from "./world";

export type DrawState = {
  place: Place;
  camX: number;
  playerX: number;
  playerY: number;
  facing: 1 | -1;
  moving: boolean;
  using: boolean;
  walkFrame: number;
  boatX: number;
  boatY: number;
  boatFacing: 1 | -1;
  boatSpeed: number;
  boarded: boolean;
  weather: Weather;
  time: number;
  fade: number;
  shark: { alive: boolean; kind: "fin" | "full"; x: number; y: number; facing: 1 | -1 };
};

function px(n: number): number {
  return Math.round(n);
}

function blit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  flip = false,
): void {
  const dx = px(x);
  const dy = px(y);
  if (!flip) {
    ctx.drawImage(img, dx, dy);
    return;
  }
  ctx.save();
  ctx.translate(dx + img.width, dy);
  ctx.scale(-1, 1);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

function viewX(worldX: number, camX: number, parallax: number): number {
  return px(worldX - camX * parallax);
}

function skyFill(period: Period): string {
  switch (period) {
    case "night":
      return PAL.ink;
    case "dusk":
      return "#f0d4b0";
    default:
      return PAL.paper;
  }
}

function drawSky(ctx: CanvasRenderingContext2D, state: DrawState, assets: Assets): void {
  const { weather, camX, time } = state;
  ctx.fillStyle = skyFill(weather.period);
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  if (weather.period === "dusk") {
    const g = ctx.createLinearGradient(0, 0, 0, WATER_Y);
    g.addColorStop(0, "#f0d4b0");
    g.addColorStop(0.55, PAL.dusk);
    g.addColorStop(1, "#6a2a12");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, WATER_Y + 8);
  }

  if (weather.period === "night") {
    ctx.fillStyle = PAL.paper;
    let s = 24681;
    const rand = () => {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      return s / 0x7fffffff;
    };
    for (let i = 0; i < 48; i++) {
      const x = Math.floor(rand() * VIEW_W);
      const y = Math.floor(rand() * (WATER_Y - 12));
      if (rand() > 0.35) {
        ctx.fillRect(x, y, 1, 1);
      }
      if (rand() > 0.92) {
        ctx.fillRect(x - 1, y, 3, 1);
        ctx.fillRect(x, y - 1, 1, 3);
      }
    }
    blit(ctx, assets.moon, VIEW_W - 48, 18);
  } else {
    const sunX = weather.period === "dusk" ? VIEW_W - 70 : 40;
    const sunY = weather.period === "dusk" ? 36 : 14;
    blit(ctx, assets.sun, sunX, sunY);
  }

  const par = LAYERS.sky.parallax;
  const cloudCount = 3 + Math.round((weather.cloudCover / 100) * 5);
  for (let i = 0; i < cloudCount; i++) {
    const wx = i * 140 + 20 + Math.sin(time / 8000 + i) * 8;
    const x = viewX(wx, camX, par) % (VIEW_W + 80);
    blit(ctx, assets.cloud, x - 40, 10 + (i % 3) * 12);
  }
}

function drawFar(ctx: CanvasRenderingContext2D, state: DrawState, assets: Assets): void {
  const par = LAYERS.far.parallax;
  const tile = assets.farShore.width;
  const start = viewX(-400, state.camX, par);
  for (let x = start % tile; x < VIEW_W + tile; x += tile) {
    blit(ctx, assets.farShore, x - tile, FAR_SHORE_Y);
  }
  const lx = viewX(LIGHTHOUSE.x, state.camX, par);
  blit(ctx, assets.lighthouse, lx, LIGHTHOUSE.y);
  if (state.weather.period === "night" && Math.floor(state.time / 700) % 2 === 0) {
    ctx.fillStyle = PAL.sun;
    ctx.fillRect(lx + 46, LIGHTHOUSE.y + 2, 6, 6);
    ctx.fillStyle = "rgba(173, 131, 1, 0.18)";
    ctx.beginPath();
    ctx.moveTo(lx + 49, LIGHTHOUSE.y + 8);
    ctx.lineTo(lx + 110, LIGHTHOUSE.y + 50);
    ctx.lineTo(lx + 49, LIGHTHOUSE.y + 18);
    ctx.fill();
  }
}

function drawWater(ctx: CanvasRenderingContext2D, state: DrawState, assets: Assets): void {
  const par = LAYERS.water.parallax;
  const frame = Math.floor(state.time / 180) % 3;
  const tile = assets.waves[frame] ?? assets.waves[0];
  if (!tile) {
    return;
  }
  const shift = viewX(0, state.camX, par);
  const w = tile.width;
  for (let x = (shift % w) - w; x < VIEW_W + w; x += w) {
    blit(ctx, tile, x, WATER_Y);
    blit(ctx, tile, x, WATER_Y + 18);
  }
}

function drawLand(ctx: CanvasRenderingContext2D, state: DrawState, assets: Assets): void {
  const cam = state.camX;
  const par = LAYERS.land.parallax;
  const groundY = GROUND_Y;
  const streetL = viewX(80, cam, par);
  const streetR = viewX(640, cam, par);
  ctx.fillStyle = "#6e5234";
  ctx.fillRect(streetL, groundY, streetR - streetL, VIEW_H - groundY);
  const tile = assets.ground;
  for (let x = streetL; x < streetR; x += tile.width) {
    blit(ctx, tile, x, groundY);
  }
  const wall = assets.seawall;
  for (let wx = 80; wx < 640; wx += wall.width) {
    blit(ctx, wall, viewX(wx, cam, par), 122);
  }
  blit(ctx, assets.seawallStairs, viewX(168, cam, par), 122);
  blit(ctx, assets.pier, viewX(PIER.x, cam, par), PIER.y);
  for (const b of BUILDINGS) {
    blit(ctx, facadeImage(assets, b.facade), viewX(b.x, cam, par), b.y);
  }
  blit(ctx, assets.barrel, viewX(332, cam, par), groundY - 16);
  for (const t of TRAPS) {
    const img = trapImage(assets, t.kind);
    blit(ctx, img, viewX(t.x, cam, par), groundY - img.height + 4);
  }
}

function drawActors(ctx: CanvasRenderingContext2D, state: DrawState, assets: Assets): void {
  const cam = state.camX;
  const par = LAYERS.actors.parallax;
  blit(ctx, assets.kayak, viewX(KAYAK.x, cam, par), KAYAK.y);
  blit(ctx, assets.paddle, viewX(KAYAK.x + 8, cam, par), KAYAK.y - 6);

  if (state.shark.alive) {
    const img = state.shark.kind === "full" ? assets.shark : assets.sharkFin;
    blit(
      ctx,
      img,
      viewX(state.shark.x, cam, par),
      state.shark.y,
      state.shark.facing < 0,
    );
  }

  const moving = Math.abs(state.boatSpeed) > 8;
  const boatImg = moving ? assets.boatUnderway : assets.boat;
  const bob = Math.sin(state.time / 420) * 1.2;
  const bx = viewX(state.boatX, cam, par);
  const by = state.boatY + bob;
  blit(ctx, boatImg, bx, by, state.boatFacing > 0);
  if (moving) {
    const wakeX = state.boatFacing < 0 ? bx + boatImg.width - 8 : bx - assets.wake.width + 8;
    blit(ctx, assets.wake, wakeX, by + 28, state.boatFacing > 0);
  }

  if (state.place === "harbor" && !state.boarded) {
    drawPlayer(ctx, assets, state, viewX(state.playerX, cam, par), state.playerY);
  }
}

function drawFg(ctx: CanvasRenderingContext2D, state: DrawState, assets: Assets): void {
  const cam = state.camX;
  const par = LAYERS.fg.parallax;
  for (const s of SIGNS) {
    const img = s.id === "github" ? assets.signGithub : assets.signX;
    blit(ctx, img, viewX(s.x, cam, par), s.y);
  }
}

function playerFrame(assets: Assets, state: DrawState): HTMLImageElement {
  if (state.using) {
    return assets.playerUse;
  }
  if (!state.moving) {
    return assets.playerIdle;
  }
  return assets.playerWalk[state.walkFrame] ?? assets.playerIdle;
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  assets: Assets,
  state: DrawState,
  x: number,
  y: number,
): void {
  blit(ctx, playerFrame(assets, state), x, y, state.facing < 0);
}

function drawInterior(ctx: CanvasRenderingContext2D, state: DrawState, assets: Assets): void {
  const room = INTERIORS.coffee;
  blit(ctx, assets.coffeeInterior, 0, 0);
  const p = room.painting;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(assets.painting, p.x, p.y, p.w, p.h);
  ctx.imageSmoothingEnabled = false;
  drawPlayer(ctx, assets, state, state.playerX, state.playerY);
}

function drawWeather(ctx: CanvasRenderingContext2D, state: DrawState, assets: Assets): void {
  const { weather, time, camX } = state;
  if (weather.fog) {
    const par = LAYERS.water.parallax;
    for (let i = 0; i < 8; i++) {
      const wx = i * 90 + ((time / 40) % 90);
      blit(ctx, assets.fog, viewX(wx, camX, par), WATER_Y - 4 + (i % 3) * 4);
    }
  }
  if (weather.rain) {
    ctx.fillStyle = PAL.rain;
    const origin = Math.floor(time / 16);
    for (let i = 0; i < 70; i++) {
      const x = ((i * 47 + origin * 3) % (VIEW_W + 20)) - 10;
      const y = ((i * 31 + origin * 8) % (VIEW_H + 20)) - 10;
      ctx.fillRect(x, y, 1, 4);
    }
  }
  if (weather.period === "dusk") {
    ctx.fillStyle = "rgba(188, 82, 21, 0.16)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  if (weather.period === "night") {
    ctx.fillStyle = "rgba(16, 15, 15, 0.22)";
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  state: DrawState,
  assets: Assets,
): void {
  ctx.imageSmoothingEnabled = false;
  if (state.place !== "harbor") {
    drawInterior(ctx, state, assets);
  } else {
    drawSky(ctx, state, assets);
    drawFar(ctx, state, assets);
    drawWater(ctx, state, assets);
    drawLand(ctx, state, assets);
    drawActors(ctx, state, assets);
    drawFg(ctx, state, assets);
    drawWeather(ctx, state, assets);
  }
  if (state.fade > 0) {
    ctx.fillStyle = `rgba(16, 15, 15, ${state.fade})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
}
