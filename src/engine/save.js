import { OUT_W, OUT_H, makeCanvas } from "./core.js";

export function savePNG(buf, name) {
  const [c, x] = makeCanvas(OUT_W, OUT_H);
  x.imageSmoothingEnabled = false;
  x.drawImage(buf, 0, 0, OUT_W, OUT_H);
  const a = document.createElement("a");
  a.download = `${name}.png`;
  a.href = c.toDataURL("image/png");
  a.click();
}
