import type { PixelGrid } from './pixel-gen';
import { paintGrid } from './pixel-gen';

/** Bake a procedural pixel grid once into a reusable canvas (GPU-friendly drawImage). */

export function bakeSprite(grid: PixelGrid, scale: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = grid.width * scale;
  c.height = grid.height * scale;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  paintGrid(ctx, grid, scale);
  return c;
}

export function blitImage(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  x: number,
  y: number,
): void {
  ctx.drawImage(img, x, y);
}
