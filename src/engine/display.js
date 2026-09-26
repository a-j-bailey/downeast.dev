import { W, H, clamp } from "./core.js";

/** Present a 480×270 buffer on the full-window screen canvas. */
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
    if (cw < ch) {
      const scale = ch / H;
      const sw = Math.min(W, cw / scale);
      const sx = clamp(Math.round(focusX - sw / 2), 0, W - sw);
      return { sx, sy: 0, sw, sh: H, dx: 0, dy: 0, dw: cw, dh: ch, bars: false };
    }
    let scale = Math.min(cw / W, ch / H);
    const whole = Math.floor(scale);
    if (whole >= 2 && scale - whole < 0.12) scale = whole;
    const dw = Math.round(W * scale);
    const dh = Math.round(H * scale);
    const dx = Math.round((cw - dw) / 2);
    const dy = Math.round((ch - dh) / 2);
    return { sx: 0, sy: 0, sw: W, sh: H, dx, dy, dw, dh, bars: dx > 2 || dy > 2 };
  }

  function draw(buf, focusX, alpha) {
    const L = layout(focusX);
    sctx.globalAlpha = alpha;
    sctx.drawImage(buf, L.sx, L.sy, L.sw, L.sh, L.dx, L.dy, L.dw, L.dh);
    sctx.globalAlpha = 1;
    return L;
  }

  function present(buf, focusX) {
    sctx.imageSmoothingEnabled = false;
    const L = layout(focusX);
    if (L.bars) {
      sctx.drawImage(buf, 0, 0, W, H, 0, 0, cw, ch);
      sctx.fillStyle = "rgba(12, 10, 8, 0.78)";
      sctx.fillRect(0, 0, cw, ch);
    }
    draw(buf, focusX, 1);
  }

  return { resize, present, layout };
}
