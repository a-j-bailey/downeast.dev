Game-ready harbor sprites (transparent PNG, integer pixels).

`coffee-interior.png` is locked. Regenerating sprites recopies `harbor/locked/coffee-interior.png` and does not redraw the room.

Regenerate:

```sh
python3 scripts/harbor-sprites.py
```

Image-gen templates for new facades and interiors: `harbor/PROMPTS.md`.
Art bible: `harbor/ART.md`.
Layer contract: `src/harbor/layers.ts`.
