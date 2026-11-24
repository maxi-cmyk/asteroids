import { gradeAtlas } from './art-grade.mjs';

export async function loadImage(url) {
    const image = new Image();
    image.src = url;
    await image.decode();
    return image;
}
export async function loadArt() {
    const [atlas, font, response, hullResponse] = await Promise.all([
        loadImage('./assets/sprites.png'),
        loadImage('./assets/font.png'),
        fetch('./assets/sprites.json'),
        fetch('./assets/ships/index.json'),
    ]);
    if (!response.ok || !hullResponse.ok) throw new Error('Sprite manifest could not load');
    const sprites = await response.json();
    const index = await hullResponse.json();
    const hulls = await Promise.all(
        index.hulls.map(async ({ manifest }) => {
            const response = await fetch(manifest);
            if (!response.ok) throw new Error(`Ship states could not load: ${manifest}`);
            const spec = await response.json();
            const image = await loadImage(spec.image);
            if (image.width !== spec.width || image.height !== spec.height)
                throw new Error(`Ship sheet dimensions do not match: ${spec.id}`);
            return { image, cells: spec.cells };
        }),
    );
    // Keep one runtime atlas, assembled from independently authored ship PNGs.
    const sheet = document.createElement('canvas');
    sheet.width = Math.max(atlas.width, ...hulls.map(({ image }) => image.width));
    sheet.height = atlas.height + hulls.reduce((height, { image }) => height + image.height, 0);
    const ctx = sheet.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(atlas, 0, 0);
    let y = atlas.height;
    for (const { image, cells } of hulls) {
        ctx.drawImage(image, 0, y);
        for (const [name, cell] of Object.entries(cells))
            sprites[name] = { ...cell, y: cell.y + y, authored: true };
        y += image.height;
    }
    // Region scenery (planets, moons, the black hole) is optional: without it the
    // backgrounds still draw their sky, nebulae and stars.
    let worlds = null;
    try {
        const [image, response] = await Promise.all([
            loadImage('./assets/worlds.png'),
            fetch('./assets/worlds.json'),
        ]);
        if (response.ok) worlds = { image, frames: await response.json() };
    } catch (error) {
        console.warn('World sprites unavailable', error);
    }
    return { atlas: gradeAtlas(sheet, sprites), font, sprites, worlds };
}
