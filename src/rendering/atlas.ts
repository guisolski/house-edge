/** Neon atlas + oversized sprite loader (CC0 + AI pixelized assets). */

const TILE = 16;

export type AtlasReady = {
  image: HTMLImageElement;
  columns: number;
  sprites: Map<string, HTMLImageElement>;
};

let cache: Promise<AtlasReady> | null = null;

export function loadAtlas(): Promise<AtlasReady> {
  if (!cache) cache = loadOnce();
  return cache;
}

export function atlasReadySync(): AtlasReady | null {
  return readySnapshot;
}

let readySnapshot: AtlasReady | null = null;

async function loadOnce(): Promise<AtlasReady> {
  const base = import.meta.env.BASE_URL;
  const meta = await fetch(`${base}assets/neon-atlas.json`).then((r) => r.json());
  const image = await loadImage(`${base}assets/neon-atlas.png`);
  const sprites = new Map<string, HTMLImageElement>();
  const entries = Object.entries(
    meta.tiles as Record<string, { kind?: string; file?: string }>,
  );
  await Promise.all(
    entries
      .filter(([, v]) => v.kind === 'sprite' && v.file)
      .map(async ([name, v]) => {
        sprites.set(name, await loadImage(`${base}assets/${v.file}`));
      }),
  );
  readySnapshot = { image, columns: meta.columns as number, sprites };
  return readySnapshot;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

export function blitAtlasTile(
  ctx: CanvasRenderingContext2D,
  atlas: AtlasReady,
  gid: number,
  dx: number,
  dy: number,
  scale: number,
): void {
  if (gid <= 0) return;
  const idx = gid - 1;
  const col = idx % atlas.columns;
  const row = Math.floor(idx / atlas.columns);
  const sx = col * TILE;
  const sy = row * TILE;
  ctx.drawImage(atlas.image, sx, sy, TILE, TILE, dx, dy, TILE * scale, TILE * scale);
}

export function blitNamedSprite(
  ctx: CanvasRenderingContext2D,
  atlas: AtlasReady,
  name: string,
  dx: number,
  dy: number,
  scale: number,
): void {
  const spr = atlas.sprites.get(name);
  if (!spr) return;
  ctx.drawImage(
    spr,
    dx,
    dy - spr.height * scale + TILE * scale,
    spr.width * scale,
    spr.height * scale,
  );
}
