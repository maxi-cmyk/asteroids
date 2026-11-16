"""Star-fill: the look shared by the Zodiarch, its zodiac creatures and Ninefold
(nextSteps.md P1.1). A silhouette mask becomes a dark-blue body filled with scattered
constellations, a rim in the creature's accent colour and the house 2 px outline.

    part = starfill(mask, rim=(255, 214, 120), seed=3, keys=[(x, y, (r, g, b))])

Bodies built from several parts (tails, segments, limbs) are star-filled part by part
and stacked back to front with `stack`, so each part keeps its own outline and the
silhouette reads. Deterministic: the same seed gives the same stars on every build.
Needs Pillow + NumPy.
"""
import math
import random
import numpy as np
from PIL import Image, ImageDraw

OUTLINE = (16, 8, 30)
NAVY_TOP = np.array((34, 52, 128))    # lit upper body
NAVY_LOW = np.array((12, 18, 62))     # shadowed lower body
LINE = (70, 96, 170)                  # constellation lines
STAR_DIM = (120, 140, 205)
STAR = (226, 232, 255)
STAR_GOLD = (255, 226, 150)
BAYER = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0


# ------------------------------------------------------------------ masks
def mask(size):
    return Image.new('L', size, 0)


def draw(m):
    return ImageDraw.Draw(m)


def bezier(points, n=48):
    """Points along a Bezier curve of any order."""
    out = []
    for i in range(n + 1):
        t = i / n
        p = list(points)
        while len(p) > 1:
            p = [((1 - t) * a[0] + t * b[0], (1 - t) * a[1] + t * b[1]) for a, b in zip(p, p[1:])]
        out.append(p[0])
    return out


def stroke(m, path, r0, r1):
    """A tapered tube along `path`: radius r0 at the start, r1 at the end."""
    path = densify(path)
    d = draw(m)
    n = len(path) - 1
    for i, (x, y) in enumerate(path):
        r = r0 + (r1 - r0) * (i / n if n else 0)
        d.ellipse((x - r, y - r, x + r, y + r), fill=255)
    return m


def densify(path, step=1.0):
    """Points every `step` px along a polyline, so circles stamped on it join up."""
    out = [path[0]]
    for (x0, y0), (x1, y1) in zip(path, path[1:]):
        n = max(1, int(math.hypot(x1 - x0, y1 - y0) / step))
        out += [(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n) for k in range(1, n + 1)]
    return out


def tube(m, path, radius):
    """Like `stroke`, with the radius a function of t in 0..1 (fluffy tails, tapered bodies)."""
    path = densify(path)
    d = draw(m)
    n = len(path) - 1
    for i, (x, y) in enumerate(path):
        r = radius(i / n if n else 0)
        d.ellipse((x - r, y - r, x + r, y + r), fill=255)
    return m


def as_bool(m):
    return np.asarray(m) > 127


def erode(b, n=1):
    out = b.copy()
    for _ in range(n):
        o = out.copy()
        o[1:, :] &= out[:-1, :]; o[:-1, :] &= out[1:, :]
        o[:, 1:] &= out[:, :-1]; o[:, :-1] &= out[:, 1:]
        out = o
    return out


def dilate(b, n=1):
    out = b.copy()
    for _ in range(n):
        o = out.copy()
        o[1:, :] |= out[:-1, :]; o[:-1, :] |= out[1:, :]
        o[:, 1:] |= out[:, :-1]; o[:, :-1] |= out[:, 1:]
        out = o
    return out


# ------------------------------------------------------------------ the fill
def _line(px, a, b, colour, inside):
    (x0, y0), (x1, y1) = a, b
    steps = int(max(abs(x1 - x0), abs(y1 - y0)))
    for i in range(1, steps):
        x = round(x0 + (x1 - x0) * i / steps)
        y = round(y0 + (y1 - y0) * i / steps)
        if inside[y, x]:
            px[y, x, :3] = colour


def starfill(m, rim=(255, 214, 120), seed=1, density=1 / 34, keys=(), detail=None,
             light=(-0.6, -0.8)):
    """RGBA sprite from a silhouette mask. `keys` are hand-placed bright stars (eyes, the
    weak point): (x, y, rgb). `detail` is an optional mask painted in the rim colour
    (horns, claws, whiskers)."""
    body = as_bool(m)
    h, w = body.shape
    px = np.zeros((h, w, 4), np.uint8)
    ys, xs = np.nonzero(body)
    if not len(ys):
        return Image.fromarray(px, 'RGBA')
    top, bottom = ys.min(), ys.max()

    # Navy body: lighter toward the top, ordered dither between two shades (8-bit banding).
    grad = (np.arange(h)[:, None] - top) / max(1, bottom - top)
    grad = np.clip(grad, 0, 1) + (BAYER[np.arange(h)[:, None] % 4, np.arange(w)[None, :] % 4] - .5) * .18
    level = np.clip(np.round(grad * 3) / 3, 0, 1)[..., None]
    fill = (NAVY_TOP * (1 - level) + NAVY_LOW * level).astype(np.uint8)
    px[body, :3] = fill[body]
    px[body, 3] = 255

    # Rim: the 1 px inner edge facing the light takes the accent colour, the rest a dim blue.
    edge = body & ~erode(body, 1)
    lx, ly = light
    shifted = np.zeros_like(body)
    sx, sy = int(round(-lx)), int(round(-ly))
    shifted[max(0, sy):h + min(0, sy), max(0, sx):w + min(0, sx)] = \
        body[max(0, -sy):h + min(0, -sy), max(0, -sx):w + min(0, -sx)]
    lit = edge & ~shifted
    px[edge, :3] = (52, 70, 150)
    px[lit, :3] = rim

    # Stars and constellations, kept 2 px inside the edge.
    rng = random.Random(seed)
    inner = erode(body, 2)
    iy, ix = np.nonzero(inner)
    count = int(len(iy) * density)
    stars = []
    for k in rng.sample(range(len(iy)), min(count, len(iy))):
        x, y = int(ix[k]), int(iy[k])
        if any(abs(x - a) + abs(y - b) < 4 for a, b, _ in stars):
            continue
        roll = rng.random()
        tier = 2 if roll < .08 else 1 if roll < .45 else 0
        stars.append((x, y, tier))
    # Small constellations: chains of 3-5 of the brighter stars, nearest neighbour each step.
    bright = [s for s in stars if s[2] >= 1]
    used = set()
    for start in rng.sample(bright, len(bright)):
        if start in used:
            continue
        chain = [start]
        used.add(start)
        for _ in range(rng.randint(2, 4)):
            x, y, _t = chain[-1]
            near = sorted((s for s in bright if s not in used),
                          key=lambda s: (s[0] - x) ** 2 + (s[1] - y) ** 2)
            if not near:
                break
            n = near[0]
            if math.hypot(n[0] - x, n[1] - y) > 22:
                break
            chain.append(n)
            used.add(n)
        for a, b in zip(chain, chain[1:]):
            _line(px, a[:2], b[:2], LINE, inner)
    for x, y, tier in stars:
        if tier == 0:
            px[y, x, :3] = STAR_DIM
        elif tier == 1:
            px[y, x, :3] = STAR
        else:
            px[y, x, :3] = STAR_GOLD
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                if inner[y + dy, x + dx]:
                    px[y + dy, x + dx, :3] = (170, 150, 110)

    if detail is not None:
        d = as_bool(detail)
        px[d, :3] = rim
        px[d, 3] = 255
    for x, y, rgb in keys:
        x, y = int(x), int(y)
        px[y, x, :3] = (255, 255, 255)
        soft = tuple(int(c * .85) for c in rgb)
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            px[y + dy, x + dx, :3] = rgb
            px[y + dy, x + dx, 3] = 255
        for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
            if body[y + dy, x + dx]:
                px[y + dy, x + dx, :3] = soft

    # House outline: 2 px, hard alpha.
    solid = px[..., 3] > 0
    ring = dilate(solid, 2) & ~solid
    px[ring, :3] = OUTLINE
    px[ring, 3] = 255
    return Image.fromarray(px, 'RGBA')


def stack(size, parts):
    """Composite star-filled parts back to front."""
    out = Image.new('RGBA', size, (0, 0, 0, 0))
    for part in parts:
        out.alpha_composite(part)
    return out
