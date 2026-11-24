import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
    existsSync,
    mkdirSync,
    copyFileSync,
    readFileSync,
    readdirSync,
    writeFileSync,
    cpSync,
    rmSync,
} from 'node:fs';
import { shipHeader } from './tools/ship-header.mjs';
import { assembleHtml } from './tools/assemble-html.mjs';
import { buildInfo } from './tools/build-info.mjs';
const root = dirname(fileURLToPath(import.meta.url));
const test = process.argv.includes('--test');
const oled = process.argv.includes('--oled');
const outputName = oled ? (test ? 'oled-test' : 'oled') : test ? 'test' : 'game';
const clang =
    process.env.CLANGXX ||
    ['/opt/homebrew/opt/llvm/bin/clang++', '/opt/homebrew/opt/llvm@22/bin/clang++'].find(
        existsSync,
    ) ||
    'clang++';
const linker =
    process.env.WASM_LD ||
    (existsSync('/opt/homebrew/opt/lld/bin/wasm-ld')
        ? '/opt/homebrew/opt/lld/bin/wasm-ld'
        : 'wasm-ld');
if ((clang.includes('/') && !existsSync(clang)) || (linker.includes('/') && !existsSync(linker))) {
    throw new Error('Set CLANGXX and WASM_LD, or install LLVM and lld (brew install llvm lld).');
}
mkdirSync(resolve(root, 'dist/gen'), { recursive: true });
// The scene ABI lives in scene-layout.mjs; the engine gets the same offsets as a header.
const { sceneHeader } = await import('./src/runtime/scene-layout.mjs');
writeFileSync(resolve(root, 'dist/gen/scene_layout.h'), sceneHeader());
writeFileSync(resolve(root, 'dist/gen/ship_data.h'), shipHeader());
const exports = [
    '__wasm_call_ctors',
    'web_init',
    'web_fire_press',
    'web_fire_diagnostics',
    'web_step',
    'web_audio_step',
    'web_clock',
    'web_set_clock',
    'web_pixels',
    'web_offset',
    'web_state',
    'web_snapshot',
    'web_scene',
    'web_width',
    'web_height',
    'web_actions',
    'web_start',
    'web_start_level',
    'web_loadout',
    'web_demo',
    'web_demo_lives',
    'web_reload_scores',
    'web_menu',
    'web_practice_targets',
    'web_boss_practice',
    'web_boss_assist',
    'web_ascendant',
    'web_boss_body',
    'web_practice_multishot',
    'web_practice_hold',
    'web_practice_config',
    'web_practice_spawn',
    'web_practice_clear',
    'web_practice_respawn',
    'web_practice_next_wave',
    'web_practice_reset_stats',
    'web_practice_double_fire',
    'web_stats',
    'web_coop_start',
    'web_coop_pause',
    'web_coop_input',
    'web_coop_player',
];
if (test)
    exports.push(
        'web_scenario',
        'web_test_coop',
        'web_test_overlap',
        'web_test_pickup',
        'web_test_boss',
        'web_test_boss_stats',
        'web_test_boss_body',
        'web_test_boss_circles',
        'web_test_boss_set',
        'web_test_boss_stress',
    );
// Compile portable modules as C17, never through the C++ frontend.
const coreObjects = ['scoring', 'difficulty', 'score_table'].map((name) => {
    const output = `${root}/dist/${name}.o`;
    const result = spawnSync(
        clang.replace(/clang\+\+$/, 'clang'),
        [
            '--target=wasm32',
            '-std=c17',
            '-Wall',
            '-Wextra',
            '-Werror',
            '-O2',
            '-ffreestanding',
            '-fno-builtin',
            `-I${root}/../engine/include`,
            '-c',
            `${root}/../engine/core/${name}.c`,
            '-o',
            output,
        ],
        { stdio: 'inherit' },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
    return output;
});
const args = [
    '--target=wasm32',
    '-std=c++17',
    '-O2',
    '-nostdlib',
    '-ffreestanding',
    '-fno-exceptions',
    '-fno-rtti',
    '-fno-threadsafe-statics',
    '-fno-builtin',
    `-I${root}/native`,
    `-I${root}/dist/gen`,
    `-I${root}/../engine/include`,
    '-Wl,--no-entry',
    '-Wl,--export-memory',
    '-Wl,--initial-memory=262144',
    '-Wl,--allow-undefined',
    ...exports.map((name) => `-Wl,--export=${name}`),
    ...(test ? ['-DWEB_TEST'] : []),
    ...(!oled ? ['-DWEB_HD'] : []),
    ...coreObjects,
    `${root}/native/bridge.cpp`,
    `${root}/native/raster.cpp`,
    `${root}/vendor/gfx-primitives.cpp`,
    `${root}/../engine/src/display.cpp`,
    `${root}/../engine/src/sound.cpp`,
    '-o',
    `${root}/dist/${outputName}.wasm`,
];
const result = spawnSync(clang, args, {
    stdio: 'inherit',
    env: { ...process.env, PATH: `${dirname(linker)}:${process.env.PATH}` },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const output = resolve(root, 'dist', `${outputName}.wasm`);
// sinf and cosf are the engine's own (native/mathf.h): no float may enter from the host, so
// every runtime plays the same inputs out the same way.
const allowedImports = new Set([
    'browser_random',
    'browser_tone',
    'browser_storage_read',
    'browser_storage_write',
]);
for (const item of WebAssembly.Module.imports(new WebAssembly.Module(readFileSync(output)))) {
    if (item.module !== 'env' || !allowedImports.has(item.name)) {
        throw new Error(`Unexpected WASM import: ${item.module}.${item.name}`);
    }
}
if (!test && !oled) {
    // The optional synthetic-controller QA page is never a release artifact.
    rmSync(resolve(root, 'dist/coop-browser.html'), { force: true });
    // Every module under src/ ships as-is (a new file can never be forgotten); the dev
    // pages keep their old URLs at the site root, their scripts live under dist/dev.
    for (const file of ['style.css', 'theme.css'])
        copyFileSync(resolve(root, file), resolve(root, 'dist', file));
    // index.html is a template: each `<!-- @include html/name.html -->` line is replaced by that
    // partial, so every screen's markup lives in its own file.
    writeFileSync(
        resolve(root, 'dist/index.html'),
        assembleHtml(resolve(root, 'index.html'), { build: buildInfo() }),
    );
    for (const folder of ['src', 'styles']) {
        rmSync(resolve(root, 'dist', folder), { recursive: true, force: true });
        cpSync(resolve(root, folder), resolve(root, 'dist', folder), { recursive: true });
    }
    // Files no current build writes are leftovers from older layouts: remove them so they
    // can never be deployed.
    const outputs = new Set([
        'gen',
        'src',
        'styles',
        'assets',
        'index.html',
        'style.css',
        'theme.css',
        'site',
    ]);
    outputs.add('THIRD-PARTY-LICENSE.txt');
    for (const entry of readdirSync(resolve(root, 'dist')))
        if (!outputs.has(entry) && !/\.(wasm|o)$/.test(entry))
            rmSync(resolve(root, 'dist', entry), { recursive: true, force: true });
    // Developer pages (storyboards, state sheets, replays, stress) never ship: they are served
    // live from dev/ by the local dev server only. Remove copies an older build left behind.
    rmSync(resolve(root, 'dist/dev'), { recursive: true, force: true });
    for (const page of readdirSync(resolve(root, 'dev')).filter((name) => name.endsWith('.html')))
        rmSync(resolve(root, 'dist', page), { force: true });
    cpSync(resolve(root, 'assets'), resolve(root, 'dist/assets'), {
        recursive: true,
        // Notes, reference sheets, art inspiration (third-party, reference only) and approval
        // drafts stay in the repo; only the art and audio ship.
        filter: (source) =>
            !source.endsWith('.md') &&
            !/\/assets\/(screenshots$|inspo$|bosses\/attacks-|bosses\/draft-)/.test(source),
    });
    copyFileSync(
        resolve(root, 'vendor/LICENSE.txt'),
        resolve(root, 'dist/THIRD-PARTY-LICENSE.txt'),
    );
}
if (!test && !oled) {
    // Nothing developer-only or third-party may ship (nextSteps.md R6): no dev pages, no
    // approval drafts or art inspiration, no test engines, no developer screen in the page.
    const shipped = (dir, base = '') =>
        readdirSync(resolve(root, 'dist', dir), { withFileTypes: true }).flatMap((e) =>
            e.isDirectory()
                ? shipped(`${dir}/${e.name}`, `${base}${e.name}/`)
                : [`${base}${e.name}`],
        );
    const files = shipped('.');
    const banned = files.filter(
        (f) =>
            /^dev\//.test(f) ||
            /(^|\/)assets\/(inspo|screenshots)\//.test(f) ||
            /(^|\/)assets\/bosses\/(draft-|attacks-)/.test(f) ||
            readdirSync(resolve(root, 'dev')).includes(f),
    );
    if (banned.length)
        throw new Error(`Release build would ship: ${banned.slice(0, 5).join(', ')}`);
    if (
        /data-view="developer"|data-go="developer"/.test(
            readFileSync(resolve(root, 'dist/index.html'), 'utf8'),
        )
    )
        throw new Error('Release page would contain the developer tools');
}
if (!test && !oled) {
    // The deploy folder (nextSteps.md R6): exactly what the public page needs and nothing the
    // tests leave in dist/ (test engines with state-editing hooks, object files, generated
    // headers). W1 uploads dist/site/ as it is.
    const SITE = [
        'index.html',
        'style.css',
        'theme.css',
        'src',
        'styles',
        'assets',
        'game.wasm',
        'THIRD-PARTY-LICENSE.txt',
    ];
    const site = resolve(root, 'dist/site');
    rmSync(site, { recursive: true, force: true });
    mkdirSync(site, { recursive: true });
    for (const entry of SITE)
        cpSync(resolve(root, 'dist', entry), resolve(site, entry), { recursive: true });
    const deployed = readdirSync(site, { recursive: true });
    const stray = deployed.filter(
        (f) => /(^|\/)(test|oled-test|oled)\.wasm$|\.o$|(^|\/)gen\//.test(f) || /^dev\//.test(f),
    );
    if (stray.length) throw new Error(`dist/site would deploy: ${stray.slice(0, 5).join(', ')}`);
}
console.log(`Built ${outputName}.wasm from production C17/C++ sources.`);
