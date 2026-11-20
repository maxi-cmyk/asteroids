import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// index.html is a template: each `<!-- @include html/name.html -->` line is replaced by that
// partial, so every screen's markup lives in its own file under web/html/.
// Developer-only markup (`<!-- @include-dev ... -->` lines and `<!-- @dev -->` ...
// `<!-- @end-dev -->` blocks) is kept only for the local dev server; the release page never
// contains it, so a public deploy has no developer tools to find.
export function assembleHtml(file = resolve(root, 'index.html'), { developer = false } = {}) {
    const include = (_, name) => readFileSync(resolve(root, name), 'utf8');
    return readFileSync(file, 'utf8')
        .replace(/^[ \t]*<!-- @include-dev (\S+) -->\n/gm, developer ? include : '')
        .replace(/^[ \t]*<!-- @include (\S+) -->\n/gm, include)
        .replace(/<!-- @dev -->([\s\S]*?)<!-- @end-dev -->/g, developer ? '$1' : '');
}
