"""The twelve zodiac creatures redrawn after the classical constellation figures (nextSteps.md
P2.2): the forms of Ptolemy's catalogue as the engraved star atlases draw them (Bayer 1603,
Hevelius 1690, Flamsteed 1729, Urania's Mirror 1824).

Unlike the P1 creatures, a figure is one silhouette per depth layer, not a stack of separately
outlined parts: the near body is a single star-filled mask, limbs on the far side are a darker
layer behind it, and anatomy (muscle, fleece, feathers, drapery) is drawn in as fine engraving
lines in the creature's rim colour. Every creature faces left, toward the pilot, and has two
poses: `hold` (the atlas pose, while it forms) and `strike` (when it attacks). Its key star sits
on the constellation's real named star.

    img, key = FIGURES['leo']('hold')
"""
import math
import random
import numpy as np
from PIL import Image

from starfill import mask, draw, bezier, tube, starfill, dilate, erode

FAR_DIM = .58       # far-side limbs: the star-fill darkened, so they sit behind
ETCH = .62          # engraving lines: this much rim colour over the fill


# ------------------------------------------------------------------ drawing helpers
def catmull(pts, closed=True, n=8):
    """A smooth curve through `pts` (Catmull-Rom)."""
    P = list(pts)
    if closed:
        P = [P[-1]] + P + [P[0], P[1]]
    else:
        P = [P[0]] + P + [P[-1]]
    out = []
    for i in range(1, len(P) - 2):
        p0, p1, p2, p3 = P[i - 1], P[i], P[i + 1], P[i + 2]
        for k in range(n):
            t = k / n
            t2, t3 = t * t, t * t * t
            out.append(tuple(.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                   + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    if not closed:
        out.append(P[-2])
    return out


def blob(m, pts):
    """A filled smooth shape through the outline points."""
    draw(m).polygon([(round(x), round(y)) for x, y in catmull(pts)], fill=255)
    return m


def limb(m, pts, r0, r1=None, r_mid=None):
    """A tapered limb along a smooth path through `pts`: radius r0 at the root, r1 at the end,
    swelling to r_mid in the middle (a calf, a thigh)."""
    r1 = r0 if r1 is None else r1
    path = catmull(pts, closed=False) if len(pts) > 2 else list(pts)

    def radius(u):
        r = r0 + (r1 - r0) * u
        if r_mid is not None:
            r += (r_mid - (r0 + r1) / 2) * math.sin(math.pi * u)
        return r
    return tube(m, path, radius)


def spiral(cx, cy, r0, r1, turns, start=0.0, sense=1):
    n = int(40 * turns)
    return [(cx + (r0 + (r1 - r0) * i / n) * math.cos(start + sense * i / n * turns * math.tau),
             cy + (r0 + (r1 - r0) * i / n) * math.sin(start + sense * i / n * turns * math.tau)) for i in range(n + 1)]


class Fig:
    """One figure: far layer, near layers (back to front), engraving and key stars."""

    def __init__(self, size, rim, seed):
        self.S, self.rim, self.seed = size, rim, seed
        self.far = mask(size)
        self.near = [mask(size)]
        self.lines = mask(size)
        self.soft = mask(size)      # fainter engraving (fleece, fur texture)
        self.keys = []
        self.loose = []         # stray stars outside the body (a dissolving bull, a stream)

    @property
    def body(self):
        return self.near[-1]

    def layer(self):
        self.near.append(mask(self.S))
        return self.near[-1]

    def etch(self, pts, smooth=True, width=1, soft=False):
        path = catmull(pts, closed=False) if smooth and len(pts) > 2 else pts
        draw(self.soft if soft else self.lines).line([(round(x), round(y)) for x, y in path], fill=255, width=width)

    def key(self, x, y, rgb):
        self.keys.append((round(x), round(y), rgb))

    def render(self, density=1 / 30, fade_from=None):
        S, rim = self.S, self.rim
        out = Image.new('RGBA', S, (0, 0, 0, 0))
        if np.asarray(self.far).any():
            f = np.asarray(starfill(self.far, rim=rim, seed=self.seed + 7, density=density * .6)).copy()
            inner = f[..., 3] > 0
            outline = np.all(f[..., :3] == (16, 8, 30), axis=-1)
            f[inner & ~outline, :3] = (f[inner & ~outline, :3] * FAR_DIM).astype(np.uint8)
            out.alpha_composite(Image.fromarray(f, 'RGBA'))
        lines = np.asarray(self.lines) > 127
        soft = (np.asarray(self.soft) > 127) & ~lines
        for i, m in enumerate(self.near):
            last = i == len(self.near) - 1
            part = np.asarray(starfill(m, rim=rim, seed=self.seed + i, density=density,
                                       keys=self.keys if last else ())).copy()
            body = np.asarray(m) > 127
            # Engraving: only well inside this layer, so it never eats the rim or a key star.
            cut = lines & erode(body, 2)
            for x, y, _ in (self.keys if last else ()):
                cut[max(0, y - 2):y + 3, max(0, x - 2):x + 3] = False
            mix = np.array(rim) * ETCH + part[..., :3] * (1 - ETCH)
            part[cut, :3] = mix[cut].astype(np.uint8)
            faint = soft & erode(body, 2) & ~cut
            mix = np.array(rim) * .3 + part[..., :3] * .7
            part[faint, :3] = mix[faint].astype(np.uint8)
            out.alpha_composite(Image.fromarray(part, 'RGBA'))
        px = np.asarray(out).copy()
        if fade_from is not None:
            # The bull's hindquarters dissolve into the sky: an ordered dither that thins the
            # body out past `fade_from`, leaving loose stars behind.
            x0, x1 = fade_from
            bay = np.array([[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]) / 16.0
            h, w = px.shape[:2]
            gx = (np.arange(w)[None, :] - x0) / max(1, x1 - x0)
            gone = gx > bay[np.arange(h)[:, None] % 4, np.arange(w)[None, :] % 4] * .9 + .05
            px[gone] = 0
            solid = px[..., 3] > 0
            ring = dilate(solid, 1) & ~solid & ~gone
            px[ring, :3] = (16, 8, 30)
            px[ring, 3] = 255
        rng = random.Random(self.seed)
        for x, y in self.loose:
            x, y = int(x), int(y)
            if 0 <= x < S[0] and 0 <= y < S[1] and px[y, x, 3] == 0:
                c = rng.choice(((226, 232, 255), (255, 226, 150), (150, 170, 230)))
                px[y, x] = (*c, 255)
        return Image.fromarray(px, 'RGBA')


# ------------------------------------------------------------------ shared anatomy
def hoof_leg(m, top, knee, hoof, r_top, r_low, foot=2.4):
    limb(m, [top, knee, hoof], r_top, r_low, r_mid=(r_top + r_low) / 2 + .6)
    hx, hy = hoof
    draw(m).polygon([(hx - foot - 1, hy - 1), (hx + foot, hy - 1), (hx + foot, hy + 2), (hx - foot - 2, hy + 2)], fill=255)


def paw_leg(m, top, knee, paw, r_top, r_low):
    limb(m, [top, knee, paw], r_top, r_low, r_mid=r_top * .8 + r_low * .2)
    px_, py_ = paw
    blob(m, [(px_ - 5, py_ + 1), (px_ - 4, py_ - 2), (px_ + 2, py_ - 2), (px_ + 3, py_ + 2)])


def pincer(f, layer, x, y, ang, size=1.0, gap=.3):
    """An arthropod claw at (x, y) pointing along `ang`: a swollen armoured palm and two curved
    fingers (fixed and moving) opened by `gap` radians."""
    c, s = math.cos(ang), math.sin(ang)
    R = lambda u, v: (x + (u * c - v * s) * size, y + (u * s + v * c) * size)   # noqa: E731
    blob(layer, [R(-8, -5), R(-2, -7), R(5, -5), R(8, 0), R(5, 5), R(-2, 6), R(-8, 4)])
    for sign, ln in ((-1, 13), (1, 11)):
        a = sign * (gap + .05)
        pts = [R(5, sign * 3), R(5 + ln * .5 * math.cos(a), sign * 3 + ln * .5 * math.sin(a) + sign * 1.5),
               R(5 + ln * math.cos(a * .2), sign * 1 + ln * math.sin(a * .2))]
        tube(layer, catmull(pts, closed=False), lambda u: (3.0 - 2.4 * u) * size)
    f.etch([R(-5, -2), R(3, -3)], smooth=False)
    f.etch([R(-4, 3), R(2, 2)], smooth=False, soft=True)


def chela(f, layer, x, y, ang, size=1.0, gap=.3, seed=0):
    """A scorpion's claw in detail, centred on the hand at (x, y) and pointing along `ang`:
    a swollen hand with ridged keels and a fringe of bristles, a fixed finger and a moving
    finger opened by `gap`, both toothed along the inside and hooked at the tip."""
    c, s = math.cos(ang), math.sin(ang)
    R = lambda u, v: (x + (u * c - v * s) * size, y + (u * s + v * c) * size)   # noqa: E731
    # the hand (manus): long, swollen, a little flattened toward the fingers
    blob(layer, [R(-11, -4), R(-6, -7.5), R(2, -8), R(8, -5.5), R(10, 0), R(8, 5), R(1, 7.5), R(-6, 7), R(-11, 3.5)])
    rr = random.Random(seed)
    for sign, ln, bend in ((-1, 16, .32), (1, 13, .26)):    # fixed finger above, moving finger below
        a = sign * gap
        base = (9, sign * 3)
        mid = (base[0] + ln * .55 * math.cos(a), base[1] + ln * .55 * math.sin(a))
        tip = (base[0] + ln * math.cos(a - sign * bend), base[1] + ln * math.sin(a - sign * bend))
        path = catmull([R(*base), R(*mid), R(*tip)], closed=False)
        tube(layer, path, lambda u: (3.4 - 2.8 * u) * size)
        # teeth along the inner edge (facing the other finger)
        for k in range(2, len(path) - 3, 3):
            px_, py_ = path[k]
            nx, ny = -sign * -s, -sign * c   # toward the gap
            draw(layer).point((round(px_ - nx * 2.6 * size), round(py_ - ny * 2.6 * size)), fill=255)
        f.etch([path[1], path[len(path) // 2]], smooth=False, soft=True)
    # keels along the hand, and the joint where the moving finger hinges
    f.etch([R(-9, -2.5), R(-2, -4), R(7, -3)])
    f.etch([R(-9, 2), R(-1, 3.5), R(6, 2.5)], soft=True)
    f.etch([R(8, 2), R(9, 5)], smooth=False)
    # bristles: short hairs off the back of the hand
    for k in range(6):
        u = -9 + k * 3.2
        v = 7.5 if k % 2 else 7
        a = rr.uniform(-.5, .2)
        x0, y0 = R(u, v)
        x1, y1 = R(u + 2.2 * math.sin(a), v + 2.6)
        draw(layer).line([(round(x0), round(y0)), (round(x1), round(y1))], fill=255)


def arthropod_arm(f, layer, joints, r0, r1):
    """A jointed limb: tapering segments with a knob at each joint and a groove along each."""
    n = len(joints) - 1
    for i, ((x0, y0), (x1, y1)) in enumerate(zip(joints, joints[1:])):
        ra = r0 + (r1 - r0) * i / n
        rb = r0 + (r1 - r0) * (i + 1) / n
        limb(layer, [(x0, y0), ((x0 + x1) / 2, (y0 + y1) / 2), (x1, y1)], ra, rb, r_mid=max(ra, rb) + .8)
        draw(layer).ellipse((x1 - rb - .8, y1 - rb - .8, x1 + rb + .8, y1 + rb + .8), fill=255)
        f.etch([((x0 * 3 + x1) / 4, (y0 * 3 + y1) / 4), ((x0 + x1 * 3) / 4, (y0 + y1 * 3) / 4)], smooth=False, soft=True)
        f.etch([(x1 - rb, y1 - 1), (x1 + rb, y1 + 1)], smooth=False)


def human(fig, m, far, hip, pose, cap=False, hair=True):
    """A classical figure about 94 px tall on `hip` (the hip joint), facing left. `pose` holds
    joint positions relative to the hip: shoulder, head, near/far arm (elbow, hand) and near/far
    leg (knee, foot). Torso, head and near limbs go on `m`, far limbs on `far`. Anatomy is
    engraved: collarbone, chest, the line of the belly, knees."""
    hx, hy = hip
    P = lambda k: (hx + pose[k][0], hy + pose[k][1])   # noqa: E731
    sx, sy = P('shoulder')
    # far limbs first (behind the torso)
    for side, layer in (('far', far), ('near', m)):
        shoulder = (sx + (7 if side == 'far' else -7), sy + 2)
        limb(layer, [shoulder, P(f'{side}_elbow'), P(f'{side}_hand')], 3.8, 2.2, r_mid=3.6)
        hand = P(f'{side}_hand')
        draw(layer).ellipse((hand[0] - 2.6, hand[1] - 2.6, hand[0] + 2.6, hand[1] + 2.6), fill=255)
        hip_j = (hx + (4 if side == 'far' else -4), hy + 2)
        knee, foot = P(f'{side}_knee'), P(f'{side}_foot')
        limb(layer, [hip_j, knee], 6.4, 4.2, r_mid=6)
        limb(layer, [knee, ((knee[0] + foot[0]) / 2 + 1, (knee[1] + foot[1]) / 2), foot], 4.2, 2.2, r_mid=4.4)
        fx, fy = foot
        blob(layer, [(fx - 7, fy + 2), (fx - 6, fy - 1), (fx + 1, fy - 3), (fx + 3, fy + 2)])
        if side == 'near':
            fig.etch([(knee[0] - 3, knee[1]), (knee[0] + 2, knee[1] + 1)], smooth=False)
    # torso: broad shoulders, narrow waist, hips; a slight twist
    blob(m, [(sx - 11, sy + 2), (sx - 4, sy - 2), (sx + 10, sy), (sx + 9, sy + 12), (hx + 7, hy - 14),
             (hx + 9, hy + 3), (hx, hy + 7), (hx - 9, hy + 3), (hx - 7, hy - 14), (sx - 9, sy + 12)])
    hdx, hdy = P('head')
    limb(m, [(sx - 1, sy), (hdx + 1, hdy + 6)], 3.6, 3.2)                      # neck
    # head in profile: skull, straight Greek nose, jaw
    blob(m, [(hdx - 5, hdy - 1), (hdx - 4, hdy - 6), (hdx + 2, hdy - 8), (hdx + 7, hdy - 4), (hdx + 6, hdy + 3),
             (hdx + 2, hdy + 7), (hdx - 3, hdy + 7), (hdx - 5, hdy + 4)])
    draw(m).polygon([(hdx - 5, hdy - 2), (hdx - 8, hdy + 2), (hdx - 5, hdy + 3)], fill=255)
    if hair:   # curls over the crown and nape
        for k in range(6):
            a = math.pi * (1.05 + k * .19)
            cx_, cy_ = hdx + 1 + 6 * math.cos(a), hdy - 2 + 6 * math.sin(a)
            draw(m).ellipse((cx_ - 2.6, cy_ - 2.6, cx_ + 2.6, cy_ + 2.6), fill=255)
            fig.etch([(cx_ - 1, cy_ + 1), (cx_ + 1, cy_ - 1)], smooth=False)
    if cap:    # the Dioscuri's egg-shaped pilos
        blob(m, [(hdx - 5, hdy - 4), (hdx - 3, hdy - 12), (hdx + 2, hdy - 15), (hdx + 6, hdy - 11), (hdx + 7, hdy - 4)])
        fig.etch([(hdx - 5, hdy - 5), (hdx + 7, hdy - 5)], smooth=False)
    fig.etch([(sx - 8, sy + 3), (sx - 1, sy + 5), (sx + 6, sy + 3)])           # collarbone
    fig.etch([(sx - 7, sy + 11), (sx - 1, sy + 13), (sx + 5, sy + 11)])        # chest
    fig.etch([(hx - 1, sy + 14), (hx, hy - 6)], smooth=False)                  # the line of the belly
    fig.etch([(hx - 6, hy - 2), (hx, hy + 2), (hx + 6, hy - 2)])               # hip line
    return (hdx, hdy)


# ------------------------------------------------------------------ the twelve
def fleece(f, x0, x1, y0, y1, seed):
    """Fleece: scattered little curls, not a pattern."""
    rr = random.Random(seed)
    for _ in range(int((x1 - x0) * (y1 - y0) / 30)):
        x, y = rr.uniform(x0, x1), rr.uniform(y0, y1)
        a = rr.uniform(0, math.tau)
        f.etch([(x + 1.8 * math.cos(a + k * 1.1), y + 1.8 * math.sin(a + k * 1.1)) for k in range(4)], smooth=False, soft=True)


def ram_head(layer, horn_layer, f, x, y, facing):
    """A ram's head with its horn in its own layer (so its rim reads). `facing` -1 = left."""
    s = facing
    blob(layer, [(x - 8 * s, y - 6), (x + 4 * s, y - 8), (x + 14 * s, y - 2), (x + 20 * s, y + 6),
                 (x + 17 * s, y + 10), (x + 6 * s, y + 8), (x - 6 * s, y + 6)])
    horn = spiral(x - 2 * s, y - 2, 1.5, 9.5, 1.15, start=math.pi * (0.0 if s > 0 else 1.0) - .4 * s, sense=-s)
    tube(horn_layer, horn, lambda u: 1.4 + 2.8 * u)
    for k in range(4):   # horn ridges
        px_, py_ = horn[int(len(horn) * (.35 + k * .15))]
        f.etch([(px_ - 1, py_ - 1), (px_ + 1, py_ + 1)], smooth=False)
    draw(layer).polygon([(x + 2 * s, y - 6), (x + 10 * s, y - 13), (x + 8 * s, y - 4)], fill=255)   # ear
    return horn[-1]


def aries(pose):
    """Chrysomallos, the golden ram. Hold: lying, head turned back over its shoulder (the
    atlas pose). Strike: up and charging, head down, horns first."""
    rim = (255, 196, 96)
    f = Fig((112, 96), rim, 301)
    m = f.body
    if pose == 'hold':
        blob(m, [(24, 66), (30, 52), (46, 46), (70, 44), (90, 48), (100, 60), (96, 72), (72, 76), (42, 76), (24, 74)])
        limb(m, [(34, 56), (38, 42), (46, 32)], 8.5, 7)                   # neck, turned back
        limb(f.far, [(80, 70), (92, 80), (80, 84)], 4, 2.6)             # folded legs
        limb(f.far, [(42, 72), (30, 82), (20, 82)], 4, 2.6)
        limb(m, [(36, 72), (22, 80), (12, 80)], 4.2, 2.6)
        limb(m, [(88, 70), (100, 82), (90, 86)], 4.6, 2.6)
        hl = f.layer()
        ram_head(m, hl, f, 50, 28, 1)
        fleece(f, 40, 96, 52, 72, 3)
        f.etch([(48, 40), (52, 50)])
        f.key(46, 21, (255, 214, 140))                                  # Hamal, on the horn
    else:
        blob(m, [(28, 48), (36, 38), (54, 32), (80, 34), (96, 40), (100, 54), (88, 62), (54, 62), (34, 60)])
        limb(m, [(34, 46), (26, 50), (20, 56)], 8, 7)
        hoof_leg(f.far, (46, 58), (48, 72), (44, 88), 4.4, 2.2)
        hoof_leg(f.far, (82, 58), (88, 72), (96, 86), 4.6, 2.2)
        hoof_leg(m, (38, 58), (30, 72), (22, 86), 5, 2.4)
        hoof_leg(m, (90, 56), (98, 70), (108, 82), 5.4, 2.4)
        hl = f.layer()
        ram_head(m, hl, f, 22, 52, -1)
        fleece(f, 38, 94, 38, 58, 4)
        f.key(22, 41, (255, 214, 140))
    return f.render(), f.keys[0][:2]


def taurus(pose):
    """Zeus as the white bull of Europa: the forepart only, charging, its hindquarters lost in
    the stars. The Hyades make its face, Aldebaran its red eye; the Pleiades ride its shoulder."""
    rim = (255, 188, 120)
    f = Fig((116, 96), rim, 311)
    m = f.body
    low = 6 if pose == 'strike' else 0
    blob(m, [(36, 34 + low), (54, 22), (74, 20), (96, 26), (112, 34), (112, 66), (92, 70), (62, 70), (42, 64)])
    limb(m, [(40, 60 + low // 2), (34, 70), (36, 76)], 6, 3)             # dewlap
    hl = -8 if pose == 'strike' else 0
    limb(f.far, [(38, 34 + low), (36, 22 + low), (26 + hl, 12 + low)], 3, 1.2)
    head = f.layer()
    blob(head, [(8, 58 + low), (8, 48 + low), (16, 38 + low), (32, 32 + low), (44, 40 + low), (42, 56 + low), (28, 64 + low), (14, 66 + low)])
    blob(head, [(5, 54 + low), (8, 50 + low), (14, 56 + low), (10, 64 + low)])   # broad muzzle
    draw(head).polygon([(36, 36 + low), (46, 30 + low), (42, 42 + low)], fill=255)   # ear
    f.etch([(8, 58 + low), (12, 60 + low)], smooth=False)                 # nostril
    f.etch([(26, 52 + low), (34, 58 + low), (38, 50 + low)], soft=True)    # cheek
    horn = f.layer()
    limb(horn, [(30, 36 + low), (22, 26 + low), (8 + hl, 20 + low + hl // 2)], 3.6, 1.4)   # near horn, forward
    if pose == 'hold':
        hoof_leg(m, (52, 64), (40, 74), (34, 90), 6, 2.6)               # foreleg tucked, charging
        hoof_leg(f.far, (66, 66), (70, 78), (62, 90), 5.4, 2.4)
    else:
        hoof_leg(m, (52, 64), (32, 70), (18, 82), 6, 2.6)               # foreleg reaching
        hoof_leg(f.far, (66, 66), (74, 80), (80, 92), 5.4, 2.4)
    f.etch([(46, 40), (54, 52), (52, 64)])                               # shoulder muscle
    f.etch([(60, 28), (70, 36), (82, 40)])
    f.etch([(16, 44 + low), (24, 42 + low)])                             # brow
    for x, y in ((70, 28), (74, 26), (72, 31), (77, 30), (75, 33), (79, 27)):
        f.key(x, y, (200, 220, 255)) if False else f.loose.append((x, y))
    for i in range(40):
        rr = random.Random(i)
        f.loose.append((96 + rr.random() * 20, 22 + rr.random() * 52))
    f.key(20, 47 + low, (255, 110, 80))                                   # Aldebaran
    img = f.render(fade_from=(86, 114))
    # Pleiades: a tight cluster of bright points on the shoulder.
    px = np.asarray(img).copy()
    for x, y in ((70, 28), (73, 26), (72, 30), (76, 29), (75, 32), (78, 27)):
        px[y, x, :3] = (235, 240, 255)
    return Image.fromarray(px, 'RGBA'), f.keys[0][:2]


def gemini(pose):
    """Castor and Pollux, the Dioscuri: two youths in egg-shaped caps, an arm about each other,
    a star over each head. Castor (behind) holds a lyre, Pollux (in front) a club over his
    shoulder. Strike: they step apart and Pollux swings the club up."""
    rim = (140, 220, 255)
    f = Fig((112, 136), rim, 321)
    back = f.body
    up = pose == 'strike'
    apart = 10 if up else 0
    castor = {'shoulder': (1, -34), 'head': (-1, -48), 'far_elbow': (12, -20), 'far_hand': (10, -6),
              'near_elbow': (-12, -26), 'near_hand': (-16, -38), 'far_knee': (8, 22), 'far_foot': (12, 46),
              'near_knee': (-4, 24), 'near_foot': (-4, 46)}
    hip_c = (70 + apart, 82)
    human(f, back, f.far, hip_c, castor, cap=True)
    # Castor's lyre: tortoise-shell sound box and two curved arms with a yoke
    lx, ly = hip_c[0] - 22, hip_c[1] - 44
    blob(back, [(lx - 6, ly + 6), (lx, ly + 2), (lx + 6, ly + 6), (lx + 4, ly + 12), (lx - 4, ly + 12)])
    limb(back, [(lx - 5, ly + 5), (lx - 9, ly - 4), (lx - 5, ly - 12)], 1.5)
    limb(back, [(lx + 5, ly + 5), (lx + 8, ly - 4), (lx + 5, ly - 12)], 1.5)
    limb(back, [(lx - 6, ly - 11), (lx + 6, ly - 11)], 1.4)
    for k in (-2, 0, 2):
        draw(f.lines).line([(lx + k, ly - 10), (lx + k, ly + 4)], fill=255)
    front = f.layer()
    pollux = {'shoulder': (0, -34), 'head': (-2, -48), 'far_elbow': (12, -26), 'far_hand': (22, -36),
              'near_elbow': (-12, -42) if up else (-10, -26), 'near_hand': (-8, -60) if up else (-6, -40),
              'far_knee': (6, 24), 'far_foot': (6, 46), 'near_knee': (-8, 22), 'near_foot': (-14, 46)}
    hip_p = (40 - apart, 84)
    human(f, front, f.far, hip_p, pollux, cap=True)
    hx, hy = hip_p[0] + pollux['near_hand'][0], hip_p[1] + pollux['near_hand'][1]
    if up:
        limb(front, [(hx, hy + 6), (hx - 6, hy - 6), (hx - 16, hy - 14)], 1.8, 4)   # club swung up
    else:
        limb(front, [(hx, hy + 2), (hx + 6, hy - 10), (hx + 14, hy - 20)], 1.8, 4)  # club on the shoulder
    # chlamys: a short cloak pinned at Pollux's shoulder, falling behind
    blob(front, [(hip_p[0] + 2, hip_p[1] - 36), (hip_p[0] + 12, hip_p[1] - 34), (hip_p[0] + 14, hip_p[1] - 14),
                 (hip_p[0] + 8, hip_p[1] - 4), (hip_p[0] + 4, hip_p[1] - 18)])
    for k in range(3):
        f.etch([(hip_p[0] + 5 + k * 3, hip_p[1] - 32), (hip_p[0] + 6 + k * 3, hip_p[1] - 10)])
    # the twin stars over their heads (Castor's dimmer; Pollux's is the key)
    hc = (hip_c[0] - 1, hip_c[1] - 66)
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        draw(back).point((hc[0] + dx, hc[1] + dy), fill=255)
    f.key(hip_p[0] - 2, hip_p[1] - 68, (255, 226, 150))                      # Pollux
    img = f.render()
    px = np.asarray(img).copy()
    px[hc[1], hc[0], :3] = (220, 235, 255)
    return Image.fromarray(px, 'RGBA'), f.keys[0][:2]


def cancer(pose):
    """Karkinos, the crab Hera sent against Heracles at the Hydra: broad armoured shell, great
    raised claws, as the Renaissance atlases draw it. Praesepe glitters on its shell."""
    rim = (180, 232, 210)
    f = Fig((120, 120), rim, 331)
    m = f.body
    D = 27   # everything sits 27 px lower so the raised claws fit
    blob(m, [(28, 52 + D), (34, 38 + D), (52, 30 + D), (76, 30 + D), (94, 38 + D), (100, 52 + D), (92, 64 + D), (66, 70 + D), (42, 68 + D)])
    open_ = pose == 'strike'
    for side, (sx, sy) in ((-1, (34, 44 + D)), (1, (88, 40 + D))):
        layer = m if side < 0 else f.far
        elbow = (sx - 14 * (1 if side < 0 else -.2), sy - 16)
        claw = (sx - 22 if side < 0 else sx + 4, sy - 34)
        limb(layer, [(sx, sy), elbow, claw], 4.6, 6)
        cx, cy = claw
        pincer(f, layer, cx, cy, -math.pi / 2 - (.35 if side < 0 else -.1), size=1.55, gap=.5 if open_ else .22)
    for k in range(4):   # walking legs, jointed
        for side in (-1, 1):
            x0 = 64 + side * (16 + k * 6)
            layer = m if k % 2 == 0 else f.far
            knee = (x0 + side * 10, 66 + k * 2 + D)
            foot = (x0 + side * 14, 84 + D)
            limb(layer, [(x0, 60 + D), knee, foot], 2.6, 1.2)
    for dx in (-8, 0):   # eye stalks
        limb(m, [(54 + dx, 34 + D), (52 + dx, 24 + D)], 1.6)
        blob(m, [(50 + dx, 24 + D), (52 + dx, 21 + D), (55 + dx, 23 + D), (53 + dx, 26 + D)])
    for k in range(3):   # shell plates: a scalloped front edge and the carapace grooves
        f.etch([(40 + k * 6, 44 + D + k * 3), (64, 40 + D + k * 7), (88 - k * 6, 44 + D + k * 3)])
    for x in range(36, 96, 8):
        f.etch([(x, 34 + D + abs(x - 64) // 5), (x + 4, 31 + D + abs(x - 64) // 5), (x + 8, 34 + D + abs(x - 64) // 5)], smooth=False)
    f.key(64, 50 + D, (220, 255, 240))                                  # Praesepe
    img = f.render()
    px = np.asarray(img).copy()
    for x, y in ((60, 47 + D), (68, 47 + D), (62, 54 + D), (67, 53 + D), (58, 51 + D), (70, 51 + D)):
        px[y, x, :3] = (230, 255, 245)
    return Image.fromarray(px, 'RGBA'), f.keys[0][:2]


def mane_pts(cx, cy, k):
    """A lion's mane: a shaggy mass round the head, sweeping back over the shoulders in locks."""
    pts = []
    rr = random.Random(5)
    for i in range(26):
        a = math.pi * .55 + i / 26 * math.pi * 1.9
        r = (19 + (2.5 if i % 2 else 0) + rr.uniform(-1, 1)) * k
        stretch = 1.3 if math.cos(a) > 0 else 1.0      # longer behind, over the shoulders
        pts.append((cx + r * math.cos(a) * stretch, cy + r * math.sin(a) * 1.05))
    return pts


def leo(pose):
    """The Nemean lion, whose hide no weapon could pierce: striding, full mane, tufted tail.
    Regulus is its heart. Strike: it rears to pounce, jaws open."""
    rim = (255, 210, 90)
    f = Fig((120, 96), rim, 341)
    m = f.body
    if pose == 'hold':
        blob(m, [(30, 46), (40, 32), (64, 34), (92, 34), (106, 42), (104, 58), (90, 62), (60, 62), (40, 62)])
        mane_l = f.layer()
        blob(mane_l, mane_pts(32, 38, 1.0))
        face = f.layer()
        blob(face, [(8, 44), (10, 34), (22, 30), (28, 38), (26, 48), (14, 52)])   # face
        blob(face, [(2, 44), (8, 40), (12, 46), (6, 50)])                         # muzzle
        draw(face).polygon([(20, 32), (24, 26), (27, 34)], fill=255)              # ear
        f.etch([(10, 40), (14, 38)], smooth=False)                                 # brow over the eye
        paw_leg(m, (40, 56), (36, 70), (28, 86), 6.4, 3)
        paw_leg(f.far, (52, 58), (56, 72), (52, 86), 5.6, 2.6)
        paw_leg(m, (96, 52), (100, 70), (94, 86), 7, 3)
        paw_leg(f.far, (84, 56), (78, 72), (72, 86), 6, 2.6)
        limb(m, [(104, 42), (114, 32), (112, 18)], 2.2, 1.6)
        blob(m, [(108, 18), (110, 12), (116, 12), (116, 20)])
        f.etch([(46, 44), (52, 54), (48, 62)])
        f.etch([(84, 40), (94, 46), (96, 58)])
        for a in range(100, 460, 30):   # mane locks
            r = math.radians(a)
            f.etch([(32 + 10 * math.cos(r), 38 + 10 * math.sin(r)), (32 + 13 * math.cos(r + .2) * 1.2, 38 + 14 * math.sin(r + .2)), (32 + 17 * math.cos(r + .45) * 1.25, 38 + 17 * math.sin(r + .45))], soft=True)
        f.key(42, 54, (255, 230, 150))                                          # Regulus
    else:
        blob(m, [(26, 38), (40, 22), (64, 26), (90, 40), (104, 52), (98, 64), (80, 62), (54, 54), (34, 54)])
        mane_l = f.layer()
        blob(mane_l, mane_pts(28, 28, 1.0))
        face = f.layer()
        blob(face, [(6, 32), (8, 22), (20, 18), (26, 26), (24, 36), (12, 38)])
        blob(face, [(0, 26), (6, 22), (10, 28), (4, 30)])                      # upper jaw
        blob(face, [(2, 38), (8, 34), (13, 40), (6, 43)])                      # lower jaw, open
        draw(face).polygon([(18, 20), (22, 13), (25, 22)], fill=255)
        paw_leg(m, (36, 48), (22, 40), (8, 50), 6.4, 3.2)                     # forepaws out
        paw_leg(f.far, (46, 50), (36, 56), (20, 62), 5.6, 2.8)
        paw_leg(m, (94, 58), (104, 74), (112, 86), 7, 3)
        paw_leg(f.far, (84, 58), (88, 74), (98, 88), 6, 2.6)
        limb(m, [(102, 50), (112, 40), (116, 26)], 2.2, 1.6)
        blob(m, [(112, 26), (114, 20), (119, 21), (118, 28)])
        f.etch([(46, 34), (54, 46)])
        f.etch([(80, 44), (92, 54)])
        for a in range(100, 460, 30):
            r = math.radians(a)
            f.etch([(28 + 10 * math.cos(r), 28 + 10 * math.sin(r)), (28 + 13 * math.cos(r + .2) * 1.2, 28 + 14 * math.sin(r + .2)), (28 + 17 * math.cos(r + .45) * 1.25, 28 + 17 * math.sin(r + .45))], soft=True)
        f.key(40, 42, (255, 230, 150))
    return f.render(), f.keys[0][:2]


def virgo(pose):
    """Astraea, the maiden of justice who left the earth last: winged, in long robes, an ear of
    wheat (Spica) in her hand. Strike: the wings open and the wheat is held out."""
    rim = (200, 240, 140)
    f = Fig((108, 116), rim, 351)
    m = f.body
    spread = pose == 'strike'
    # wings behind: long feathered blades rising from the shoulders
    tips = [(96, 4), (104, 22), (100, 40)] if spread else [(76, 2), (84, 14), (82, 30)]
    blob(f.far, [(56, 36), tips[0], tips[1], tips[2], (64, 52)])
    near_wing = [(96, 10), (106, 30), (94, 50)] if spread else [(70, 8), (80, 24), (74, 42)]
    blob(m, [(54, 34), near_wing[0], near_wing[1], near_wing[2], (58, 56)])
    # feathers: primaries along the trailing edge, coverts as short strokes
    for k in range(5):
        u = k / 4
        ex = near_wing[1][0] + (near_wing[2][0] - near_wing[1][0]) * u
        ey = near_wing[1][1] + (near_wing[2][1] - near_wing[1][1]) * u
        f.etch([(58 + k, 40 + k * 3), (ex - 3, ey - 2)])
    m = f.layer()
    # robe: a long flowing gown, hem swept back by her stride
    blob(m, [(38, 34), (52, 32), (60, 54), (70, 82), (84, 108), (58, 112), (30, 110), (22, 100), (32, 70)])
    for k in range(5):   # folds
        f.etch([(40 + k * 5, 52), (38 + k * 7, 80), (34 + k * 10, 108)])
    blob(m, [(37, 17), (39, 11), (45, 9), (51, 13), (51, 20), (47, 25), (41, 25), (38, 22)])   # head
    draw(m).polygon([(38, 15), (34, 20), (38, 21)], fill=255)                # profile, facing left
    blob(m, [(48, 8), (54, 6), (57, 11), (53, 15)])                         # hair bound up behind
    limb(m, [(50, 20), (56, 30), (58, 42)], 2.4, 1.4)                       # a lock down the back
    f.etch([(40, 11), (46, 10), (52, 13)])                                  # fillet
    limb(m, [(44, 26), (44, 34)], 3)                                        # neck
    hand = (12, 30) if spread else (24, 46)
    limb(m, [(42, 36), (32, 40) if spread else (34, 46), hand], 3, 2.2, r_mid=2.8)   # arm out with the wheat
    wx, wy = hand
    limb(m, [(wx, wy), (wx - 6, wy - 14)], 1)                               # the stalk
    for k in range(4):
        blob(m, [(wx - 3 - k * 1.5, wy - 6 - k * 3), (wx - 1 - k * 1.5, wy - 8 - k * 3), (wx - 3 - k * 1.5, wy - 10 - k * 3), (wx - 5 - k * 1.5, wy - 8 - k * 3)])
    limb(f.far, [(52, 38), (60, 52), (56, 64)], 2.8, 2)                    # far arm with a palm frond
    limb(f.far, [(56, 64), (50, 82)], 1)
    f.key(wx - 6, wy - 14, (220, 240, 255))                                 # Spica
    return f.render(), f.keys[0][:2]


def libra(pose):
    """The scales of Astraea, which the Greeks knew as the Scorpion's claws (Chelae): a balance
    gripped in two great segmented claws reaching up from below. Strike: the beam tips toward
    the pilot."""
    rim = (230, 230, 255)
    f = Fig((116, 100), rim, 361)
    m = f.body
    tip = .24 if pose == 'strike' else .08
    cx, cy = 58, 26
    L = 46
    ax, ay = cx - L * math.cos(tip), cy + L * math.sin(tip)
    bx, by = cx + L * math.cos(tip), cy - L * math.sin(tip)
    for (px_, py_) in ((ax, ay), (bx, by)):   # pans on three cords
        drop = 26
        for dx in (-10, 0, 10):
            limb(m, [(px_, py_), (px_ + dx, py_ + drop)], .55)
        draw(m).chord((round(px_ - 13), round(py_ + drop - 6), round(px_ + 13), round(py_ + drop + 8)), 0, 180, fill=255)
        f.etch([(px_ - 9, py_ + drop + 3), (px_ + 9, py_ + drop + 3)], smooth=False)
    limb(m, [(ax, ay), (cx, cy), (bx, by)], 2.2)                           # the beam
    blob(m, [(cx - 4, cy - 2), (cx, cy - 9), (cx + 4, cy - 2), (cx, cy + 3)])   # the pivot
    # the claws: segmented arms rising from below, each closing on the beam near the pivot
    for side in (-1, 1):
        layer = f.layer() if side < 0 else f.far
        joints = [(cx + side * 50, 100), (cx + side * 46, 78), (cx + side * 32, 60), (cx + side * 16, 48)]
        arthropod_arm(f, layer, joints, 5, 3.6)
        gx, gy = joints[-1]
        chela(f, layer, gx - side * 2, gy - 9, -math.pi / 2 - side * .5, size=.8, gap=.45, seed=5 + side)
    f.key(ax, ay + 30, (240, 240, 255))                                    # Zubenelgenubi, on the near pan
    return f.render(), f.keys[0][:2]

def scorpius(pose):
    """The scorpion Gaia sent against Orion: long segmented body, the great claws held forward
    and wide (jointed arms, swollen toothed chelae), the tail arched high over its back.
    Antares glows red at its heart. Strike: the claws gape and the tail lashes forward."""
    rim = (255, 96, 90)
    f = Fig((168, 100), rim, 371)
    m = f.body
    X = 46   # the body sits right so the claws reach forward in frame
    strike = pose == 'strike'
    # legs first, splayed and jointed: four a side
    for k in range(4):
        for side, layer in ((1, m), (-1, f.far)):
            x0 = 44 + X - 10 + k * 9
            spread = (k - 1.5) * 9          # front legs reach forward, back legs back
            knee = (x0 + spread * .5, 60 + (0 if side > 0 else 3))
            foot = (x0 + spread * 1.3 + 2, 94 + (0 if side > 0 else -5))
            limb(layer, [(x0, 68), knee, foot], 2.2, 1.1)
            f.etch([(knee[0] - 1, knee[1] - 1), (knee[0] + 1, knee[1] + 1)], smooth=False)
    # the claws: the far one below and behind, the near one above, held forward and wide
    reach = 6 if strike else 0
    gap = .5 if strike else .2
    far_arm = [(X + 30, 70), (X + 18, 80), (X + 4, 82), (X - 6 - reach, 78)]
    near_arm = [(X + 30, 60), (X + 18, 48), (X + 4, 42), (X - 6 - reach, 40)]
    arthropod_arm(f, f.far, far_arm, 4.2, 3.2)
    chela(f, f.far, far_arm[-1][0] - 8, far_arm[-1][1] + 2, math.pi - .25, size=.95, gap=gap, seed=2)
    arthropod_arm(f, m, near_arm, 4.4, 3.4)
    blob(m, [(X + 26, 66), (X + 32, 58), (X + 48, 56), (X + 56, 62), (X + 50, 74), (X + 32, 74)])   # head and thorax
    f.etch([(X + 30, 62), (X + 36, 60)], smooth=False)                                        # eyes on the carapace
    segs = [(X + 58, 66, 9), (X + 68, 67, 9), (X + 78, 67, 8.5), (X + 88, 66, 8), (X + 97, 64, 7)]
    for x, y, r in segs:
        blob(m, [(x - r, y), (x - r + 2, y - r + 2), (x + r - 2, y - r + 2), (x + r, y), (x + r - 2, y + r - 3), (x - r + 2, y + r - 3)])
    if not strike:
        tail = [(X + 102, 62), (X + 112, 48), (X + 114, 32), (X + 104, 18), (X + 90, 16), (X + 82, 24)]
        sting = (X + 78, 30)
    else:
        tail = [(X + 102, 62), (X + 112, 46), (X + 108, 26), (X + 90, 14), (X + 72, 14), (X + 60, 20)]
        sting = (X + 54, 26)
    tube(m, catmull(tail, closed=False), lambda u: 5.4 - 2.6 * u)
    sx, sy = sting
    tx, ty = tail[-1]
    blob(m, [(tx + 3, ty - 3), (tx - 2, ty + 3), (sx, sy), (tx + 5, ty + 3)])   # the venom bulb and sting
    hand = f.layer()   # the near hand over everything, so its detail reads
    chela(f, hand, near_arm[-1][0] - 8, near_arm[-1][1] - 2, math.pi + .25, size=1.05, gap=gap, seed=1)
    for x, y, r in segs:
        f.etch([(x - r + 3, y - 3), (x + r - 3, y - 3)], smooth=False)
    for x, y in tail[1:-1]:
        f.etch([(x - 4, y + 2), (x + 3, y - 3)], smooth=False)
    f.key(X + 36, 64, (255, 90, 70))                                        # Antares
    return f.render(), f.keys[0][:2]


def sagittarius(pose):
    """The centaur archer: a horse's body, a man's torso drawing a great bow, a cloak flying.
    After the P1 sketch the user approved (rearing, overhead draw), in the engraved style."""
    rim = (255, 170, 210)
    f = Fig((116, 104), rim, 381)
    m = f.body
    rear = pose == 'strike'
    # horse body, rearing a little at the front
    blob(m, [(40, 58), (52, 48), (80, 50), (98, 54), (104, 66), (96, 76), (70, 76), (48, 74)])
    hoof_leg(m, (96, 72), (104, 86), (100, 100), 5.4, 2.4)
    hoof_leg(f.far, (86, 74), (82, 88), (88, 100), 4.8, 2.2)
    if rear:
        hoof_leg(m, (50, 68), (36, 70), (30, 60), 5, 2.4)
        hoof_leg(f.far, (58, 70), (46, 78), (40, 72), 4.6, 2.2)
    else:
        hoof_leg(m, (50, 70), (44, 84), (42, 100), 5, 2.4)
        hoof_leg(f.far, (60, 72), (64, 86), (58, 100), 4.6, 2.2)
    limb(m, [(102, 58), (112, 60), (114, 74), (110, 84)], 3, 1.6)            # tail, S-curved
    # the man rises from the withers
    blob(m, [(40, 60), (36, 44), (40, 30), (52, 28), (56, 40), (54, 56)])
    blob(m, [(38, 24), (40, 16), (48, 14), (52, 22), (48, 30), (40, 30)])   # head
    blob(m, [(38, 20), (34, 24), (39, 25)])
    # cloak streaming back
    blob(f.far, [(50, 30), (66, 26), (84, 34), (92, 46), (72, 42), (56, 44)])
    for k in range(3):
        f.etch([(54, 34 + k * 3), (70 + k * 6, 32 + k * 5)])
    # the bow: drawn overhead, arrow pointing at the pilot
    bx, by = (20, 26) if rear else (22, 30)
    limb(m, [(42, 34), (32, 30), (bx + 4, by)], 2.6, 2)                      # bow arm
    bow = [(bx, by - 26), (bx - 8, by - 10), (bx - 8, by + 10), (bx, by + 26)]
    tube(m, catmull(bow, closed=False), lambda u: 1.6)
    draw(f.lines).line([(bx, by - 26), (bx + 22, by), (bx, by + 26)], fill=255)
    limb(m, [(46, 32), (52, 24), (bx + 22, by)], 2.4, 2)                      # drawing arm
    limb(m, [(bx + 22, by), (bx - 12, by)], .8)                              # arrow
    draw(m).polygon([(bx - 12, by - 3), (bx - 19, by), (bx - 12, by + 3)], fill=255)
    f.etch([(44, 36), (48, 46)])
    f.etch([(70, 56), (84, 60), (94, 66)])
    f.key(bx - 16, by, (255, 200, 230))                                      # Alnasl, the arrowhead
    return f.render(), f.keys[0][:2]


def capricornus(pose):
    """The sea-goat: Pan, who took a fish's tail fleeing Typhon. Goat foreparts with swept-back
    horns and a beard, a long curling fish tail. Strike: the tail lashes out straight."""
    rim = (160, 200, 255)
    f = Fig((116, 96), rim, 391)
    m = f.body
    blob(m, [(20, 46), (28, 36), (44, 34), (58, 42), (60, 58), (46, 66), (30, 62)])   # chest and shoulders
    limb(f.far, [(26, 30), (38, 18), (54, 14)], 2.2, 1)
    head = f.layer()
    # a long goat's face: forehead, narrow muzzle pointing down and forward, beard
    blob(head, [(20, 26), (28, 30), (30, 38), (22, 44), (12, 52), (6, 52), (5, 47), (12, 36)])
    limb(head, [(10, 50), (9, 58), (12, 64)], 2.4, .8)                                # beard
    draw(head).polygon([(24, 34), (34, 36), (28, 40)], fill=255)                      # ear, out sideways
    f.etch([(14, 38), (18, 36)], smooth=False)                                         # eye
    horn = f.layer()
    limb(horn, [(22, 28), (30, 16), (46, 8), (58, 12)], 3, 1)                          # horn swept back
    for k in range(4):
        x, y = (26 + k * 8, 20 - k * 3)
        f.etch([(x - 1, y - 2), (x + 1, y + 2)], smooth=False)
    hoof_leg(m, (30, 58), (18, 68), (8, 64), 4.6, 2.2)                               # forelegs folded
    hoof_leg(f.far, (40, 60), (34, 74), (24, 76), 4.2, 2)
    if pose == 'hold':
        tail = [(54, 52), (72, 64), (94, 62), (104, 44), (96, 28), (82, 26)]
        fin_at, fin_dir = (80, 26), math.pi * .95
    else:
        tail = [(54, 52), (74, 60), (94, 58), (110, 52)]
        fin_at, fin_dir = (110, 52), 0.0
    tube(m, catmull(tail, closed=False), lambda u: 10 - 7.5 * u)
    fx, fy = fin_at
    fin = [(fx, fy)]
    for k in (-1, 0, 1):
        a = fin_dir + k * .6
        fin.append((fx + math.cos(a) * 14, fy + math.sin(a) * 14))
    blob(m, [fin[0], fin[1], (fx + math.cos(fin_dir) * 8, fy + math.sin(fin_dir) * 8), fin[3]])
    for i in range(1, len(tail) - 1):   # scales along the tail
        x, y = tail[i]
        f.etch([(x - 3, y - 3), (x, y + 1), (x + 3, y - 3)], smooth=False)
    f.etch([(32, 40), (40, 50), (44, 60)])
    f.key(fx + math.cos(fin_dir) * 3, fy + math.sin(fin_dir) * 3, (200, 225, 255))    # Deneb Algedi
    return f.render(), f.keys[0][:2]


def aquarius(pose):
    """Ganymede, cupbearer of the gods: a youth with an urn held out in both hands, pouring a
    stream that runs away toward the pilot. Strike: he tips the urn right over and it gushes."""
    rim = (110, 200, 255)
    f = Fig((124, 120), rim, 401)
    m = f.body
    pose_ = {'shoulder': (0, -34), 'head': (-2, -48), 'far_elbow': (-6, -24), 'far_hand': (-18, -28),
             'near_elbow': (-12, -20), 'near_hand': (-20, -24), 'far_knee': (8, 22), 'far_foot': (16, 46),
             'near_knee': (-10, 20), 'near_foot': (-14, 46)}
    hip = (84, 72)
    human(f, m, f.far, hip, pose_)
    # Phrygian cap and a short chiton
    hx, hy = hip[0] - 2, hip[1] - 48
    blob(m, [(hx - 6, hy - 3), (hx - 2, hy - 11), (hx + 5, hy - 12), (hx + 3, hy - 7), (hx + 7, hy - 3)])
    blob(m, [(hip[0] - 10, hip[1] - 28), (hip[0] + 10, hip[1] - 30), (hip[0] + 13, hip[1] + 10), (hip[0] - 12, hip[1] + 10)])
    for k in range(4):
        f.etch([(hip[0] - 8 + k * 5, hip[1] - 20), (hip[0] - 9 + k * 6, hip[1] + 8)])
    # the urn, held out and tipped forward
    tilt = 1.25 if pose == 'strike' else .7
    ux, uy = hip[0] - 32, hip[1] - 28
    c, s = math.cos(tilt), math.sin(tilt)
    R = lambda x, y: (ux + (x * c - y * s) * 1.45, uy + (x * s + y * c) * 1.45)   # noqa: E731
    urn = f.layer()
    # an amphora on its side: round belly, narrow neck toward the mouth, two handles
    blob(urn, [R(-2, -8), R(5, -9), R(11, -4), R(12, 3), R(7, 9), R(-1, 9), R(-5, 4), R(-6, -3)])
    limb(urn, [R(-5, 0), R(-13, -6)], 3.2, 2.4)                              # the neck
    limb(urn, [R(-15, -7), R(-12, -10)], 2)                                  # the lip
    for sgn in (-1, 1):
        limb(urn, [R(-3, sgn * 6), R(-1, sgn * 12), R(4, sgn * 9)], 1)       # handles
    f.etch([R(-8, -2), R(8, -2)], smooth=False)
    f.etch([R(-6, 4), R(6, 4)], smooth=False, soft=True)
    mx, my = R(-16, -9)
    # the stream: a broad wavering ribbon falling and running off toward the pilot
    if pose == 'hold':
        stream = [(mx, my), (mx - 8, my + 10), (mx - 12, my + 28), (mx - 20, my + 46), (mx - 34, my + 62), (mx - 52, my + 68)]
    else:
        stream = [(mx, my), (mx - 14, my + 4), (mx - 30, my + 14), (mx - 44, my + 30), (mx - 54, my + 52)]
    water = f.layer()
    tube(water, catmull(stream, closed=False), lambda u: 4.4 - 1.6 * u + .9 * math.sin(u * 18))
    for i in range(1, len(stream) - 1):
        x, y = stream[i]
        f.etch([(x - 3, y - 1), (x, y + 2), (x + 3, y - 1)], smooth=False)
    rr = random.Random(9)
    for x, y in catmull(stream, closed=False)[::4]:
        f.loose.append((x + rr.uniform(-8, 8), y + rr.uniform(-4, 8)))
    f.key(hip[0] - 5, hip[1] - 33, (190, 230, 255))                         # Sadalmelik, the shoulder
    return f.render(), f.keys[0][:2]

def pisces(pose):
    """Aphrodite and Eros, turned into fish to flee Typhon: two fish, one swimming up and one
    along, tied by a long cord knotted at Alrescha. Strike: the cord snaps taut."""
    rim = (170, 160, 255)
    f = Fig((116, 100), rim, 411)
    m = f.body

    def fish(cx, cy, ang, L=46, H=9):
        c, s = math.cos(ang), math.sin(ang)
        R = lambda x, y: (cx + x * c - y * s, cy + x * s + y * c)   # noqa: E731
        # a long body: pointed snout, deepest a third back, a slim tail stock
        blob(m, [R(-L / 2, 1), R(-L / 2 + 5, -H * .7), R(-L / 6, -H), R(L / 5, -H * .7), R(L / 2 - 8, -2.4),
                 R(L / 2 - 8, 2.4), R(L / 5, H * .6), R(-L / 6, H * .9), R(-L / 2 + 5, H * .6)])
        # forked tail fin
        draw(m).polygon([R(L / 2 - 10, 0), R(L / 2 + 6, -11), R(L / 2 + 1, -1), R(L / 2 + 1, 1), R(L / 2 + 6, 11)], fill=255)
        draw(m).polygon([R(-6, -H + 1), R(2, -H - 7), R(10, -H * .8)], fill=255)          # dorsal fin
        draw(m).polygon([R(-2, H - 1), R(4, H + 5), R(9, H * .6)], fill=255)               # ventral fin
        for k in range(4):   # scale rows
            f.etch([R(-8 + k * 7, -5), R(-5 + k * 7, 0), R(-8 + k * 7, 5)], smooth=False, soft=True)
        f.etch([R(-L / 2 + 10, -5), R(-L / 2 + 8, 0), R(-L / 2 + 10, 5)])                 # gill
        f.etch([R(-L / 2 + 5, -2), R(-L / 2 + 6, -2)], smooth=False)                        # eye
        return R(L / 2 + 2, 0)

    tail_a = fish(34, 22, 0.0)                         # swimming along, toward the pilot
    tail_b = fish(96, 40, -math.pi / 2 + .3)           # swimming up
    knot = (60, 90) if pose == 'hold' else (58, 80)
    sag = 0 if pose == 'strike' else 10
    for tail in (tail_a, tail_b):
        tx, ty = tail
        mid = ((tx + knot[0]) / 2 + 4, (ty + knot[1]) / 2 + sag)
        tube(m, catmull([tail, mid, knot], closed=False), lambda u: 1.3)
    kx, ky = knot
    blob(m, [(kx - 4, ky), (kx, ky - 4), (kx + 4, ky), (kx, ky + 4)])
    f.key(kx, ky, (210, 200, 255))                                           # Alrescha, the knot
    return f.render(), f.keys[0][:2]


FIGURES = {
    'aries': aries, 'taurus': taurus, 'gemini': gemini, 'cancer': cancer, 'leo': leo, 'virgo': virgo,
    'libra': libra, 'scorpius': scorpius, 'sagittarius': sagittarius, 'capricornus': capricornus,
    'aquarius': aquarius, 'pisces': pisces,
}


# ------------------------------------------------------------------ in-game cells
def twin(which, pose):
    """One of the Dioscuri alone, for the game, where the pair splits into two creatures:
    'pollux' with his club, 'castor' with his lyre; each wears the egg-shaped cap with a star
    over it at the same place, so the key star sits at one offset for both."""
    rim = (140, 220, 255)
    f = Fig((72, 136), rim, 321 if which == 'pollux' else 327)
    m = f.body
    up = pose == 'strike'
    hip = (38, 84)
    if which == 'pollux':
        p = {'shoulder': (0, -34), 'head': (-2, -48), 'far_elbow': (12, -26), 'far_hand': (16, -14),
             'near_elbow': (-12, -42) if up else (-10, -26), 'near_hand': (-8, -60) if up else (-6, -40),
             'far_knee': (6, 24), 'far_foot': (6, 46), 'near_knee': (-8, 22), 'near_foot': (-14, 46)}
    else:
        p = {'shoulder': (0, -34), 'head': (-2, -48), 'far_elbow': (12, -20), 'far_hand': (10, -6),
             'near_elbow': (-12, -26), 'near_hand': (-16, -38) if not up else (-20, -30),
             'far_knee': (8, 22), 'far_foot': (12, 46), 'near_knee': (-4, 24) if not up else (-10, 22),
             'near_foot': (-4, 46) if not up else (-16, 46)}
    human(f, m, f.far, hip, p, cap=True)
    hx, hy = hip[0] + p['near_hand'][0], hip[1] + p['near_hand'][1]
    if which == 'pollux':
        if up:
            limb(m, [(hx, hy + 6), (hx - 4, hy - 6), (hx - 10, hy - 16)], 1.8, 4)
        else:
            limb(m, [(hx, hy + 2), (hx + 6, hy - 10), (hx + 12, hy - 20)], 1.8, 4)
        blob(m, [(hip[0] + 2, hip[1] - 36), (hip[0] + 12, hip[1] - 34), (hip[0] + 14, hip[1] - 14),
                 (hip[0] + 8, hip[1] - 4), (hip[0] + 4, hip[1] - 18)])
        for k in range(3):
            f.etch([(hip[0] + 5 + k * 3, hip[1] - 32), (hip[0] + 6 + k * 3, hip[1] - 10)])
    else:
        lx, ly = hx - 6, hy - 6
        blob(m, [(lx - 6, ly + 6), (lx, ly + 2), (lx + 6, ly + 6), (lx + 4, ly + 12), (lx - 4, ly + 12)])
        limb(m, [(lx - 5, ly + 5), (lx - 9, ly - 4), (lx - 5, ly - 12)], 1.5)
        limb(m, [(lx + 5, ly + 5), (lx + 8, ly - 4), (lx + 5, ly - 12)], 1.5)
        limb(m, [(lx - 6, ly - 11), (lx + 6, ly - 11)], 1.4)
        for k in (-2, 0, 2):
            draw(f.lines).line([(lx + k, ly - 10), (lx + k, ly + 4)], fill=255)
    # The key star is on his head, where the atlases put the stars Castor and Pollux; a small
    # star also rides over the cap, as on the Dioscuri's coins.
    f.key(hip[0] - 1, hip[1] - 49, (255, 226, 150) if which == 'pollux' else (210, 235, 255))
    img = f.render()
    px = np.asarray(img).copy()
    sx, sy = hip[0] - 2, hip[1] - 70
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        px[sy + dy, sx + dx] = (255, 236, 190, 255) if (dx, dy) == (0, 0) else (200, 190, 150, 255)
    return Image.fromarray(px, 'RGBA'), f.keys[0][:2]


def one_fish(which, pose):
    """One of the two Pisces fish for the game (the cord between them is the attack). The key
    star (Alrescha) is where the cord ties to its tail."""
    rim = (170, 160, 255)
    f = Fig((76, 44), rim, 411 if which == 'a' else 417)
    m = f.body
    L, H = 46, 9
    cx, cy = 34, 22
    flick = .12 if pose == 'strike' else 0
    c, s = math.cos(flick), math.sin(flick)
    R = lambda x, y: (cx + x * c - y * s, cy + x * s + y * c)   # noqa: E731
    blob(m, [R(-L / 2, 1), R(-L / 2 + 5, -H * .7), R(-L / 6, -H), R(L / 5, -H * .7), R(L / 2 - 8, -2.4),
             R(L / 2 - 8, 2.4), R(L / 5, H * .6), R(-L / 6, H * .9), R(-L / 2 + 5, H * .6)])
    draw(m).polygon([R(L / 2 - 10, 0), R(L / 2 + 6, -11), R(L / 2 + 1, -1), R(L / 2 + 1, 1), R(L / 2 + 6, 11)], fill=255)
    draw(m).polygon([R(-6, -H + 1), R(2, -H - 7), R(10, -H * .8)], fill=255)
    draw(m).polygon([R(-2, H - 1), R(4, H + 5), R(9, H * .6)], fill=255)
    for k in range(4):
        f.etch([R(-8 + k * 7, -5), R(-5 + k * 7, 0), R(-8 + k * 7, 5)], smooth=False, soft=True)
    f.etch([R(-L / 2 + 10, -5), R(-L / 2 + 8, 0), R(-L / 2 + 10, 5)])
    f.etch([R(-L / 2 + 5, -2), R(-L / 2 + 6, -2)], smooth=False)
    kx, ky = R(L / 2 - 9, 0)
    f.key(kx, ky, (210, 200, 255))
    return f.render(), f.keys[0][:2]


SIGN_ORDER = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpius',
              'sagittarius', 'capricornus', 'aquarius', 'pisces']


def game_cells():
    """The rift sheet's zodiac cells: `sign-k` (hold) and `sign-k-1` (strike) for each sign;
    Gemini and Pisces, which split into two creatures in the fight, get one figure per cell
    plus their partner (`sign-2b`, `sign-11b`). Returns (cells, keys): key-star offsets from
    the frame centre in the strike frame (the only one that can be hit)."""
    cells, keys = {}, []
    for k, name in enumerate(SIGN_ORDER):
        if name == 'gemini':
            build, partner = (lambda p: twin('pollux', p)), (lambda p: twin('castor', p))
        elif name == 'pisces':
            build, partner = (lambda p: one_fish('a', p)), (lambda p: one_fish('b', p))
        else:
            build, partner = FIGURES[name], None
        hold, _ = build('hold')
        strike, key = build('strike')
        cells[f'sign-{k}'] = hold
        cells[f'sign-{k}-1'] = strike
        if partner:
            cells[f'sign-{k}b'] = partner('hold')[0]
            cells[f'sign-{k}b-1'] = partner('strike')[0]
        keys.append((round(key[0] - strike.width / 2), round(key[1] - strike.height / 2)))
    return cells, keys


# ------------------------------------------------------------------ emitters (P2.3)
# Where each creature's attacks come out, in its strike frame (frame pixels; `emitters()`
# converts them to offsets from the frame centre). Gemini and Pisces: the lead figure
# (Pollux, fish a); the partner uses the `b` entries.
EMIT_POINTS = {
    'aries': {'horns': (8, 52), 'hooves': (22, 86)},
    'taurus': {'eye': (20, 53), 'muzzle': (6, 62), 'horns': (2, 24)},
    'gemini': {'hand': (18, 10), 'b_hand': (8, 44)},
    'cancer': {'claw_near': (10, 34), 'claw_far': (92, 26), 'mouth': (62, 64)},
    'leo': {'mouth': (2, 33), 'eye': (12, 25), 'mane': (28, 28)},
    'virgo': {'wheat': (6, 16), 'hand': (12, 30)},
    'libra': {'pan_near': (13, 64), 'pan_far': (103, 42)},
    'scorpius': {'sting': (100, 25), 'tail': (146, 60), 'claw': (16, 38)},
    'sagittarius': {'arrow': (4, 26)},
    'capricornus': {'mouth': (6, 50), 'tail': (112, 52)},
    'aquarius': {'urn': (57, 18)},
    'pisces': {'mouth': (64, 20)},   # the fish faces right
}


def emitters():
    """{sign index: {name: (dx, dy)}} offsets from each strike frame's centre."""
    cells, _ = game_cells()
    out = {}
    for k, name in enumerate(SIGN_ORDER):
        img = cells[f'sign-{k}-1']
        out[k] = {n: (x - img.width // 2, y - img.height // 2) for n, (x, y) in EMIT_POINTS[name].items()}
    return out
