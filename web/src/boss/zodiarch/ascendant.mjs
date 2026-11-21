// Ascendant (nextSteps.md R2): the sign of a date by the tropical zodiac, 0 Aries .. 11 Pisces.
// The Zodiarch throws it first, with one more hit on its key star (web_ascendant).
// Each sign starts on [month (1-12), day]; Capricorn wraps the new year.
const STARTS = [
    [3, 21],
    [4, 20],
    [5, 21],
    [6, 21],
    [7, 23],
    [8, 23],
    [9, 23],
    [10, 23],
    [11, 22],
    [12, 22],
    [1, 20],
    [2, 19],
];
// Days are counted from 1 March (31 per month is enough to order them); a date takes the
// latest start it has passed, and 1 to 20 March, before Aries, are still Pisces.
const day = (month, date) => ((month - 3 + 12) % 12) * 31 + date;
export function ascendantSign(date = new Date()) {
    const now = day(date.getMonth() + 1, date.getDate());
    let best = 11,
        passed = -1;
    STARTS.forEach(([m, d], s) => {
        if (day(m, d) <= now && day(m, d) > passed) [best, passed] = [s, day(m, d)];
    });
    return best;
}
