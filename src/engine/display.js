import { W, H, clamp } from "./core.js";

/**
 * Present a 480×270 buffer on the full-window screen canvas.
 * Tall / portrait: fill height, crop sides (lighthouse default; touch-drag to pan).
 * Landscape: integer-preferring nearest-neighbor contain, dimmed bars.
 */
export function createDisplay(canvas) {
  const sctx = canvas.getContext("2d", { alpha: false });
  let cw = 1;
  let ch = 1;
  let camX = null;
  let lastFocus = W / 2;
  let vx = 0;
  let lastTick = 0;
  let dragging = false;

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

  function coverMetrics(focusX) {
    const sceneAspect = W / H;
    const viewAspect = cw / ch;
    const cover = viewAspect + 0.02 < sceneAspect;
    if (!cover) return { cover: false, sw: W, maxSx: 0, def: 0 };
    const sw = Math.min(W, Math.max(1, Math.round((cw * H) / ch)));
    const maxSx = Math.max(0, W - sw);
    const def = clamp(focusX - sw / 2, 0, maxSx);
    return { cover: true, sw, maxSx, def };
  }

  function layout(focusX) {
    lastFocus = focusX;
    const m = coverMetrics(focusX);
    if (m.cover) {
      if (camX == null) camX = m.def;
      camX = clamp(camX, 0, m.maxSx);
      return {
        sx: Math.round(camX),
        sy: 0,
        sw: m.sw,
        sh: H,
        dx: 0,
        dy: 0,
        dw: cw,
        dh: ch,
        bars: false,
        cover: true,
        maxSx: m.maxSx,
      };
    }
    camX = null;
    vx = 0;
    let scale = Math.min(cw / W, ch / H);
    const whole = Math.floor(scale);
    if (whole >= 2 && scale - whole < 0.12) scale = whole;
    const dw = Math.round(W * scale);
    const dh = Math.round(H * scale);
    const dx = Math.round((cw - dw) / 2);
    const dy = Math.round((ch - dh) / 2);
    return { sx: 0, sy: 0, sw: W, sh: H, dx, dy, dw, dh, bars: dx > 2 || dy > 2, cover: false, maxSx: 0 };
  }

  function tickInertia(now) {
    if (dragging || !vx) {
      lastTick = now;
      return;
    }
    const dt = Math.min(32, now - lastTick);
    lastTick = now;
    const m = coverMetrics(lastFocus);
    if (!m.cover || camX == null) {
      vx = 0;
      return;
    }
    const next = camX - vx * dt;
    if (next <= 0 || next >= m.maxSx) {
      camX = clamp(next, 0, m.maxSx);
      vx = 0;
      return;
    }
    camX = next;
    vx *= Math.pow(0.9, dt / 16.67);
    if (Math.abs(vx) < 0.002) {
      vx = 0;
      camX = Math.round(camX);
    }
  }

  function present(buf, focusX) {
    tickInertia(performance.now());
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

  function bindPan(el) {
    let pid = null;
    let lastX = 0;
    let lastY = 0;
    let lastMoveT = 0;
    let axis = null;

    el.addEventListener("pointerdown", (e) => {
      if (e.isPrimary === false) return;
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const m = coverMetrics(lastFocus);
      if (!m.cover || m.maxSx <= 0) return;
      pid = e.pointerId;
      lastX = e.clientX;
      lastY = e.clientY;
      lastMoveT = performance.now();
      axis = null;
      vx = 0;
      dragging = true;
      if (camX == null) camX = m.def;
      try {
        el.setPointerCapture(pid);
      } catch {
        /* capture optional */
      }
    });

    el.addEventListener(
      "pointermove",
      (e) => {
        if (pid !== e.pointerId) return;
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        if (axis == null) {
          if (Math.hypot(dx, dy) < 8) return;
          axis = Math.abs(dx) >= Math.abs(dy) * 1.15 ? "x" : "none";
          if (axis !== "x") return;
        }
        if (axis !== "x") return;
        e.preventDefault();
        const now = performance.now();
        const dt = Math.max(8, now - lastMoveT);
        const { cssH } = viewSize();
        const dScene = dx * (H / cssH);
        const m = coverMetrics(lastFocus);
        camX = clamp((camX ?? m.def) - dScene, 0, m.maxSx);
        vx = dScene / dt;
        lastX = e.clientX;
        lastY = e.clientY;
        lastMoveT = now;
      },
      { passive: false },
    );

    const end = (e) => {
      if (pid !== e.pointerId) return;
      pid = null;
      dragging = false;
      lastTick = performance.now();
      if (axis !== "x") vx = 0;
      else if (camX != null) camX = clamp(camX, 0, coverMetrics(lastFocus).maxSx);
      axis = null;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
    el.addEventListener("lostpointercapture", end);
  }

  return { resize, present, layout, bindPan };
}
