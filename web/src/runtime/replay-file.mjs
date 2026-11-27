// Reads a replay a person chose (the developer replay page): a compact .astr file or a replay
// object as JSON. The size is checked before the file is read and the file is read once.
import { checkImportSize } from '../state/save.mjs';
import { decodeReplay, MAX_REPLAY_BYTES } from './replay-codec.mjs';

export async function readReplayFile(file) {
    checkImportSize(file, MAX_REPLAY_BYTES, 'a replay');
    const data = new Uint8Array(await file.arrayBuffer());
    if (data[0] === 0x41) return decodeReplay(data); // "ASTR"
    try {
        return JSON.parse(new TextDecoder().decode(data));
    } catch {
        throw new Error('That file is not a replay (it is neither an .astr file nor JSON).');
    }
}
