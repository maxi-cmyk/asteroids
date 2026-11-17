"""The star-fill bestiary (nextSteps.md P1): the Zodiarch dragon, its twelve zodiac
creatures and Ninefold, drawn from primitives on top of starfill.py. Used by
make-bosses.py (the rift sheet the game loads) and make-p1-drafts.py (the approval sheet).
All shapes are original; assets/inspo is mood only.
"""
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

sys.path.insert(0, str(Path(__file__).resolve().parent))
from starfill import mask, draw, bezier, stroke, tube, starfill, stack  # noqa: E402

GOLD = (255, 214, 120)
FOX_RIM = (150, 230, 255)


def poly(m, pts):
    draw(m).polygon([(round(x), round(y)) for x, y in pts], fill=255)
    return m


def ellipse(m, cx, cy, rx, ry):
    draw(m).ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255)
    return m


def thin(m, path, width=1):
    draw(m).line([(round(x), round(y)) for x, y in path], fill=255, width=width)
    return m


# ------------------------------------------------------------------ Zodiarch
def dragon_head(size=(120, 84), open_mouth=False, seed=11):
    """Facing left. The eye is the key star; horns, whiskers and teeth are rim detail."""
    S = size
    skull = ellipse(mask(S), 70, 40, 20, 18)
    poly(skull, [(84, 22), (54, 22), (36, 26), (16, 30), (6, 36), (10, 41), (40, 42), (84, 46)])  # upper jaw
    poly(skull, [(60, 24), (50, 16), (44, 24)])  # brow ridge
    jaw = mask(S)
    drop = 8 if open_mouth else 0
    poly(jaw, [(78, 46), (44, 45), (20, 46 + drop), (14, 50 + drop), (30, 55 + drop), (74, 58)])
    mane = mask(S)
    for i in range(5):
        a = math.radians(-60 + i * 30)  # swept back, away from the snout
        bx, by = 80 + 14 * math.cos(a), 40 + 16 * math.sin(a)
        tip = (bx + 24 * math.cos(a), by + 20 * math.sin(a))
        poly(mane, [(bx - 6 * math.sin(a), by + 6 * math.cos(a)), tip, (bx + 6 * math.sin(a), by - 6 * math.cos(a))])
    horn = mask(S)
    for dy, length in ((0, 1.0), (6, .8)):
        stroke(horn, bezier([(70, 24 + dy), (88, 4 + dy), (104, 0 + dy), (116 * length + 6, 6 + dy)], 30), 3.2, 1)
    detail = mask(S)
    thin(detail, bezier([(14, 40), (8, 56), (24, 70), (46, 74)], 24))  # whiskers
    thin(detail, bezier([(20, 41), (22, 58), (40, 66), (58, 70)], 24))
    teeth = mask(S)
    for x in range(20, 48, 6):
        poly(teeth, [(x, 42), (x + 3, 42), (x + 1.5, 46)])
        if open_mouth:
            poly(teeth, [(x + 2, 46 + drop), (x + 5, 46 + drop), (x + 3.5, 42 + drop)])
    eye = (46, 30, (140, 230, 255))
    parts = [
        starfill(horn, rim=GOLD, seed=seed, density=0),
        starfill(mane, rim=GOLD, seed=seed + 1),
        starfill(jaw, rim=GOLD, seed=seed + 2, detail=teeth if open_mouth else None),
        starfill(skull, rim=GOLD, seed=seed + 3, keys=[eye], detail=None if open_mouth else teeth),
        starfill(detail, rim=GOLD, seed=seed + 4, density=0),
    ]
    return stack(S, parts)


def dragon_segment(r, seed, spine=True, size=None, spike=6):
    S = size or (int(r * 2 + 16), int(r * 2 + 16))
    c = S[0] / 2
    body = ellipse(mask(S), c, c, r, r * .92)
    if spine:  # a dorsal fin on top
        poly(body, [(c - r * .5, c - r * .7), (c + r * .1, c - r - spike), (c + r * .5, c - r * .7)])
    return starfill(body, rim=GOLD, seed=seed)


def pearl(size=(28, 28)):
    m = ellipse(mask(size), 14, 14, 8, 8)
    return starfill(m, rim=(255, 150, 200), seed=5, density=0, keys=[(14, 14, (255, 180, 220))])


def tail_fan(seed=91):
    """A big spiked tail: five long blades fanned from the last segment, barbs on the outer two."""
    S = (80, 76)
    m = mask(S)
    base = (8, 38)
    for k, a in enumerate((-56, -28, 0, 28, 56)):
        ra = math.radians(a)
        length = 66 if a == 0 else 56 if abs(a) == 28 else 44
        tip = (base[0] + length * math.cos(ra), base[1] + length * math.sin(ra))
        mid = (base[0] + length * .5 * math.cos(ra) + 4 * math.sin(ra), base[1] + length * .5 * math.sin(ra))
        tube(m, bezier([base, mid, tip], 30), lambda u: 7 * (1 - u) + .6)
        if abs(a) == 56:  # barbs
            for f in (.45, .7):
                bx, by = base[0] + length * f * math.cos(ra), base[1] + length * f * math.sin(ra)
                out = ra + (-1.1 if a < 0 else 1.1)
                poly(m, [(bx, by), (bx + 10 * math.cos(out), by + 10 * math.sin(out)), (bx + 4 * math.cos(ra), by + 4 * math.sin(ra))])
    ellipse(m, base[0] + 4, base[1], 9, 9)
    return starfill(m, rim=GOLD, seed=seed)


def zodiarch_assembled(frame=(480, 270)):
    """The whole dragon coiled on the right of the field, as the framework would place its
    head, segments and tail. Body follows an S-curve; segments taper toward the tail."""
    img = Image.new('RGBA', frame, (0, 0, 0, 0))
    path = bezier([(262, 126), (300, 56), (420, 36), (452, 118), (362, 168), (300, 230), (392, 248)], 400)
    lengths = [0]
    for a, b in zip(path, path[1:]):
        lengths.append(lengths[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    n = 26
    segs = []
    for i in range(n):
        target = lengths[-1] * i / (n - 1)
        j = min(range(len(path)), key=lambda k: abs(lengths[k] - target))
        r = 20 - i * 10 / (n - 1)   # wider body: 20 px at the neck, 10 at the tail
        segs.append((path[j], r, i))
    (tx, ty), _, _ = segs[-1]
    fan = tail_fan()
    img.alpha_composite(fan, (int(tx - 8), int(ty - 38)))
    for (x, y), r, i in reversed(segs):  # tail first, so the neck sits on top
        seg = dragon_segment(r, seed=40 + i, spine=i % 2 == 0, spike=6 + (i > 18) * 4)
        img.alpha_composite(seg, (int(x - seg.width / 2), int(y - seg.height / 2)))
    for i in (4, 15):  # two short legs with three talons each
        (x, y), r, _ = segs[i]
        claw = mask((28, 28))
        tube(claw, bezier([(17, 2), (15, 11), (11, 17)], 10), lambda u: 4.5 - u * 1.5)
        for dx, dy in ((-8, 2), (-5, 7), (0, 8)):
            poly(claw, [(9, 16), (13, 18), (10 + dx, 18 + dy)])
        img.alpha_composite(starfill(claw, rim=GOLD, seed=70 + i, density=0), (int(x - 15), int(y + r * .55)))
    head = dragon_head(open_mouth=True)
    img.alpha_composite(head, (int(path[0][0] - 84), int(path[0][1] - 42)))
    img.alpha_composite(pearl(), (int(path[0][0] - 70), int(path[0][1] + 10)))
    return img


# ------------------------------------------------------------------ Ninefold
def ninefold(size=(250, 196), seed=21):
    """Sitting fox facing left, nine tails fanned behind, front legs straight, the near hind
    leg folded at its side with the paw forward (as in the reference pose)."""
    S = size
    tails = []
    for i in range(9):
        a = math.radians(-128 + i * 17)
        base = (124, 128)
        mid = (base[0] + 50 * math.cos(a) + 10, base[1] + 46 * math.sin(a) - 10)
        tip = (base[0] + 92 * math.cos(a + .3) + 14, base[1] + 80 * math.sin(a + .3) - 8)
        t = tube(mask(S), bezier([base, mid, tip], 50), lambda u: 4 + 9 * math.sin(math.pi * min(1, u * 1.15)))
        tails.append(starfill(t, rim=FOX_RIM, seed=seed + i))
    far_paw = poly(mask(S), [(70, 164), (82, 164), (84, 172), (68, 172)])  # far hind paw peeking out
    body = ellipse(mask(S), 112, 124, 21, 40)            # upright, like the reference
    ellipse(body, 96, 106, 16, 28)                      # chest, pushed forward
    poly(body, [(84, 74), (102, 70), (108, 96), (88, 100)])  # neck
    legs = mask(S)
    for x in (86, 99):  # long front legs with paws
        poly(legs, [(x + 1, 112), (x + 7, 112), (x + 6, 166), (x + 9, 172), (x - 2, 172), (x, 164)])
    haunch = ellipse(mask(S), 124, 148, 17, 21)  # the near hind thigh, folded at the side
    hind_paw = poly(mask(S), [(108, 162), (128, 160), (132, 172), (104, 172)])
    head = ellipse(mask(S), 90, 58, 19, 16)
    poly(head, [(78, 54), (56, 66), (60, 70), (84, 72)])  # snout
    poly(head, [(78, 48), (72, 20), (92, 44)])  # far ear
    poly(head, [(92, 46), (102, 18), (108, 50)])  # near ear
    detail = mask(S)
    thin(detail, [(76, 28), (80, 44)])
    thin(detail, [(101, 26), (102, 44)])
    keys = [(74, 56, (150, 230, 255)), (92, 44, (255, 120, 170))]  # eye, forehead mark
    return stack(S, tails + [
        starfill(far_paw, rim=FOX_RIM, seed=seed + 19),
        starfill(body, rim=FOX_RIM, seed=seed + 20),
        starfill(legs, rim=FOX_RIM, seed=seed + 21),
        starfill(haunch, rim=FOX_RIM, seed=seed + 24),
        starfill(hind_paw, rim=FOX_RIM, seed=seed + 25),
        starfill(head, rim=FOX_RIM, seed=seed + 22, keys=keys),
        starfill(detail, rim=FOX_RIM, seed=seed + 23, density=0),
    ])


# ------------------------------------------------------------------ the twelve sign creatures
# Each faces left (toward the pilot) and keeps one bright key star: its weak point.
def ram(rim=(255, 150, 90), seed=101):
    S = (72, 60)
    body = ellipse(mask(S), 40, 32, 20, 12)
    legs = mask(S)
    for x in (26, 32, 46, 52):
        poly(legs, [(x, 38), (x + 4, 38), (x + 4, 54), (x, 54)])
    head = ellipse(mask(S), 18, 24, 9, 8)
    poly(head, [(12, 24), (4, 32), (10, 34), (18, 30)])
    horn = stroke(mask(S), [(18 + 9 * math.cos(t) * (1 - t / 9), 18 + 9 * math.sin(t) * (1 - t / 9)) for t in [i / 6 for i in range(0, 46)]], 3, 1.5)
    return stack(S, [starfill(legs, rim, seed), starfill(body, rim, seed + 1),
                     starfill(head, rim, seed + 2, keys=[(12, 23, rim)]), starfill(horn, rim, seed + 3, density=0)])


def bull(rim=(255, 190, 110), seed=141):
    S = (90, 66)
    legs = mask(S)
    for x in (32, 40, 62, 70):
        tube(legs, [(x, 40), (x - 1, 52), (x, 62)], lambda u: 3.6 - u)
    tail = tube(mask(S), bezier([(76, 30), (86, 36), (84, 50)], 14), lambda u: 1.6)
    ellipse(tail, 84, 52, 3, 3)
    body = ellipse(mask(S), 56, 34, 24, 13)
    ellipse(body, 38, 28, 15, 14)  # shoulder hump
    head = ellipse(mask(S), 20, 38, 9, 8)
    poly(head, [(16, 40), (8, 46), (16, 50), (24, 46)])
    horns = mask(S)
    tube(horns, bezier([(20, 32), (10, 28), (6, 16)], 12), lambda u: 2.4 - u * 1.4)
    tube(horns, bezier([(24, 31), (20, 20), (18, 12)], 12), lambda u: 2.4 - u * 1.4)
    return stack(S, [starfill(tail, rim, seed, density=0), starfill(legs, rim, seed + 1), starfill(body, rim, seed + 2, keys=[(38, 24, (255, 226, 150))]),
                     starfill(head, rim, seed + 3, keys=[(17, 36, (255, 160, 120))]), starfill(horns, rim, seed + 4, density=0)])


def twins(rim=(140, 220, 255), seed=151):
    S = (76, 80)
    parts = []
    for k, x in enumerate((26, 50)):
        fig = ellipse(mask(S), x, 12, 5.5, 6)
        poly(fig, [(x - 7, 20), (x + 7, 20), (x + 6, 46), (x - 6, 46)])
        tube(fig, [(x - 3, 46), (x - 4, 74)], lambda u: 2.8)
        tube(fig, [(x + 3, 46), (x + 4, 74)], lambda u: 2.8)
        outer = -1 if k == 0 else 1
        tube(fig, [(x + 7 * outer, 22), (x + 11 * outer, 36), (x + 10 * outer, 44)], lambda u: 2.2)
        parts.append(starfill(fig, rim, seed + k, keys=[(x, 11, (200, 240, 255) if k == 0 else (255, 226, 150))]))
    hands = tube(mask(S), bezier([(32, 24), (38, 34), (44, 24)], 12), lambda u: 2.2)
    return stack(S, [parts[1], parts[0], starfill(hands, rim, seed + 3, density=0)])


def crab(rim=(180, 230, 210), seed=161):
    S = (90, 64)
    legs = mask(S)
    for side in (-1, 1):
        for k in range(3):
            sx = 45 + side * (12 + k * 3)
            tube(legs, bezier([(sx, 40), (45 + side * (24 + k * 4), 48), (45 + side * (26 + k * 4), 60)], 10), lambda u: 2.2 - u * .8)
    claws = mask(S)
    for side in (-1, 1):
        tube(claws, bezier([(45 + side * 16, 30), (45 + side * 28, 22), (45 + side * 32, 12)], 12), lambda u: 3.6)
        cx = 45 + side * 33
        poly(claws, [(cx - 6, 12), (cx - 8 * side - 2, 0), (cx + 2, 6)])
        poly(claws, [(cx + 6 * side, 12), (cx + 8 * side, 2), (cx + 4 * side, 14)])
    shell = ellipse(mask(S), 45, 36, 21, 13)
    eyes = mask(S)
    for dx in (-6, 6):
        tube(eyes, [(45 + dx, 26), (45 + dx * 1.2, 18)], lambda u: 1.6)
    return stack(S, [starfill(legs, rim, seed, density=0), starfill(claws, rim, seed + 1), starfill(eyes, rim, seed + 2, density=0),
                     starfill(shell, rim, seed + 3, keys=[(45, 34, (220, 255, 240))])])


def maiden(rim=(200, 240, 140), seed=171):
    S = (76, 88)
    wing = poly(mask(S), [(40, 28), (66, 6), (70, 18), (62, 34), (46, 42)])
    hair = tube(mask(S), bezier([(38, 10), (46, 18), (48, 34)], 14), lambda u: 3.4 - u * 2)
    dress = poly(mask(S), [(26, 24), (40, 24), (54, 84), (14, 84)])
    head = ellipse(mask(S), 33, 14, 6, 6.5)
    arm = tube(mask(S), [(28, 30), (20, 36), (14, 34)], lambda u: 2.2)
    wheat = thin(mask(S), [(13, 38), (8, 6)])
    for k in range(5):
        y = 8 + k * 4
        ellipse(wheat, 6 + (k % 2) * 4, y, 2, 1.4)
    return stack(S, [starfill(wing, rim, seed), starfill(hair, rim, seed + 1, density=0), starfill(dress, rim, seed + 2),
                     starfill(head, rim, seed + 3), starfill(arm, rim, seed + 4, density=0),
                     starfill(wheat, rim, seed + 5, density=0, keys=[(8, 8, (200, 230, 255))])])


def scales(rim=(230, 230, 255), seed=181):
    S = (86, 78)
    post = poly(mask(S), [(41, 18), (45, 18), (45, 68), (41, 68)])
    poly(post, [(30, 68), (56, 68), (60, 76), (26, 76)])
    beam = tube(mask(S), [(10, 26), (76, 16)], lambda u: 2.2)   # tipped: the left pan is heavier
    chains = mask(S)
    for (bx, by), (px, py) in (((10, 26), (10, 52)), ((76, 16), (76, 42))):
        thin(chains, [(bx, by), (px - 9, py)])
        thin(chains, [(bx, by), (px + 9, py)])
    pans = mask(S)
    for px, py in ((10, 52), (76, 42)):
        draw(pans).chord((px - 10, py - 6, px + 10, py + 6), 0, 180, fill=255)
    top = ellipse(mask(S), 43, 12, 5, 5)
    return stack(S, [starfill(post, rim, seed), starfill(chains, rim, seed + 1, density=0), starfill(beam, rim, seed + 2, density=0),
                     starfill(pans, rim, seed + 3), starfill(top, rim, seed + 4, density=0, keys=[(43, 12, (255, 255, 255))])])


def sea_goat(rim=(160, 200, 255), seed=191):
    S = (90, 74)
    tail = tube(mask(S), bezier([(34, 38), (58, 52), (78, 44), (74, 22)], 40), lambda u: 11 - u * 8)
    fin = poly(mask(S), [(74, 24), (62, 6), (74, 14)])
    poly(fin, [(74, 24), (86, 8), (80, 22)])
    legs = mask(S)
    tube(legs, [(26, 44), (18, 52), (22, 60)], lambda u: 3 - u)
    tube(legs, [(32, 46), (28, 56), (34, 62)], lambda u: 3 - u)
    chest = ellipse(mask(S), 30, 36, 10, 12)
    head = ellipse(mask(S), 18, 22, 7, 6)
    poly(head, [(14, 24), (6, 30), (12, 32), (20, 28)])
    poly(head, [(10, 32), (12, 40), (16, 32)])  # beard
    horns = tube(mask(S), bezier([(20, 16), (26, 4), (36, 4), (40, 12)], 20), lambda u: 2.4 - u * 1.4)
    return stack(S, [starfill(tail, rim, seed), starfill(fin, rim, seed + 1, density=0), starfill(legs, rim, seed + 2, density=0),
                     starfill(chest, rim, seed + 3), starfill(head, rim, seed + 4, keys=[(16, 20, (200, 230, 255))]),
                     starfill(horns, rim, seed + 5, density=0)])


def water_bearer(rim=(110, 200, 255), seed=201):
    S = (84, 86)
    robe = poly(mask(S), [(34, 44), (56, 44), (62, 80), (28, 80)])
    torso = poly(mask(S), [(38, 22), (50, 22), (52, 46), (36, 46)])
    head = ellipse(mask(S), 44, 14, 6, 6.5)
    hair = tube(mask(S), bezier([(48, 10), (56, 16), (56, 28)], 12), lambda u: 3 - u * 1.8)
    arm = tube(mask(S), [(40, 26), (30, 22), (26, 20)], lambda u: 2.2)
    urn = ellipse(mask(S), 24, 18, 8, 7)
    poly(urn, [(18, 20), (10, 26), (12, 30), (20, 26)])
    water = mask(S)
    for k in range(9):
        t = k / 8
        ellipse(water, 10 - 4 * math.sin(t * 5), 32 + t * 50, 1.8, 2.4)
    return stack(S, [starfill(hair, rim, seed, density=0), starfill(robe, rim, seed + 1), starfill(torso, rim, seed + 2),
                     starfill(head, rim, seed + 3), starfill(arm, rim, seed + 4, density=0), starfill(urn, rim, seed + 5, keys=[(24, 18, (200, 240, 255))]),
                     starfill(water, rim, seed + 6, density=0)])


def fish_pair(rim=(170, 160, 255), seed=211):
    S = (92, 76)
    cord = thin(mask(S), bezier([(56, 20), (80, 40), (20, 40), (34, 54)], 40))
    a = ellipse(mask(S), 30, 18, 16, 8)
    poly(a, [(44, 18), (56, 8), (54, 28)])
    b = ellipse(mask(S), 62, 56, 16, 8)
    poly(b, [(48, 56), (36, 46), (38, 66)])
    knot = mask(S)
    ellipse(knot, 50, 40, 2, 2)
    return stack(S, [starfill(cord, rim, seed, density=0), starfill(a, rim, seed + 1, keys=[(20, 16, (220, 220, 255))]),
                     starfill(b, rim, seed + 2, keys=[(72, 54, (220, 220, 255))]),
                     starfill(knot, rim, seed + 3, density=0, keys=[(50, 40, (255, 226, 150))])])


def lion(rim=(255, 210, 90), seed=111):
    S = (76, 60)
    body = ellipse(mask(S), 44, 32, 22, 11)
    legs = mask(S)
    for x in (28, 34, 52, 58):
        poly(legs, [(x, 36), (x + 4, 36), (x + 4, 54), (x, 54)])
    tail = stroke(mask(S), bezier([(64, 28), (74, 18), (70, 8)], 16), 2, 1.5)
    ellipse(tail, 70, 8, 3, 3)
    mane = mask(S)
    for k in range(10):
        a = k / 10 * math.tau
        poly(mane, [(20 + 9 * math.cos(a - .3), 24 + 9 * math.sin(a - .3)), (20 + 15 * math.cos(a), 24 + 15 * math.sin(a)), (20 + 9 * math.cos(a + .3), 24 + 9 * math.sin(a + .3))])
    ellipse(mane, 20, 24, 10, 10)
    face = ellipse(mask(S), 17, 26, 6, 6)
    poly(face, [(13, 26), (8, 30), (14, 32)])
    return stack(S, [starfill(tail, rim, seed, density=0), starfill(legs, rim, seed + 1), starfill(body, rim, seed + 2, keys=[(40, 30, rim)]),
                     starfill(mane, rim, seed + 3), starfill(face, rim, seed + 4, keys=[(14, 24, (255, 255, 200))])])


def scorpion(rim=(255, 90, 90), seed=121):
    S = (80, 60)
    body = mask(S)
    for i in range(5):
        ellipse(body, 30 + i * 8, 42, 7 - i * .5, 6 - i * .5)
    tail = stroke(mask(S), bezier([(64, 40), (78, 30), (70, 6), (52, 10)], 30), 4, 2.5)
    sting = poly(mask(S), [(52, 6), (46, 12), (54, 14)])
    claws = mask(S)
    for dy in (-8, 8):
        stroke(claws, bezier([(26, 42 + dy / 2), (16, 42 + dy), (8, 40 + dy)], 12), 2, 2)
        poly(claws, [(10, 36 + dy), (2, 38 + dy), (6, 44 + dy), (12, 42 + dy)])
    legs = mask(S)
    for x in (30, 38, 46, 54):
        thin(legs, [(x, 46), (x - 4, 54), (x - 6, 58)], 2)
    return stack(S, [starfill(legs, rim, seed, density=0), starfill(claws, rim, seed + 1, density=0), starfill(tail, rim, seed + 2),
                     starfill(body, rim, seed + 3), starfill(sting, rim, seed + 4, density=0, keys=[(51, 10, (255, 70, 70))])])


def centaur(rim=(255, 170, 210), seed=131):
    """After the reference pose: rearing, front legs raised, strong haunch, a big S-curved tail,
    the human torso drawing a tall bow held over the head. Drawn facing right like the
    reference, then mirrored to face the pilot. The arrowhead is the key star."""
    S = (100, 92)
    tail = tube(mask(S), bezier([(32, 50), (10, 58), (4, 34), (14, 20), (30, 22)], 40), lambda u: 6.5 - u * 4)
    far_legs = mask(S)
    tube(far_legs, bezier([(44, 64), (42, 76), (50, 84)], 14), lambda u: 4 - u * 1.8)   # far hind
    tube(far_legs, bezier([(64, 60), (62, 72), (56, 82)], 14), lambda u: 3.6 - u * 1.6)   # far fore
    body = ellipse(mask(S), 38, 58, 14, 12)          # haunch
    ellipse(body, 54, 60, 20, 10)                    # barrel
    ellipse(body, 70, 54, 11, 11)                    # chest, lifted (rearing)
    near_legs = mask(S)
    tube(near_legs, bezier([(34, 64), (26, 74), (34, 82), (42, 86)], 18), lambda u: 5 - u * 2.6)   # near hind, kicking back
    tube(near_legs, bezier([(70, 60), (80, 66), (76, 76), (82, 80)], 18), lambda u: 3.8 - u * 1.6)  # near fore, raised
    torso = poly(mask(S), [(63, 54), (75, 54), (73, 40), (78, 28), (74, 22), (58, 22), (58, 30), (64, 40)])
    head = ellipse(mask(S), 66, 15, 5, 5.5)
    poly(head, [(70, 14), (73, 17), (69, 19)])  # nose, in profile
    hair = tube(mask(S), bezier([(64, 8), (54, 10), (46, 20), (42, 30)], 24), lambda u: 4 - u * 2.6)
    arms = mask(S)
    tube(arms, [(72, 28), (82, 26), (90, 24)], lambda u: 2.4)      # bow arm, reaching forward
    tube(arms, [(60, 26), (54, 22), (56, 18)], lambda u: 2.2)      # draw arm, hand by the jaw
    bow = tube(mask(S), bezier([(56, 8), (78, -4), (96, 20), (92, 50)], 40), lambda u: 1.3)
    string = thin(mask(S), [(56, 8), (56, 18), (92, 50)])
    arrow = thin(mask(S), [(50, 20), (98, 46)], 2)
    poly(arrow, [(98, 46), (92, 46), (96, 41)])
    img = stack(S, [
        starfill(tail, rim, seed, density=1 / 40),
        starfill(far_legs, rim, seed + 1, density=0),
        starfill(body, rim, seed + 2),
        starfill(near_legs, rim, seed + 3, density=1 / 50),
        starfill(hair, rim, seed + 4, density=0),
        starfill(torso, rim, seed + 5),
        starfill(head, rim, seed + 6, density=0),
        starfill(string, rim, seed + 7, density=0),
        starfill(bow, rim, seed + 8, density=0),
        starfill(arms, rim, seed + 9, density=0),
        starfill(arrow, rim, seed + 10, density=0, keys=[(95, 44, (255, 220, 240))]),
    ])
    return ImageOps.mirror(img)


SIGNS = [
    ('ARIES', ram), ('TAURUS', bull), ('GEMINI', twins), ('CANCER', crab),
    ('LEO', lion), ('VIRGO', maiden), ('LIBRA', scales), ('SCORPIO', scorpion),
    ('SAGITTARIUS', centaur), ('CAPRICORN', sea_goat), ('AQUARIUS', water_bearer), ('PISCES', fish_pair),
]




# ------------------------------------------------------------------ in-game cells (rift sheet)
# Key-star (weak point) offsets from each sign cell's frame centre, shared with the engine
# (native/boss/fights/warden.h, SIGN_KEY). Order: Aries .. Pisces (Pisces is one fish).
SIGN_BUILDERS = [ram, bull, twins, crab, lion, maiden, scales, scorpion, centaur, sea_goat,
                 water_bearer]
SIGN_KEY_POINTS = [(12, 23), (38, 24), (26, 11), (45, 34), (14, 24), (8, 8), (43, 12), (51, 10),
                   None, (16, 20), (24, 18)]


def fish(rim=(170, 160, 255), seed=211):
    """One of the Pisces pair, facing left; the eye is its weak point."""
    S = (44, 24)
    m = ellipse(mask(S), 18, 12, 14, 7)
    poly(m, [(30, 12), (42, 3), (40, 21)])
    return starfill(m, rim, seed, keys=[(9, 10, (220, 220, 255))])


def sign_cells():
    """(cell, key offset from frame centre) for the twelve signs."""
    out = []
    for k, build in enumerate(SIGN_BUILDERS):
        img = build()
        if build is centaur:   # mirrored: the arrowhead key at (95, 44) of the unmirrored frame
            key = (img.width - 1 - 95, 44)
        else:
            key = SIGN_KEY_POINTS[k]
        out.append((img, (key[0] - img.width / 2, key[1] - img.height / 2)))
    f = fish()
    out.append((f, (9 - f.width / 2, 10 - f.height / 2)))
    return out


SEGMENT_RADII = (20, 18, 16, 14, 12, 10)


def dragon_cells():
    cells = {
        'zod-head-0': dragon_head(open_mouth=False),
        'zod-head-1': dragon_head(open_mouth=True),
    }
    for r in SEGMENT_RADII:
        for spine in (0, 1):
            # One frame size for every segment so each draws centred on its point.
            cells[f'zod-seg-{r}-{spine}'] = dragon_segment(r, seed=40 + r * 2 + spine, spine=bool(spine), size=(56, 56))
    fan = tail_fan()
    framed = Image.new('RGBA', (144, 76), (0, 0, 0, 0))
    framed.alpha_composite(fan, (64, 0))   # the fan's root (8, 38) lands on the frame centre
    cells['zod-tail'] = framed
    claw = mask((28, 28))
    tube(claw, bezier([(17, 2), (15, 11), (11, 17)], 10), lambda u: 4.5 - u * 1.5)
    for dx, dy in ((-8, 2), (-5, 7), (0, 8)):
        poly(claw, [(9, 16), (13, 18), (10 + dx, 18 + dy)])
    cells['zod-claw'] = starfill(claw, rim=GOLD, seed=74, density=0)
    p = ellipse(mask((28, 28)), 14, 14, 8, 8)
    cells['zod-pearl-0'] = starfill(p, rim=(170, 110, 150), seed=5, density=0, keys=[(14, 14, (190, 130, 170))])
    cells['zod-pearl-1'] = starfill(p, rim=(255, 150, 200), seed=5, density=0, keys=[(14, 14, (255, 190, 230))])
    return cells


# Ninefold geometry, shared with the engine (warden.h, FOX_*): offsets from the frame centre.
FOX_SIZE = (250, 196)
FOX_TAIL_BASE = (124, 128)


# Tail sway: each tail has five bend frames (-2..2, 2 is the rest frame `ninefold-tail-i`).
# A bend turns the tail about its root, the tip more than the middle. The engine moves each
# tail's hit point by the same rule (warden.h, bs_fox_sway), so the hit circle follows.
FOX_BEND_MID, FOX_BEND_TIP = .02, .045   # radians per bend step
FOX_ILLUSION_SCALE = .6                  # the three foxes of an illusion are drawn smaller


def _fox_tail_path(i, bend=0):
    a = math.radians(-128 + i * 17)
    base = FOX_TAIL_BASE
    am, at = a + bend * FOX_BEND_MID, a + .3 + bend * FOX_BEND_TIP
    mid = (base[0] + 50 * math.cos(am) + 10, base[1] + 46 * math.sin(am) - 10)
    tip = (base[0] + 92 * math.cos(at) + 14, base[1] + 80 * math.sin(at) - 8)
    return base, mid, tip


def fox_geometry():
    cx, cy = FOX_SIZE[0] / 2, FOX_SIZE[1] / 2
    tails = []
    for i in range(9):
        path = bezier(list(_fox_tail_path(i)), 50)
        x, y = path[30]   # a point well along each tail, clear of the body
        tails.append((round(x - cx), round(y - cy)))
    return {
        'tails': tails,
        'base': (FOX_TAIL_BASE[0] - cx, FOX_TAIL_BASE[1] - cy),
        'head': (90 - cx, 58 - cy, 17),
        'mark': (92 - cx, 44 - cy),
        'body': (106 - cx, 120 - cy, 30),
    }


def fox_cells(seed=21, k=1.0, prefix='ninefold'):
    """Ninefold for the game, every cell in the same frame so they stack by the centre:
    the body four ways (normal, forehead open, eyes shut for its blink, decoy with dark eyes)
    and each tail in five bend frames. `k` scales the whole drawing (the illusion uses .6)."""
    S = (round(FOX_SIZE[0] * k), round(FOX_SIZE[1] * k))
    P = lambda pts: [(x * k, y * k) for x, y in pts]   # noqa: E731
    cells = {}
    for i in range(9):
        for bend in (-2, -1, 0, 1, 2):
            t = tube(mask(S), P(bezier(list(_fox_tail_path(i, bend)), 50)),
                     lambda u: (4 + 9 * math.sin(math.pi * min(1, u * 1.15))) * k)
            cells[f'{prefix}-tail-{i}-{bend + 2}'] = starfill(t, rim=FOX_RIM, seed=seed + i)
        cells[f'{prefix}-tail-{i}'] = cells[f'{prefix}-tail-{i}-2']

    def body(eyes, mark):
        far_paw = poly(mask(S), P([(70, 164), (82, 164), (84, 172), (68, 172)]))
        b = ellipse(mask(S), 112 * k, 124 * k, 21 * k, 40 * k)
        ellipse(b, 96 * k, 106 * k, 16 * k, 28 * k)
        poly(b, P([(84, 74), (102, 70), (108, 96), (88, 100)]))
        legs = mask(S)
        for x in (86, 99):
            poly(legs, P([(x + 1, 112), (x + 7, 112), (x + 6, 166), (x + 9, 172), (x - 2, 172), (x, 164)]))
        haunch = ellipse(mask(S), 124 * k, 148 * k, 17 * k, 21 * k)
        hind_paw = poly(mask(S), P([(108, 162), (128, 160), (132, 172), (104, 172)]))
        head = ellipse(mask(S), 90 * k, 58 * k, 19 * k, 16 * k)
        poly(head, P([(78, 54), (56, 66), (60, 70), (84, 72)]))
        poly(head, P([(78, 48), (72, 20), (92, 44)]))
        poly(head, P([(92, 46), (102, 18), (108, 50)]))
        detail = mask(S)
        thin(detail, P([(76, 28), (80, 44)]))
        thin(detail, P([(101, 26), (102, 44)]))
        if eyes == 'shut':
            thin(detail, P([(70, 57), (78, 56)]))   # a closed lid
        keys = [(round(92 * k), round(44 * k), mark)]
        if eyes is True:
            keys.append((round(74 * k), round(56 * k), (150, 230, 255)))
        return stack(S, [
            starfill(far_paw, rim=FOX_RIM, seed=seed + 19),
            starfill(b, rim=FOX_RIM, seed=seed + 20),
            starfill(legs, rim=FOX_RIM, seed=seed + 21),
            starfill(haunch, rim=FOX_RIM, seed=seed + 24),
            starfill(hind_paw, rim=FOX_RIM, seed=seed + 25),
            starfill(head, rim=FOX_RIM, seed=seed + 22, keys=keys),
            starfill(detail, rim=FOX_RIM, seed=seed + 23, density=0),
        ])

    cells[f'{prefix}-0'] = body(True, (150, 90, 130))
    cells[f'{prefix}-1'] = body(True, (255, 120, 170))
    cells[f'{prefix}-shut'] = body('shut', (150, 90, 130))
    cells[f'{prefix}-decoy'] = body(False, (110, 80, 120))
    return cells
