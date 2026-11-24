import { element } from '../app/dom.mjs';
import { SLOTS } from '../ship/catalogue.mjs';
const seconds = (ms) => `${ms / 1000} s`;
export function renderHangarStats(slot, item, equipped) {
    const rows =
        slot === 'ship'
            ? [
                  ['Speed', `${item.speed.toFixed(2)}×`],
                  ['Acceleration', `${item.acceleration} ms`],
                  ['Braking', `${item.braking} ms`],
              ]
            : slot === 'primary'
              ? [
                    ['Damage / projectile', item.damage],
                    ['Fire interval', `${item.interval} ms`],
                ]
              : [
                    ['Charge', seconds(item.windup)],
                    ['Cooldown', seconds(item.cooldown)],
                ];
    element('loadoutDetails').replaceChildren(
        ...rows.map(([name, value]) => {
            const row = document.createElement('div'),
                label = document.createElement('dt'),
                number = document.createElement('dd');
            label.textContent = name;
            number.textContent = value;
            row.append(label, number);
            return row;
        }),
    );
    for (const [key, list] of Object.entries(SLOTS)) {
        const choice = list.find((entry) => entry.id === equipped[key]);
        element(`equipped-${key}`).textContent = choice.name;
        element(`equipped-${key}-detail`).textContent =
            key === 'ship'
                ? `${choice.speed.toFixed(2)}× speed`
                : key === 'primary'
                  ? `${choice.damage} damage · ${choice.interval} ms interval`
                  : `${seconds(choice.windup)} charge · ${seconds(choice.cooldown)} cooldown`;
    }
}
