# Per-ship aiming-state drafts

Ship silhouettes approved 2026-11-23. These state sheets are drafted for review before the
next gameplay build. They are authored on a 24×16 pixel grid with a fixed ten-colour palette (eight steel, glass and fire colours plus the two accent shades),
then rotated with nearest-neighbour sampling. No antialiasing or partially transparent pixels.
Ships are steel with a trim in two shades of Cobalt (`accent`, `accentDark`); the Hangar's colour
choice replaces exactly those two shades, so a paint is an accent, never a whole-ship tint.

Each ship owns:

- `states.png`: 544×32 RGBA. The first sixteen 32×32 cells are the aiming directions;
  the final column contains the 24×16 icon at x=516, y=8.
- `states.json`: cell names, coordinates, dimensions and direction convention.
- `design.json`: editable pixel-art source layers (the six approved gameplay ships).

Direction 0 faces right. Directions advance clockwise by 22.5°, matching the renderer.
The engine draws exhaust, shields, charge and weapon effects separately; they are not baked
into every hull state. Comet's legacy pixels are preserved in its own sheet.

| Ship | State sheet |
| --- | --- |
| Vanguard | [states.png](vanguard/states.png) |
| Dart | [states.png](dart/states.png) |
| Lancer | [states.png](lancer/states.png) |
| Wasp | [states.png](wasp/states.png) |
| Hammer | [states.png](hammer/states.png) |
| Moth | [states.png](moth/states.png) |
| Comet (legacy) | [states.png](comet/states.png) |

The runtime loads the individual sheets listed in `index.json`; the old
shared `ships.png` and its manifest have been removed.

Regenerate draft PNGs/manifests with `node web/tools/make-ships.mjs`. This authors assets only;
it does not run the gameplay build. Keep all colours and binary alpha intact when editing.
