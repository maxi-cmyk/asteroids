"""Ninefold as a posable skeleton (nextSteps.md P2.1): shoulders and hips, two-joint legs, a
neck and head, and nine tails that fan, stream or wrap, drawn in the star-fill style of
zodiac_art.py. A pose is a dict of numbers (POSES in fox_poses.py); `render(pose)` draws it
facing left, in pose coordinates of the game's 250 x 196 frame (ground at y 172) moved
by ORIGIN into a larger draft frame.
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from starfill import mask, draw, bezier, tube, starfill, stack  # noqa: E402

FOX_RIM = (150, 230, 255)
SIZE = (340, 236)   # the draft frame: room for streaming tails and leaps
ORIGIN = (45, 20)   # where the game's 250 x 196 frame sits inside it
FRONT = (27, 27)      # upper and lower front leg
HIND = (26, 30)       # thigh and shin
TAIL_LEN = 92

# A standing fox, the base every pose starts from (angles in degrees).
BASE = {
    'sho': (92, 112), 'hip': (150, 114), 'head': (66, 86), 'head_a': 0, 'ears': 0,
    'fl_far': (0, 0), 'fl_near': (0, 0), 'hl_far': (15, -15), 'hl_near': (15, -15),
    'tails': 'fan', 'tail_a': -60, 'spread': 136, 'tail_len': 1.0, 'curl': 17, 'wave': 0,
    'wrap': 0, 'eye': 'open', 'mouth': 0, 'rot': 0, 'dx': 0, 'dy': 0, 'haunch': 0,
    'tongue': 0,  # 1 out over the lower lip, 2 curled up to the nose (licking its chops)
}


def pose(**kw):
    p = dict(BASE)
    p.update(kw)
    return p


def lerp_pose(a, b, u):
    out = {}
    for k, v in a.items():
        w = b[k]
        if isinstance(v, tuple):
            out[k] = tuple(x + (y - x) * u for x, y in zip(v, w))
        elif isinstance(v, (int, float)) and not isinstance(v, bool):
            out[k] = v + (w - v) * u
        else:
            out[k] = v if u < .5 else w
    return out


def _dir(a):
    """Absolute leg angle: 0 straight down, positive forward (toward the left)."""
    r = math.radians(a)
    return -math.sin(r), math.cos(r)


def _leg(attach, a1, a2, lengths):
    d1, d2 = _dir(a1), _dir(a2)
    knee = (attach[0] + d1[0] * lengths[0], attach[1] + d1[1] * lengths[0])
    paw = (knee[0] + d2[0] * lengths[1], knee[1] + d2[1] * lengths[1])
    return [attach, knee, paw]


def _rot_pt(pt, c, a):
    r = math.radians(a)
    x, y = pt[0] - c[0], pt[1] - c[1]
    return (c[0] + x * math.cos(r) - y * math.sin(r), c[1] + x * math.sin(r) + y * math.cos(r))


def _tail_paths(p, base):
    paths = []
    for i in range(9):
        if p['tails'] == 'wrap':
            # Wrapped round the body like a cocoon: arcs about the body's centre.
            cx = (p['sho'][0] + p['hip'][0]) / 2
            cy = (p['sho'][1] + p['hip'][1]) / 2
            a0 = math.radians(p['wrap'] + i * 40)
            pts = []
            for k in range(24):
                u = k / 23
                a = a0 + u * 2.2
                r = 46 - 10 * u
                pts.append((cx + r * math.cos(a), cy + r * math.sin(a) * .9))
            paths.append(pts)
            continue
        f = i / 8 - .5
        a = math.radians(p['tail_a'] + p['spread'] * f + 6 * math.sin(p['wave'] + i * .7))
        curl = math.radians(p['curl'])
        L = TAIL_LEN * p['tail_len']
        mid = (base[0] + L * .52 * math.cos(a + curl * .4), base[1] + L * .5 * math.sin(a + curl * .4))
        tip = (base[0] + L * math.cos(a + curl), base[1] + L * .9 * math.sin(a + curl))
        paths.append(bezier([base, mid, tip], 50))
    return paths


def skeleton(p):
    """Every point of the pose, after its tilt and offset: legs, body, neck, head parts."""
    sho, hip = p['sho'], p['hip']
    c = ((sho[0] + hip[0]) / 2, (sho[1] + hip[1]) / 2)
    front = (sho[0] + 2, sho[1] + 6)
    legs = {
        'fl_far': _leg((front[0] + 6, front[1]), *p['fl_far'], FRONT),
        'fl_near': _leg(front, *p['fl_near'], FRONT),
        'hl_far': _leg((hip[0] + 4, hip[1] + 2), *p['hl_far'], HIND),
        'hl_near': _leg((hip[0] - 2, hip[1] + 4), *p['hl_near'], HIND),
    }
    head, ha = p['head'], p['head_a']
    # Head parts in the head's own frame (facing left), turned by head_a (nose up positive).
    def hp(dx, dy):
        return _rot_pt((head[0] + dx, head[1] + dy), head, ha)
    ear_back = p['ears'] * 30
    parts = {
        'snout': [hp(-12, -4), hp(-34, 8), hp(-30, 12 - 6 * p['mouth']), hp(-8, 14)],
        'jaw': [hp(-10, 10), hp(-30, 12 + 6 * p['mouth']), hp(-8, 16)],
        'ear_far': [hp(-12, -10), _rot_pt(hp(-18, -38), hp(-12, -10), ear_back), hp(2, -14)],
        'ear_near': [hp(2, -12), _rot_pt(hp(12, -40), hp(2, -12), ear_back), hp(18, -8)],
        'eye': hp(-16, -2), 'mark': hp(2, -14),
        'tongue': {0: [],
                   1: [hp(-24, 11), hp(-38, 12), hp(-41, 16), hp(-36, 18), hp(-24, 15)],
                   2: [hp(-27, 11), hp(-32, 5), hp(-36, 3), hp(-37, 7), hp(-31, 13)]}[p['tongue']],
    }
    base = (hip[0] + 14, hip[1] - 8)
    tails = _tail_paths(p, base)
    off = (p['dx'] + ORIGIN[0], p['dy'] + ORIGIN[1])

    def T(pt):
        q = _rot_pt(pt, c, p['rot'])
        return (q[0] + off[0], q[1] + off[1])
    return {
        'legs': {k: [T(q) for q in v] for k, v in legs.items()},
        'sho': T(sho), 'hip': T(hip), 'head': T(head), 'neck': [T(sho), T(head)],
        'parts': {k: ([T(q) for q in v] if isinstance(v, list) else T(v)) for k, v in parts.items()},
        'tails': [[T(q) for q in t] for t in tails], 'rot': p['rot'] + ha,
    }


def _ellipse(m, c, rx, ry, a=0):
    pts = []
    for k in range(32):
        t = k / 32 * math.tau
        pts.append(_rot_pt((c[0] + rx * math.cos(t), c[1] + ry * math.sin(t)), c, a))
    draw(m).polygon([(round(x), round(y)) for x, y in pts], fill=255)
    return m


def _poly(m, pts):
    draw(m).polygon([(round(x), round(y)) for x, y in pts], fill=255)
    return m


CENTRE = (ORIGIN[0] + 125, ORIGIN[1] + 98)   # the game frame's centre: the fox's position


def _scaled(v, k):
    """Every point of a skeleton scaled by k about the frame centre."""
    if isinstance(v, dict):
        return {key: (val if key == 'rot' else _scaled(val, k)) for key, val in v.items()}
    if isinstance(v, list):
        return [_scaled(q, k) for q in v]
    if isinstance(v, tuple) and len(v) == 2 and all(isinstance(c, (int, float)) for c in v):
        return (CENTRE[0] + (v[0] - CENTRE[0]) * k, CENTRE[1] + (v[1] - CENTRE[1]) * k)
    return v


def tail_radius(k=1.0):
    return lambda u: (4 + 9 * math.sin(math.pi * min(1, u * 1.15))) * k


def layers(p, k=1.0, seed=21, eyes_lit=True, mark=(255, 120, 170)):
    """The pose drawn at scale k as nine tail images and one body image (legs, body, head),
    every one in the full frame so they stack by the centre."""
    s = _scaled(skeleton(p), k)
    S = SIZE
    tails = [starfill(tube(mask(S), path, tail_radius(k)), rim=FOX_RIM, seed=seed + i)
             for i, path in enumerate(s['tails'])]

    def leg(name, w0, w1):
        return tube(mask(S), bezier(s['legs'][name], 20), lambda u: (w0 + (w1 - w0) * u) * k)
    far = mask(S)
    for m in (leg('fl_far', 3.4, 2.4), leg('hl_far', 4.6, 2.4)):
        far.paste(255, mask=m)
    body = tube(mask(S), [s['hip'], s['sho']], lambda u: (13 + 3 * u) * k)
    body_a = math.degrees(math.atan2(s['sho'][1] - s['hip'][1], s['sho'][0] - s['hip'][0])) + 180
    _ellipse(body, s['sho'], 17 * k, 19 * k, body_a)
    _ellipse(body, s['hip'], (15 + 3 * p['haunch']) * k, (16 + 4 * p['haunch']) * k, body_a)
    tube(body, s['neck'], lambda u: (10 - 2 * u) * k)
    near = mask(S)
    for m in (leg('fl_near', 3.6, 2.5), leg('hl_near', 5.2, 2.5)):
        near.paste(255, mask=m)
    head = _ellipse(mask(S), s['head'], 19 * k, 16 * k, s['rot'])
    parts = s['parts']
    for name in ('snout', 'jaw', 'ear_far', 'ear_near'):
        _poly(head, parts[name])
    keys = [(round(parts['mark'][0]), round(parts['mark'][1]), mark)]
    if p['eye'] == 'open' and eyes_lit:
        keys.append((round(parts['eye'][0]), round(parts['eye'][1]), FOX_RIM))
    detail = mask(S)
    if p['eye'] == 'shut':
        e = parts['eye']
        draw(detail).line([(round(e[0] - 4 * k), round(e[1])), (round(e[0] + 4 * k), round(e[1]))], fill=255)
    body_img = stack(S, [
        starfill(far, rim=FOX_RIM, seed=seed + 19),
        starfill(body, rim=FOX_RIM, seed=seed + 20),
        starfill(near, rim=FOX_RIM, seed=seed + 21),
        starfill(head, rim=FOX_RIM, seed=seed + 22, keys=keys),
        starfill(detail, rim=FOX_RIM, seed=seed + 23, density=0),
    ])
    if parts['tongue']:
        body_img.alpha_composite(_tongue(parts['tongue']))
    return tails, body_img


def _tongue(pts):
    """A pink tongue with a dark outline, over the head."""
    from PIL import Image
    img = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    d = draw(img)
    poly = [(round(x), round(y)) for x, y in pts]
    d.polygon(poly, fill=(255, 120, 170, 255), outline=(60, 20, 50, 255))
    return img


def render(p, seed=21, eyes_lit=True, mark=(255, 120, 170), k=1.0):
    tails, body = layers(p, k, seed, eyes_lit, mark)
    return stack(SIZE, tails + [body])


def geometry(p):
    """Points the game needs, from the frame centre at scale 1 (facing left): each tail's hit
    point, the forehead mark, the jaw (foxfire), the head and body circles."""
    s = skeleton(p)
    rel = lambda q: (round(q[0] - CENTRE[0], 1), round(q[1] - CENTRE[1], 1))   # noqa: E731
    tails = []
    for path in s['tails']:
        tails.append(rel(path[min(len(path) - 1, round(len(path) * .6))]))
    sho, hip, head = s['sho'], s['hip'], s['head']
    body_c = ((sho[0] + hip[0]) / 2, (sho[1] + hip[1]) / 2)
    body_r = max(18, math.hypot(sho[0] - hip[0], sho[1] - hip[1]) / 2 + 6)
    jaw = s['parts']['snout'][1]
    return {'tails': tails, 'mark': rel(s['parts']['mark']), 'jaw': rel(jaw),
            'head': rel(head) + (17,), 'body': rel(body_c) + (round(body_r, 1),),
            'tail_paths': [[rel(q) for q in path] for path in s['tails']]}
