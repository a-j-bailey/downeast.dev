Game-ready harbor sprites (transparent PNG, integer pixels).

`coffee-interior.png` is locked (see `harbor/locked/coffee-interior.png`).

Source-of-truth inputs:
- `public/harbor/source/sheets/` (raw 1536x1024 sheets)
- `public/harbor/source/sliced/` (pre-sliced full-resolution sprites)

`scripts/harbor-sprites.py` is a **read-only verifier**: it only checks that
the approved game sprites and source art exist and are non-empty (it does
not regenerate images).

Verify:

```sh
python3 scripts/harbor-sprites.py
```

Image-gen templates for new facades and interiors: `harbor/PROMPTS.md`.
Art bible: `harbor/ART.md`.
Layer contract: `src/harbor/layers.ts`.
