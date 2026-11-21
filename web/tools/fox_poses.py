"""Ninefold's poses for P2.1 (nextSteps.md): every frame as a few numbers on the skeleton in
fox_pose.py. Frame names are what the storyboard (dev/ninefold-storyboard/) and, once
approved, the game read. Angles in degrees; legs are (upper, lower), 0 straight down,
positive forward.
"""
import math
from fox_pose import pose, lerp_pose

SIT = pose(sho=(98, 104), hip=(120, 140), head=(90, 62), haunch=1,
           fl_far=(0, 0), fl_near=(-2, 2), hl_far=(70, -90), hl_near=(62, -95),
           tail_a=-62, spread=136)
STAND = pose(head=(68, 86), head_a=-4)


def walk(k):
    """A trot in four beats: diagonal pairs swing together."""
    s = math.sin(k / 4 * math.tau)
    return pose(head=(68, 88 + abs(s) * 2), head_a=-6, dy=-abs(s) * 2,
                fl_near=(22 * s, 22 * s - 18 * max(0, s)), hl_far=(15 + 20 * s, -15 + 20 * s - 18 * max(0, s)),
                fl_far=(-22 * s, -22 * s - 18 * max(0, -s)), hl_near=(15 - 20 * s, -15 - 20 * s - 18 * max(0, -s)),
                tail_a=-30, spread=90, wave=k * 1.6)


# The gallop, six frames: gather, push, stretch (airborne), front lands, collect, gather again.
RUN_KEYS = [
    dict(sho=(100, 112), hip=(140, 104), head=(74, 102), fl_far=(-30, -10), fl_near=(-20, 0),
         hl_far=(45, 10), hl_near=(55, 20), dy=2),
    dict(sho=(90, 112), hip=(152, 110), head=(64, 100), fl_far=(40, 10), fl_near=(25, 0),
         hl_far=(-20, -40), hl_near=(-35, -55), dy=0),
    dict(sho=(84, 106), hip=(160, 108), head=(58, 96), fl_far=(70, 40), fl_near=(60, 30),
         hl_far=(-60, -80), hl_near=(-70, -95), dy=-8),
    dict(sho=(88, 112), hip=(156, 104), head=(62, 104), fl_far=(25, -5), fl_near=(10, -10),
         hl_far=(-40, -70), hl_near=(-30, -60), dy=-2),
    dict(sho=(96, 114), hip=(148, 104), head=(70, 104), fl_far=(-15, -25), fl_near=(-30, -30),
         hl_far=(10, -20), hl_near=(25, 0), dy=0),
    dict(sho=(100, 113), hip=(142, 104), head=(74, 103), fl_far=(-35, -15), fl_near=(-25, -5),
         hl_far=(35, 5), hl_near=(45, 15), dy=1),
]


def run(k, tilt=0):
    return pose(**RUN_KEYS[k], head_a=-10, ears=1, tails='fan', tail_a=-14, spread=48,
                tail_len=.95, curl=-14, wave=k * 1.05, rot=tilt)


POSES = {
    'sit': SIT,
    'sit-blink': pose(**{**SIT, 'eye': 'shut'}),
    'sit-up': pose(**{**SIT, 'head': (92, 58), 'head_a': 16}),
    'sit-down': pose(**{**SIT, 'head': (88, 68), 'head_a': -16}),
    'sit-shift': pose(**{**SIT, 'dx': 2, 'fl_near': (4, 4), 'fl_far': (-4, -4)}),
    'sit-bristle': pose(**{**SIT, 'head': (82, 74), 'head_a': -12, 'ears': .8, 'spread': 160,
                           'tail_len': 1.06}),
    'stand': STAND,
    'rise': lerp_pose(SIT, STAND, .5),
    'crouch': pose(sho=(96, 128), hip=(146, 116), head=(70, 108), head_a=-8, ears=.6,
                   fl_far=(40, -20), fl_near=(45, -25), hl_far=(40, -40), hl_near=(45, -40),
                   tail_a=-50, spread=100),
    'leap': pose(sho=(90, 104), hip=(158, 112), head=(62, 90), head_a=10, ears=1,
                 fl_far=(80, 60), fl_near=(70, 50), hl_far=(-75, -95), hl_near=(-85, -105),
                 tail_a=4, spread=30, curl=-6, rot=24),
    'land': pose(sho=(90, 116), hip=(150, 100), head=(64, 104), head_a=-12, ears=.7,
                 fl_far=(20, -5), fl_near=(10, -10), hl_far=(-50, -80), hl_near=(-40, -70),
                 tail_a=-30, spread=50, rot=-8),
    'skid': pose(sho=(102, 114), hip=(148, 124), head=(78, 94), head_a=6, ears=.3,
                 fl_far=(38, 30), fl_near=(32, 26), hl_far=(30, -10), hl_near=(40, 0),
                 tail_a=-120, spread=110, curl=30, haunch=.5),
    'arch-0': pose(**{**SIT, 'sho': (100, 100), 'head': (92, 64), 'head_a': -10,
                      'tail_a': -110, 'spread': 70, 'curl': 40}),
    'arch-1': pose(**{**SIT, 'sho': (94, 106), 'head': (84, 70), 'head_a': 8,
                      'tail_a': -150, 'spread': 60, 'curl': 50, 'tail_len': 1.05}),
    'toss-0': pose(**{**SIT, 'head': (80, 80), 'head_a': -34, 'mouth': 1}),
    'toss-1': pose(**{**SIT, 'head': (92, 50), 'head_a': 36, 'mouth': 1}),
    'yelp': pose(**{**SIT, 'head': (104, 52), 'head_a': 58, 'mouth': 1, 'ears': 1,
                    'tail_a': -40, 'spread': 160, 'rot': 4}),
    'shake-0': pose(**{**STAND, 'head': (66, 84), 'head_a': -22, 'ears': 1, 'dx': -3,
                       'tail_a': -70, 'spread': 120, 'wave': 0}),
    'shake-1': pose(**{**STAND, 'head': (70, 88), 'head_a': 0, 'ears': 1, 'dx': 0,
                       'tail_a': -20, 'spread': 140, 'wave': 2}),
    'shake-2': pose(**{**STAND, 'head': (66, 84), 'head_a': 22, 'ears': 1, 'dx': 3,
                       'tail_a': -100, 'spread': 120, 'wave': 4}),
}
for k in range(4):
    POSES[f'walk-{k}'] = walk(k)
# Each cycle stays together: the engine steps through FP_RUN_0 + k, FP_RUN_UP_0 + k...
for tilt, name in ((0, 'run'), (25, 'run-up'), (-25, 'run-down')):   # up: the nose turned up
    for k in range(6):
        POSES[f'{name}-{k}'] = run(k, tilt=tilt)
for k in range(4):
    POSES[f'cocoon-{k}'] = pose(sho=(104, 120), hip=(132, 124), head=(92, 104), head_a=-30,
                                ears=1, fl_far=(50, -60), fl_near=(55, -65), hl_far=(60, -80),
                                hl_near=(65, -85), tails='wrap', wrap=k * 90, haunch=.6)
# R2 (added last so the earlier FP_* ids keep their numbers): an ear flick at a shot going
# by, and the foxfire's follow-through, licking its chops.
POSES['sit-flick'] = pose(**{**SIT, 'ears': .75, 'head_a': 4})
POSES['lick-0'] = pose(**{**SIT, 'head': (90, 60), 'head_a': 10, 'mouth': .5, 'tongue': 1})
POSES['lick-1'] = pose(**{**SIT, 'head': (90, 58), 'head_a': 14, 'mouth': .4, 'tongue': 2})
