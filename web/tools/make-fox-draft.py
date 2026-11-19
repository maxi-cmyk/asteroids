"""Builds assets/bosses/draft-p21-fox.png and .json: every Ninefold pose from fox_poses.py,
for the P2.1 storyboard (dev/ninefold-storyboard.html). A draft sheet, never shipped (the
build skips assets/bosses/draft-*). Decoys get the same poses with unlit eyes.
    python3 web/tools/make-fox-draft.py
"""
import importlib.util
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
from fox_pose import render  # noqa: E402
from fox_poses import POSES  # noqa: E402

spec = importlib.util.spec_from_file_location('make_bosses', HERE / 'make-bosses.py')
make_bosses = importlib.util.module_from_spec(spec)
spec.loader.exec_module(make_bosses)

sheet = make_bosses.Sheet()
for name, p in POSES.items():
    sheet.add(f'fox-{name}', render(p))
    if name.startswith(('sit', 'run-', 'stand', 'skid')):
        sheet.add(f'fox-decoy-{name}', render(p, eyes_lit=False))
print('wrote', sheet.save('draft-p21-fox'), len(sheet.cells), 'cells')
