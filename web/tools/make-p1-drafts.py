"""Draft sheet for approval (nextSteps.md P1): the star-fill look on the Zodiarch, Ninefold
and all twelve zodiac creatures, plus one sign's transformation. Not loaded by the game.

    python3 web/tools/make-p1-drafts.py   ->  web/assets/bosses/draft-p1-starfill.png

All shapes are original, drawn from primitives; the reference images in assets/inspo are
mood only.
"""
import math
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageOps

sys.path.insert(0, str(Path(__file__).resolve().parent))
from zodiac_art import *  # noqa: F401,F403,E402

OUT = Path(__file__).resolve().parents[1] / 'assets' / 'bosses' / 'draft-p1-starfill.png'


# ------------------------------------------------------------------ transformation strip
SAG_STARS = [(0.1, .9), (.45, .5), (.9, .1), (.3, .2), (.7, .8)]
SAG_LINES = [(0, 1), (1, 2), (3, 1), (1, 4)]


def transform_strip(creature, rim, frames=(0, .35, .7, 1), cell=(110, 100)):
    """Constellation -> creature: stars slide from the sign's points to points on the
    creature's outline, then the star-filled sprite fades in."""
    alpha = creature.getchannel('A')
    pts = [(x, y) for y in range(0, creature.height, 5) for x in range(0, creature.width, 5) if alpha.getpixel((x, y)) > 0]
    edge = pts[:: max(1, len(pts) // len(SAG_STARS))][:len(SAG_STARS)]
    out = Image.new('RGBA', (cell[0] * len(frames), cell[1]), (0, 0, 0, 0))
    ox, oy = (cell[0] - creature.width) // 2, (cell[1] - creature.height) // 2
    for k, t in enumerate(frames):
        layer = Image.new('RGBA', cell, (0, 0, 0, 0))
        d = ImageDraw.Draw(layer)
        src = [(14 + x * 80, 8 + y * 80) for x, y in SAG_STARS]
        dst = [(ox + x, oy + y) for x, y in edge]
        e = 1 - (1 - min(1, t / .7)) ** 2
        now = [(a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e) for a, b in zip(src, dst)]
        if t < .7:
            for a, b in SAG_LINES:
                d.line([now[a], now[b]], fill=rim + (int(255 * (1 - t / .7)),), width=1)
        if t > .55:
            fade = min(1, (t - .55) / .45)
            c = creature.copy()
            c.putalpha(c.getchannel('A').point(lambda v: int(v * fade)))
            layer.alpha_composite(c, (ox, oy))
        for x, y in now:
            d.rectangle((round(x) - 1, round(y), round(x) + 1, round(y)), fill=(255, 255, 255, 255))
            d.rectangle((round(x), round(y) - 1, round(x), round(y) + 1), fill=(255, 255, 255, 255))
        out.alpha_composite(layer, (k * cell[0], 0))
    return out


# ------------------------------------------------------------------ the sheet
def backdrop(size):
    import random
    img = Image.new('RGBA', size, (10, 8, 26, 255))
    d = ImageDraw.Draw(img)
    r = random.Random(4)
    for _ in range(size[0] * size[1] // 300):
        d.point((r.randrange(size[0]), r.randrange(size[1])), fill=r.choice([(60, 60, 100), (100, 100, 140), (50, 40, 80)]))
    return img


def label(d, xy, text, size=14, fill=(230, 220, 255)):
    try:
        f = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', size)
    except OSError:
        f = ImageFont.load_default()
    d.text(xy, text, fill=fill, font=f)


def up(im, k):
    return im.resize((int(im.width * k), int(im.height * k)), Image.NEAREST)


def main():
    W, H = 1100, 1560
    sheet = backdrop((W, H))
    d = ImageDraw.Draw(sheet)
    label(d, (16, 10), 'P1 DRAFT v2 - star-fill look (for approval, not in game)', 18, GOLD)

    # 1. Zodiarch in a 480x270 field at 2x, with a player ship marker for scale.
    field = backdrop((480, 270))
    fd = ImageDraw.Draw(field)
    for i in range(12):
        a = i / 12 * math.tau
        x, y = 360 + 100 * math.cos(a), 135 + 95 * math.sin(a)
        fd.rectangle((x - 1, y - 1, x + 1, y + 1), fill=(120, 110, 200, 255))
    field.alpha_composite(zodiarch_assembled())
    fd.polygon([(40, 135), (28, 129), (28, 141)], fill=(112, 217, 237, 255))
    sheet.alpha_composite(up(field, 2), (16, 40))
    label(d, (16, 584), 'ZODIARCH in a 480x270 field (2x): wider body (20 -> 10 px), big spiked tail fan, pearl = weak point.')

    # 2. Head frames and Ninefold.
    y = 616
    for i, im in enumerate([dragon_head(open_mouth=False), dragon_head(open_mouth=True)]):
        sheet.alpha_composite(up(im, 2), (16 + i * 250, y))
    label(d, (16, y + 172), 'Head: closed / open (2x)')
    sheet.alpha_composite(up(ninefold(), 1.5), (560, y - 10))
    label(d, (570, y + 288), 'NINEFOLD (1.5x): hind leg folded at its side, paw forward;')
    label(d, (570, y + 306), 'nine tails; forehead mark = weak point')

    # 3. The twelve signs at 1.5x.
    y = 950
    label(d, (16, y), 'The twelve sign creatures (1.5x), each with its weak-point star', 14, GOLD)
    for i, (name, fn) in enumerate(SIGNS):
        im = up(fn(), 1.5)
        cx, cy = 16 + (i % 6) * 180, y + 26 + (i // 6) * 190
        sheet.alpha_composite(im, (cx + (170 - im.width) // 2, cy + (150 - im.height)))
        label(d, (cx + 4, cy + 156), name, 12, (200, 190, 230))

    # 4. Sagittarius transforming.
    strip = up(transform_strip(centaur(), (255, 170, 210)), 1.5)
    sheet.alpha_composite(strip, (16, H - strip.height - 34))
    label(d, (16, H - 28), 'Sagittarius transforming: constellation -> creature (1.5x)', 12, (200, 190, 230))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.convert('RGB').save(OUT, optimize=True)
    print(OUT, sheet.size)


if __name__ == '__main__':
    main()
