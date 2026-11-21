// The build's identity (nextSteps.md R5): the package version and the short git commit, with
// "-dirty" when the working tree has uncommitted changes. The page carries it in
// <meta name="build">; Settings → About and save exports show it, and the network handshake
// (S3) will compare it.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function buildInfo() {
    const { version } = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    const git = (...args) => {
        try {
            return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
        } catch {
            return '';
        }
    };
    const commit = git('rev-parse', '--short', 'HEAD') || 'unknown';
    const dirty = git('status', '--porcelain', '--', '.') ? '-dirty' : '';
    return { version, commit: commit + dirty, id: `${version}+${commit}${dirty}` };
}
