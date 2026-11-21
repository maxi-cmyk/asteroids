// The field guide: Ninefold (one entry of GUIDE, src/boss/guide.mjs).
import { ATTACK, SHOT } from '../scene.mjs';

export default {
    kind: 11,
    death: 'It sheds its tails one by one in puffs of stars, then dissolves.',
    mechanic:
        'Nine tails are its health: every hit on a tail reaches the fox, and a tail falls with each ninth of its health. Losing a tail, or popping both illusions, opens the forehead mark for 2.5 s. It moves like a fox: between attacks it trots or gallops to another perch, and it always sits down before it attacks.',
    attacks: [
        {
            id: ATTACK.comets,
            name: 'Tail comets',
            phase: 1,
            at: 950,
            tell: 'It arches its tails up over its back; red aim lines from the tips, 500 ms',
            text: 'The tails whip forward one after another, a comet from each tip: fewer tails, fewer comets, but faster.',
            counter: 'Step off each line.',
            release: ['shot', SHOT.fast],
        },
        {
            id: ATTACK.foxfire,
            name: 'Foxfire',
            phase: 1,
            at: 1000,
            tell: 'It ducks and scoops; foxfire gathers in its jaws, 700 ms',
            text: 'A toss of its head throws three slow homing wisps.',
            counter: 'Two shots put one out.',
            release: ['shot', SHOT.missile],
        },
        {
            id: ATTACK.illusion,
            name: 'Illusion',
            phase: 1,
            at: 1500,
            tell: 'It spins into a cocoon of tails and shrinks, 600 ms',
            text: 'The cocoon bursts and three smaller foxes run to their places, each at its own pace; only the real fox has lit eyes. Each decoy fires one needle.',
            counter: 'Pop both decoys to open the forehead.',
            release: ['shot', SHOT.needle],
        },
        {
            id: ATTACK.foxBlink,
            name: 'Blink',
            phase: 1,
            at: 700,
            tell: 'It crouches and wiggles its rear, 500 ms',
            text: 'It leaps, dissolves into stars at the top, and lands on another perch.',
            counter: 'Hold fire while it is gone; re-aim when it lands.',
            release: ['shot', SHOT.fast],
        },
    ],
};
