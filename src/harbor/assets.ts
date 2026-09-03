const FILES = {
  playerIdle: "/harbor/player-idle.png",
  playerUse: "/harbor/player-use.png",
  boat: "/harbor/boat.png",
  boatUnderway: "/harbor/boat-underway.png",
  wake: "/harbor/wake.png",
  pier: "/harbor/pier.png",
  kayak: "/harbor/kayak.png",
  paddle: "/harbor/paddle.png",
  shackA: "/harbor/shack-a.png",
  shackB: "/harbor/shack-b.png",
  coffeeShop: "/harbor/coffee-shop.png",
  coffeeInterior: "/harbor/coffee-interior.png",
  seawall: "/harbor/seawall.png",
  seawallStairs: "/harbor/seawall-stairs.png",
  trap: "/harbor/trap.png",
  trapStack: "/harbor/trap-stack.png",
  trapBuoy: "/harbor/trap-buoy.png",
  signGithub: "/harbor/sign-github.png",
  signX: "/harbor/sign-x.png",
  lighthouse: "/harbor/lighthouse.png",
  farShore: "/harbor/far-shore.png",
  shark: "/harbor/shark.png",
  sharkFin: "/harbor/shark-fin.png",
  cloud: "/harbor/cloud.png",
  painting: "/boat.png",
} as const;

type FileKey = keyof typeof FILES;

export type Assets = Record<FileKey, HTMLImageElement> & {
  playerWalk: HTMLImageElement[];
  waves: HTMLImageElement[];
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Missing ${src}`));
    img.src = src;
  });
}

export async function loadAssets(): Promise<Assets> {
  const keys = Object.keys(FILES) as FileKey[];
  const images = await Promise.all(keys.map((k) => loadImage(FILES[k])));
  const base = {} as Record<FileKey, HTMLImageElement>;
  keys.forEach((k, i) => {
    const img = images[i];
    if (!img) {
      throw new Error(`Missing ${k}`);
    }
    base[k] = img;
  });
  const playerWalk = await Promise.all(
    [0, 1, 2, 3].map((i) => loadImage(`/harbor/player-walk-${i}.png`)),
  );
  const waves = await Promise.all(
    [0, 1, 2].map((i) => loadImage(`/harbor/waves-${i}.png`)),
  );
  return { ...base, playerWalk, waves };
}

export function facadeImage(assets: Assets, id: string): HTMLImageElement {
  switch (id) {
    case "shack-a":
      return assets.shackA;
    case "shack-b":
      return assets.shackB;
    case "coffee-shop":
      return assets.coffeeShop;
    default:
      return assets.shackA;
  }
}

export function trapImage(assets: Assets, kind: "trap" | "trap-stack" | "trap-buoy"): HTMLImageElement {
  switch (kind) {
    case "trap":
      return assets.trap;
    case "trap-stack":
      return assets.trapStack;
    case "trap-buoy":
      return assets.trapBuoy;
    default: {
      const _x: never = kind;
      return _x;
    }
  }
}
