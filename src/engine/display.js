import { W, H, clamp } from "./core.js";

/** Present a 480×270 scene buffer full-bleed on the window (cover crop). */
export function createDisplay(canvas) {
  const sctx = canvas.getContext("2d", { alpha: false });
  let cw = 1;
  let ch = 1;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cw = Math.max(1, Math.round(innerWidth * dpr));
    ch = Math.max(1, Math.round(innerHeight * dpr));
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = innerWidth + "px";
    canvas.style.height = innerHeight + "px";
  }

  function layout(focusX) {
    const scale = Math.max(cw / W, ch / H);
    const visW = Math.min(W, cw / scale);
    const visH = Math.min(H, ch / scale);
    const sx = visW < W ? clamp(Math.round(focusX - visW / 2), 0, Math.round(W - visW)) : 0;
    const sy = visH < H ? clamp(Math.round(H - visH - 6), 0, Math.round(H - visH)) : 0;
    return { sx, sy, sw: visW, sh: visH, dx: 0, dy: 0, dw: cw, dh: ch };
  }

  function present(buf, focusX) {
    sctx.imageSmoothingEnabled = false;
    const L = layout(focusX);
    sctx.fillStyle = "#100f0f";
    sctx.fillRect(0, 0, cw, ch);
    sctx.drawImage(buf, L.sx, L.sy, L.sw, L.sh, L.dx, L.dy, L.dw, L.dh);
  }

  return { resize, present, layout };
}
