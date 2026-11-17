"""Draft for approval (nextSteps.md P2.2): each zodiac sign's current P1 creature beside the
new mythological figure in its two poses (hold, strike), with its myth and key star.
Writes web/assets/bosses/draft-p2-zodiac-myth.png (git-ignored, not shipped)."""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import zodiac_art as old    # noqa: E402
import zodiac_myth as myth  # noqa: E402

SIGNS = [
    ('aries', 'Aries', 'Chrysomallos, the golden ram', 'Hamal, on the horn'),
    ('taurus', 'Taurus', 'Zeus as the bull of Europa (forepart)', 'Aldebaran, the red eye'),
    ('gemini', 'Gemini', 'Castor and Pollux, the Dioscuri', 'Pollux, the star over his head'),
    ('cancer', 'Cancer', 'Karkinos, sent by Hera against Heracles', 'Praesepe, on the shell'),
    ('leo', 'Leo', 'The Nemean lion', 'Regulus, the heart'),
    ('virgo', 'Virgo', 'Astraea, winged maiden of justice', 'Spica, the ear of wheat'),
    ('libra', 'Libra', "The balance in the Scorpion's claws", 'Zubenelgenubi, the near pan'),
    ('scorpius', 'Scorpius', 'The scorpion sent against Orion', 'Antares, the red heart'),
    ('sagittarius', 'Sagittarius', 'The centaur archer', 'Alnasl, the arrowhead'),
    ('capricornus', 'Capricornus', 'Pan as the sea-goat', 'Deneb Algedi, the tail'),
    ('aquarius', 'Aquarius', 'Ganymede, cupbearer of the gods', 'Sadalmelik, the shoulder'),
    ('pisces', 'Pisces', 'Aphrodite and Eros as two fish', 'Alrescha, the knot'),
]
SCALE = 2
CELL = (172, 140)          # one figure, before scaling
BG, PANEL, INK, DIM, GOLD = (20, 10, 34), (34, 18, 48), (238, 242, 255), (150, 160, 200), (255, 200, 138)


def font(size):
    for name in ('/System/Library/Fonts/Avenir Next.ttc', '/System/Library/Fonts/Helvetica.ttc'):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            pass
    return ImageFont.load_default()


def main():
    current = [img for img, _ in old.sign_cells()[:12]]
    cw, ch = CELL[0] * SCALE, CELL[1] * SCALE
    head = 64
    block_w = cw * 3 + 24
    block_h = ch + head + 20
    cols = 2
    W = block_w * cols + 24 * (cols + 1)
    H = 110 + block_h * 6 + 24 * 6
    out = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(out)
    d.text((24, 22), 'P2.2 draft: the zodiac after the classical star atlases', font=font(34), fill=GOLD)
    d.text((24, 66), 'Each sign: the current P1 creature (dim), then the new figure holding its atlas pose and striking. '
                     'Key star marked white.', font=font(18), fill=DIM)
    for i, (key, name, story, star) in enumerate(SIGNS):
        bx = 24 + (i % cols) * (block_w + 24)
        by = 110 + (i // cols) * (block_h + 24)
        d.rectangle((bx, by, bx + block_w, by + block_h), fill=PANEL)
        d.text((bx + 12, by + 8), name.upper(), font=font(26), fill=INK)
        d.text((bx + 12, by + 38), f'{story} · key: {star}', font=font(16), fill=DIM)
        hold, _ = myth.FIGURES[key]('hold')
        strike, _ = myth.FIGURES[key]('strike')
        for k, (label, img) in enumerate((('now', current[i]), ('hold', hold), ('strike', strike))):
            x0, y0 = bx + 8 + k * (cw + 4), by + head
            tile = Image.new('RGBA', CELL, (46, 22, 40, 255))
            tile.alpha_composite(img.convert('RGBA'), ((CELL[0] - img.width) // 2, (CELL[1] - img.height) // 2))
            if k == 0:
                tile = Image.blend(Image.new('RGBA', CELL, (46, 22, 40, 255)), tile, .75)
            out.paste(tile.resize((cw, ch), Image.NEAREST), (x0, y0))
            d.text((x0 + 8, y0 + ch - 24), label, font=font(16), fill=GOLD if k else DIM)
    path = HERE.parent / 'assets' / 'bosses' / 'draft-p2-zodiac-myth.png'
    out.save(path, optimize=True)
    print(path, out.size)


if __name__ == '__main__':
    main()
