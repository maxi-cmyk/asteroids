"""Builds web/assets/bosses/*.png and *.json: the sprites of the six region bosses and
six mini-bosses, one sheet per region (loaded when that region is first reached), plus
a shared sheet of hostile projectiles.

Needs Pillow + NumPy (fontTools and brotli are only used by the concept sheets):
    python3 -m venv v && v/bin/pip install pillow numpy fonttools brotli
    v/bin/python web/tools/make-bosses.py

Every sprite is drawn in the game's 8-bit style (one 1 px grid, six-shade palettes,
ordered dither, hard alpha, 2 px outline); see boss_art.py. Each cell is cropped to
its opaque pixels and records where it sits in the original frame (ox, oy inside
W x H), so the renderer places a frame by the body's centre. Damage is two overlay
cells per boss (cracked, critical) drawn over any frame.
"""
import json
import math
import random
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from boss_sprites import *  # noqa: F401,F403,E402

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'bosses'
SHEET_WIDTH = 1024
SECTION = {'frontier': 'frontier', 'violet': 'violet', 'ember': 'ember', 'ruins': 'ruins', 'lunar': 'lunar', 'rift': 'rift'}


class Sheet:
    """Shelf-packs cropped cells and remembers their frame geometry."""
    def __init__(self):
        self.cells = []

    def add(self, name, img):
        img = img.convert('RGBA')
        box = img.getchannel('A').point(lambda v: 255 if v else 0).getbbox()
        if box is None:
            box = (0, 0, 1, 1)
        self.cells.append((name, img.crop(box), box[0], box[1], img.width, img.height))

    def save(self, stem):
        x = y = shelf = 0
        placed = []
        for name, crop, ox, oy, W, H in sorted(self.cells, key=lambda c: -c[1].height):
            if x + crop.width + 1 > SHEET_WIDTH:
                x, y, shelf = 0, y + shelf + 1, 0
            placed.append((name, crop, x, y, ox, oy, W, H))
            x += crop.width + 1
            shelf = max(shelf, crop.height)
        height = y + shelf + 1
        sheet = Image.new('RGBA', (SHEET_WIDTH, height), (0, 0, 0, 0))
        meta = {}
        for name, crop, px, py, ox, oy, W, H in placed:
            sheet.paste(crop, (px, py))
            meta[name] = {'x': px, 'y': py, 'w': crop.width, 'h': crop.height, 'ox': ox, 'oy': oy, 'W': W, 'H': H}
        OUT.mkdir(parents=True, exist_ok=True)
        sheet.save(OUT / f'{stem}.png', optimize=True)
        (OUT / f'{stem}.json').write_text(json.dumps(meta, sort_keys=True, separators=(',', ':')))
        return sheet.size


def alpha(img):
    return np.asarray(img)[..., 3] > 0


def overlay(size, frames, level, seed, q=4):
    """Cracks (level 1) and cracks, scorch and glowing fissures (level 2) on the same
    chunky grid as the sprites, clipped to the pixels every frame shares so the damage
    never floats off a moving plate."""
    W, H = size
    lw, lh = (W + q - 1) // q, (H + q - 1) // q
    mask = np.ones((lh, lw), bool)
    for f in frames:
        sample = alpha(f)[q // 2::q, q // 2::q][:lh, :lw]
        mask &= np.pad(sample, ((0, lh - sample.shape[0]), (0, lw - sample.shape[1])))
    mask = erode(mask, 1)
    out = np.zeros((lh, lw, 4), np.uint8)
    if mask.any():
        rng = random.Random(seed)
        ys, xs = np.nonzero(mask)
        scale = max(W, H) / 220
        img = Image.new('L', (lw, lh), 0)
        glow = Image.new('L', (lw, lh), 0)
        d, g = ImageDraw.Draw(img), ImageDraw.Draw(glow)
        for _ in range(int((5 if level == 1 else 10) * max(.6, scale))):
            i = rng.randrange(len(xs))
            x, y, ang = float(xs[i]), float(ys[i]), rng.random() * math.tau
            pts = [(x, y)]
            for _ in range(rng.randint(4, 9)):
                ang += rng.uniform(-.8, .8)
                step = rng.uniform(1.5, 3.2)
                x += math.cos(ang) * step
                y += math.sin(ang) * step
                pts.append((x, y))
            d.line(pts, fill=255, width=1)
            g.line([(px + 1, py + 1) for px, py in pts], fill=255, width=1)
        crack, fissure = np.asarray(img) > 0, np.asarray(glow) > 0
        out[crack, :3] = INK
        out[crack, 3] = 255
        if level == 2:
            lit_ = fissure & ~crack
            out[lit_, :3] = (255, 140, 40)
            out[lit_, 3] = 255
            gy, gx = np.mgrid[0:lh, 0:lw]
            for _ in range(int(4 * max(.6, scale))):
                i = rng.randrange(len(xs))
                blot = (np.hypot(gx - xs[i], gy - ys[i]) < rng.uniform(2, 4)) & ((gx + gy) % 2 == 0) & (out[..., 3] == 0)
                out[blot, :3] = (24, 12, 16)
                out[blot, 3] = 255
        out[~mask] = 0
    return Image.fromarray(out, 'RGBA').resize((lw * q, lh * q), Image.NEAREST).crop((0, 0, W, H))


def star_overlay(size, frames, level, seed, q=1):
    """Damage for the star-filled rift bodies, whose dark navy hides ink cracks. The body tears
    along thin fissures that light leaks through (pale pink at level 1; hotter, wider and more
    of them at level 2, where patches of stars have also gone dark). Clipped to the pixels
    every frame shares; the fissures are 1 px lines, as fine as the constellation lines."""
    W, H = size
    lw, lh = (W + q - 1) // q, (H + q - 1) // q
    mask = np.ones((lh, lw), bool)
    for f in frames:
        sample = alpha(f)[q // 2::q, q // 2::q][:lh, :lw]
        mask &= np.pad(sample, ((0, lh - sample.shape[0]), (0, lw - sample.shape[1])))
    mask = erode(mask, 4)
    out = np.zeros((lh, lw, 4), np.uint8)
    if mask.any():
        rng = random.Random(seed)
        ys, xs = np.nonzero(mask)
        gy, gx = np.mgrid[0:lh, 0:lw]
        if level == 2:   # stars gone out: soft dark patches, solid (no checker)
            for _ in range(3):
                i = rng.randrange(len(xs))
                r = rng.uniform(7, 12)
                d = np.hypot(gx - xs[i], (gy - ys[i]) * 1.2)
                patch = mask & (d < r)
                out[patch, :3] = (6, 8, 26)
                out[patch, 3] = np.where(d[patch] < r * .6, 200, 120)
        img = Image.new('L', (lw, lh), 0)
        d = ImageDraw.Draw(img)
        size_k = min(1, max(W, H) / 120)   # fewer, shorter fissures on a small body segment
        for _ in range(max(1, round((4 if level == 1 else 8) * size_k))):
            i = rng.randrange(len(xs))
            x, y, ang = float(xs[i]), float(ys[i]), rng.random() * math.tau
            pts = [(x, y)]
            for _ in range(max(3, round(rng.randint(5, 10) * size_k))):
                ang += rng.uniform(-.7, .7)
                x += math.cos(ang) * rng.uniform(4, 7)
                y += math.sin(ang) * rng.uniform(4, 7)
                pts.append((x, y))
                if rng.random() < .25:   # a short branch
                    b = ang + rng.choice((-1, 1)) * rng.uniform(.6, 1.1)
                    d.line([(x, y), (x + math.cos(b) * 6, y + math.sin(b) * 6)], fill=255, width=1)
            d.line(pts, fill=255, width=1)
        core = np.asarray(img) > 0
        halo = dilate(core, 1) & ~core
        edge = (255, 150, 205) if level == 2 else (240, 190, 230)
        out[halo, :3] = edge
        out[halo, 3] = 230 if level == 2 else 170
        out[core, :3] = (255, 240, 250) if level == 2 else (20, 10, 34)
        out[core, 3] = 255
        out[~mask] = 0
    return Image.fromarray(out, 'RGBA').resize((lw * q, lh * q), Image.NEAREST).crop((0, 0, W, H))


def with_star_damage(sheet, stem, frames, size, seed):
    for level in (1, 2):
        sheet.add(f'{stem}-d{level}', star_overlay(size, frames, level, seed + level))


def with_damage(sheet, stem, frames, size, seed):
    for level in (1, 2):
        sheet.add(f'{stem}-d{level}', overlay(size, frames, level, seed + level))


# ------------------------------------------------------------------ region sheets
def frontier():
    sh = Sheet()
    sent = [sentinel(o, 0) for o in (0, 1 / 3, 2 / 3, 1)]
    for i, im in enumerate(sent):
        sh.add(f'sentinel-{i}', im)
    for k in range(4):
        sh.add(f'sentinel-plate-{k}', sentinel(0, 0, only=k))
    for name, im in sentinel_parts().items():                     # the living eye (P4.1)
        sh.add(f'sentinel-{name}', im)
    with_damage(sh, 'sentinel', [sent[0], sent[3]], (220, 220), 10)
    pick = [picket_gate(o, 0) for o in (0, .5, 1)]
    for i, im in enumerate(pick):
        sh.add(f'picket-{i}', im)
    with_damage(sh, 'picket', pick, (150, 150), 20)
    return sh


def violet():
    sh = Sheet()
    cores = [ringwarden_core(0), ringwarden_core(1)]
    for i, im in enumerate(cores):
        sh.add(f'ringwarden-core-{i}', im)
    with_damage(sh, 'ringwarden', cores, (150, 150), 30)
    for k in range(16):
        sh.add(f'blade-outer-{k}', ice_blade(k, 42, 15, 100))
        sh.add(f'blade-inner-{k}', ice_blade(k, 32, 13, 80))
    cores = [shardling_core(0), shardling_core(1)]
    for i, im in enumerate(cores):
        sh.add(f'shardling-{i}', im)
    with_damage(sh, 'shardling', cores, (110, 110), 40)
    return sh


def ember():
    sh = Sheet()
    for name, im in golem_parts().items():                        # the furnace golem (P4.3)
        sh.add(f'golem-{name}', im)
    whole = golem_whole()
    sh.add('golem-whole', whole)
    with_damage(sh, 'golem', [whole], (300, 300), 50)
    ling = [cinderling(.4), cinderling(.9, open_cells=[(1, 1), (2, 1), (1, 2), (2, 2)])]
    for i, im in enumerate(ling):
        sh.add(f'cinderling-{i}', im)
    with_damage(sh, 'cinderling', ling, (150, 150), 60)
    return sh


def ruins():
    sh = Sheet()
    layers = bastion_layers()
    for name, im in layers.items():
        sh.add(f'bastion-{name.replace("_", "-")}', im)
    with_damage(sh, 'bastion', [layers['hull']], (340, 196), 70)
    sh.add('bastion-engine', bastion_engine(0))                   # the weak point (P4.4)
    sh.add('bastion-engine-dead', bastion_engine(1))
    gun = [gunnery_hull(0), gunnery_hull(1)]
    for i, im in enumerate(gun):
        sh.add(f'gunnery-{i}', im)
    with_damage(sh, 'gunnery', gun, (200, 108), 80)
    return sh


def lunar():
    sh = Sheet()
    tide = {}
    for k in range(4):
        for g in (0, 1):
            tide[(k, g)] = tidecaller(phase=k * math.tau / 2.2 / 4, bubbles=0, glow=g)
            sh.add(f'tide-{k}-{g}', tide[(k, g)])
    with_damage(sh, 'tide', list(tide.values())[:4], (230, 290), 90)
    jelly = [moonjelly(phase=k * math.tau / 2.2 / 4) for k in range(4)]
    for k, im in enumerate(jelly):
        sh.add(f'moonjelly-{k}', im)
    with_damage(sh, 'moonjelly', jelly, (150, 190), 100)
    return sh


def rift():
    """The rift: the Zodiarch (a star-fill dragon, its pearl and the twelve sign creatures it
    throws) and its herald Ninefold. Drawn by zodiac_art.py (design: nextSteps.md P1)."""
    import zodiac_art as zod
    sh = Sheet()
    dragon = zod.dragon_cells()
    for name, im in dragon.items():
        sh.add(name, im)
    with_star_damage(sh, 'zod-head', [dragon['zod-head-0'], dragon['zod-head-1']], (120, 84), 110)
    # The head turned (nextSteps.md P3.1): pre-rotated nearest-neighbour in 22.5-degree steps
    # from -90 to +90 off facing left, about the head's point on the trail (24 px behind the
    # frame centre), so the pixels stay crisp; facing right the renderer mirrors these. Frames
    # are 200 x 200 with that point at the centre. Damage overlays turn with them.
    heads = {'zod-head-0': dragon['zod-head-0'], 'zod-head-1': dragon['zod-head-1'],
             'zod-head-d1': star_overlay((120, 84), [dragon['zod-head-0'], dragon['zod-head-1']], 1, 111),
             'zod-head-d2': star_overlay((120, 84), [dragon['zod-head-0'], dragon['zod-head-1']], 2, 112)}
    for stem, im in heads.items():
        for k in range(-4, 5):
            frame = Image.new('RGBA', (200, 200), (0, 0, 0, 0))
            frame.paste(im, (100 - 84, 100 - 42), im)
            sh.add(f'{stem}-r{k}', frame.rotate(-22.5 * k, resample=Image.NEAREST, center=(100, 100)))
    for r in zod.SEGMENT_RADII:   # the body tears too, a segment at a time
        with_star_damage(sh, f'zod-seg-{r}', [dragon[f'zod-seg-{r}-0'], dragon[f'zod-seg-{r}-1']], (56, 56), 130 + r)
    # The twelve creatures after the classical star-atlas figures (P2.2): hold and strike
    # frames, Gemini and Pisces as one figure per creature (they split in the fight).
    import zodiac_myth
    for name, im in zodiac_myth.game_cells()[0].items():
        sh.add(name, im)
    # Ninefold (P2.1): every pose from the posable fox, body and tails apart, full size and
    # at 0.6; also writes the pose tables the engine and renderer share.
    import fox_game
    fox_game.build(sh)
    for i, rgb in enumerate([(154, 208, 255), (255, 233, 160), (255, 176, 112), (255, 255, 255)]):
        sh.add(f'star-{i}', star_sprite(rgb))
    return sh


# ------------------------------------------------------------------ projectiles
def shots():
    sh = Sheet()

    def canvas(n):
        return Image.new('RGBA', (n, n), (0, 0, 0, 0))

    def draw(kind, n, t=0):
        im = canvas(n)
        projectile(im, n // 2, n // 2, kind, t)
        return im
    sh.add('needle', draw('needle', 9))
    sh.add('shard', draw('shard', 11))
    sh.add('bolt', draw('bolt', 15))
    sh.add('sine', draw('sine', 13))
    sh.add('pellet', draw('spiral', 9))
    sh.add('missile', draw('missile', 17))
    sh.add('mine-0', draw('mine', 19, 0))
    sh.add('mine-1', draw('mine', 19, 1 / 6))
    sh.add('lob-0', draw('lob', 15))
    sh.add('bubble', draw('bubble', 36))
    # fast shards: a longer, brighter diamond so the aim line reads
    f = canvas(15); d = ImageDraw.Draw(f)
    d.polygon([(1, 7), (7, 4), (13, 7), (7, 10)], fill=INK + (255,))
    d.polygon([(3, 7), (7, 5), (11, 7), (7, 9)], fill=(255, 220, 190, 255)); d.point((7, 7), fill=(255, 255, 255, 255))
    sh.add('fast', f)
    for i, rgb in enumerate([(255, 140, 70), (255, 214, 120)]):               # embers, two flicker frames
        e = canvas(9); d = ImageDraw.Draw(e)
        d.ellipse((1, 1, 7, 7), fill=INK + (255,)); d.ellipse((2, 2, 6, 6), fill=rgb + (255,)); d.point((3, 3), fill=(255, 250, 220, 255))
        sh.add(f'ember-{i}', e)
    c = canvas(11); d = ImageDraw.Draw(c)
    d.ellipse((0, 0, 10, 10), fill=INK + (255,)); d.ellipse((1, 1, 9, 9), fill=(255, 120, 230, 255)); d.ellipse((2, 2, 4, 4), fill=(255, 255, 255, 255))
    sh.add('curve', c)
    for frame in (0, 1):                                                      # spore cloud: dithered, white rim
        s = Px((42, 42)); cx = cy = 21
        s.fill(ellipse((42, 42), cx, cy, 18), P_TEAL, outline=(255, 255, 255), ow=1, radial=(cx, cy, 18), bias=.05 + .08 * frame, tex=.12 * np.sin(np.mgrid[0:42, 0:42][1] * .8 + frame * 2))
        for dx, dy in ((-6, -5), (5, -7), (-2, 5), (7, 4)):
            s.flat(ellipse((42, 42), cx + dx, cy + dy + frame, 3), (190, 255, 240))
        sh.add(f'spore-{frame}', s.img())
    for i in range(3):                                                        # bubble pop sparkles
        im = canvas(36); d = ImageDraw.Draw(im)
        r = 6 + i * 6
        for a in range(0, 360, 45):
            x = 18 + math.cos(math.radians(a)) * r; y = 18 + math.sin(math.radians(a)) * r
            d.rectangle((x - 1, y - 1, x, y), fill=(255, 255, 255, 255 - i * 70))
        sh.add(f'pop-{i}', im)
    return sh


SHEETS = (('frontier', frontier), ('violet', violet), ('ember', ember), ('ruins', ruins),
          ('lunar', lunar), ('rift', rift), ('shots', shots))


def main():
    # `make-bosses.py ruins rift` rebuilds only those sheets (the others are not byte-stable
    # across library versions, so leave them alone unless they changed).
    only = set(sys.argv[1:])
    for stem, build in SHEETS:
        if only and stem not in only:
            continue
        print(stem, build().save(stem))


if __name__ == '__main__':
    main()
