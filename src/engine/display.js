import { W, H, clamp } from "./core.js";

/**
 * Present a 480×270 buffer on the full-window screen canvas.
 * Tall / portrait: fill height, crop sides around focusX (lighthouse).
 * Landscape: integer-preferring nearest-neighbor contain, dimmed bars.
 */
export function createDisplay(canvas) {
  const sctx = canvas.getContext("2d", { alpha: false });
  let cw = 1;
  let ch = 1;

  function viewSize() {
    const vv = window.visualViewport;
    return {
      cssW: Math.max(1, vv?.width ?? innerWidth),
      cssH: Math.max(1, vv?.height ?? innerHeight),
    };
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const { cssW, cssH } = viewSize();
    cw = Math.max(1, Math.round(cssW * dpr));
    ch = Math.max(1, Math.round(cssH * dpr));
    canvas.width = cw;
    canvas.height = ch;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.style.pointerEvents = "none";
    canvas.style.touchAction = "none";
    sctx.imageSmoothingEnabled = false;
  }

  function layout(focusX) {
    const sceneAspect = W / H;
    const viewAspect = cw / ch;
    const cover = viewAspect + 0.02 < sceneAspect;
    if (cover) {
      const scale = ch / H;
      const visW = cw / scale;
      const sw = Math.min(W, visW);
      const maxSx = Math.max(0, W - sw);
      const sx = clamp(focusX - sw / 2, 0, maxSx);
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

  function present(buf, focusX) {
    sctx.imageSmoothingEnabled = false;
    const L = layout(focusX);
    if (L.bars) {
      sctx.drawImage(buf, 0, 0, W, H, 0, 0, cw, ch);
      sctx.fillStyle = "rgba(16, 15, 15, 0.78)";
      sctx.fillRect(0, 0, cw, ch);
    } else {
      sctx.fillStyle = "#100f0f";
      sctx.fillRect(0, 0, cw, ch);
    }
    sctx.drawImage(buf, L.sx, L.sy, L.sw, L.sh, L.dx, L.dy, L.dw, L.dh);
  }

  return { resize, present, layout };
}
