// This build's identity (nextSteps.md R5), from the <meta name="build"> the build and the dev
// server write into the page (tools/build-info.mjs). Outside a page (tests) it is "dev".
export function buildInfo(doc = globalThis.document) {
    const meta = doc?.querySelector?.('meta[name="build"]');
    return {
        version: meta?.dataset.version || 'dev',
        commit: meta?.dataset.commit || 'unknown',
        id: meta?.content || 'dev',
    };
}
