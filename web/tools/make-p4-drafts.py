"""Draft art for the P4 storyboards (nextSteps.md P4): the parts each boss needs to move,
drawn with the game's own facet painter so they match the shipped sheets.
    python3 web/tools/make-p4-drafts.py [sentinel ...]
Writes assets/bosses/draft-p4-<boss>.png and .json. Draft sheets never ship (the build skips
assets/bosses/draft-*); they are for approval first.
"""
import importlib.util
import math
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import boss_sprites as bs  # noqa: E402
from boss_facets import CHAR, FIRE, HALO, INK, STEEL, Canvas  # noqa: E402

spec = importlib.util.spec_from_file_location('make_bosses', HERE / 'make-bosses.py')
make_bosses = importlib.util.module_from_spec(spec)
spec.loader.exec_module(make_bosses)


# ------------------------------------------------------------------ P4.1 Sentinel
# The shell (spikes, ring, socket) without the eye, so the eye can roll in its socket; the
# eye in three moods; the brows; each plate turned through eight steps for the throw.
def sentinel():
    """Built since (2026-11-19): the parts now ship in the frontier sheet (sentinel_parts)."""
    sh = make_bosses.Sheet()
    for name, im in bs.sentinel_parts().items():
        sh.add(f'sent-{name}', im)
    return sh


# ------------------------------------------------------------------ P4.3 Cinderforge
# The furnace golem, in parts so it can move: the torso (a kiln with a head and chimney, the
# furnace mouth dark), the two chest doors, the core, the bellows at four fills, and two
# arms hanging from their shoulder (the pivot is the frame centre) with a hammer and a ladle.
# Plus the two other concepts, whole: a smelter on piston legs and a heart caged in chains.
G = 300           # the concepts' frame


def cinderforge():
    """Built since (2026-11-19): the golem's parts now ship in the ember sheet (golem_parts);
    the two concepts not chosen are kept here for the record."""
    sh = make_bosses.Sheet()
    for name, im in bs.golem_parts().items():
        sh.add(f'golem-{name}', im)
    for vent in (0, 1):
        sh.add(f'smelter-{vent}', _smelter(vent))
        sh.add(f'caged-{vent}', _caged(vent))
    return sh


def _smelter(vent):
    """Concept B: a crucible tank on two heavy piston legs, a pouring spout in front."""
    c = Canvas(G, G, seed=71)
    cx, cy = G / 2, G / 2 - 20
    for sx in (-1, 1):                                              # legs
        hip, knee, foot = (cx + sx * 34, cy + 40), (cx + sx * 58, cy + 84), (cx + sx * 44, cy + 128)
        c.facet([(hip[0] - 9, hip[1]), (hip[0] + 9, hip[1]), (knee[0] + 8, knee[1]), (knee[0] - 8, knee[1])], CHAR, 2, .06)
        c.facet([(knee[0] - 7, knee[1]), (knee[0] + 7, knee[1]), (foot[0] + 6, foot[1]), (foot[0] - 6, foot[1])], STEEL, 2, .06)
        c.facet([(foot[0] - 20, foot[1]), (foot[0] + 20, foot[1]), (foot[0] + 16, foot[1] + 10), (foot[0] - 16, foot[1] + 10)], CHAR, 3, .04)
    bs.fan_facets(c, cx, cy, 60, 52, 14, CHAR, bias=.1, speckle=.08)
    c.facet([(cx - 66, cy - 8), (cx - 96, cy - 20), (cx - 96, cy - 8), (cx - 66, cy + 6)], CHAR, 3, .05)
    lid = -26 if vent else 0
    c.facet([(cx - 50, cy - 46 + lid), (cx + 50, cy - 46 + lid), (cx + 40, cy - 60 + lid), (cx - 40, cy - 60 + lid)], CHAR, 4, .05)
    if vent:
        bs.fan_facets(c, cx, cy - 40, 40, 10, 10, HALO, bias=1, speckle=.1)
    for k in range(4):
        c.px_block(cx - 24 + k * 16, cy + 10, FIRE[3] if k < 2 + vent * 2 else INK, 2, 2)
    return c.finish()


def _caged(vent):
    """Concept C: a molten heart in a cage of iron bars, chained out of the field."""
    c = Canvas(G, G, seed=81)
    cx = cy = G / 2
    for sy in (-1, 1):                                              # chains up and down
        for k in range(6):
            y = cy + sy * (70 + k * 14)
            c.facet([(cx - 5, y - 6), (cx + 5, y - 6), (cx + 5, y + 6), (cx - 5, y + 6)], STEEL, 2 + k % 2, .04)
    bs.fan_facets(c, cx, cy, 40, 40, 14, HALO, bias=.5 + .8 * vent, speckle=.1)
    spread = 22 if vent else 0
    for k in range(8):
        a = k * math.tau / 8
        sx = math.copysign(spread, math.cos(a)) if abs(math.cos(a)) > .3 else 0
        x0 = cx + math.cos(a) * 56 + sx
        top, bot = cy - 60, cy + 60
        c.line([(x0, top + abs(math.sin(a)) * 20), (x0, bot - abs(math.sin(a)) * 20)], CHAR[3], 2)
    for sy in (-1, 1):
        bs.fan_facets(c, cx, cy + sy * 62, 50 + (spread if vent else 0), 10, 10, CHAR, bias=.2, speckle=.05)
    return c.finish()


# ------------------------------------------------------------------ P4.4 Bastion
# Its new weak point: an engine nacelle on each flank, intake to the bow (lit while it
# runs), nozzle to the stern. Drawn for the top flank; the bottom one is the same flipped.
def bastion():
    """Built since (2026-11-19): the engines now ship in the ruins sheet (bastion_engine)."""
    sh = make_bosses.Sheet()
    sh.add('engine', bs.bastion_engine(0))
    sh.add('engine-dead', bs.bastion_engine(1))
    return sh


DRAFTS = {'bastion': bastion, 'sentinel': sentinel, 'cinderforge': cinderforge}

if __name__ == '__main__':
    for name in sys.argv[1:] or DRAFTS:
        sheet = DRAFTS[name]()
        print('wrote', sheet.save(f'draft-p4-{name}'), len(sheet.cells), 'cells')
