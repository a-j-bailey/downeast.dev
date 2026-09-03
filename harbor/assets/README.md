# Harbor sprite payload

These are Adam's approved harbor sprites for the downeast.dev harbor diorama, sliced directly from his generated pixel-art sheets — they were never redrawn or regenerated.

The GitHub connector used to land these files cannot carry binary content, so the sprite sheet was packaged as a `tar.gz`, base64-encoded, and split into 8 chunk files (`sprites.b64.00` – `sprites.b64.07`) that live alongside this README.

## Unpacking

From the repo root, run:

```
bash harbor/assets/unpack.sh
```

This reassembles and decodes the chunks, verifies the archive's md5 checksum, extracts the 30 sprite PNGs into `public/harbor/`, and deletes this `harbor/assets/` directory. Afterwards, commit the extracted PNGs and the removal of `harbor/assets/`.

## Sprite manifest

30 sprites, dimensions measured with Pillow directly from the source PNGs (never guessed):

| Sprite | Dimensions (px) |
| --- | --- |
| boat-underway.png | 232x60 |
| boat.png | 171x51 |
| cloud.png | 75x22 |
| coffee-shop.png | 116x99 |
| far-shore.png | 124x10 |
| kayak.png | 62x11 |
| lighthouse.png | 142x91 |
| paddle.png | 52x5 |
| pier.png | 44x49 |
| player-idle.png | 27x43 |
| player-use.png | 27x43 |
| player-walk-0.png | 27x43 |
| player-walk-1.png | 27x43 |
| player-walk-2.png | 27x43 |
| player-walk-3.png | 27x43 |
| seawall-stairs.png | 87x38 |
| seawall.png | 148x37 |
| shack-a.png | 76x91 |
| shack-b.png | 77x85 |
| shark-fin.png | 35x20 |
| shark.png | 95x35 |
| sign-github.png | 35x53 |
| sign-x.png | 34x52 |
| trap-buoy.png | 41x25 |
| trap-stack.png | 44x30 |
| trap.png | 47x24 |
| wake.png | 185x31 |
| waves-0.png | 353x12 |
| waves-1.png | 353x19 |
| waves-2.png | 353x15 |
