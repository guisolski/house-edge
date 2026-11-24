/** LD-6: camera follows player, clamped to map (with sprite overhang pad). */

export type Camera = {
  x: number;
  y: number;
};

export type FollowArgs = {
  cam: Camera;
  playerX: number;
  playerY: number;
  mapW: number;
  mapH: number;
  viewW: number;
  viewH: number;
  tilePx: number;
};

/** Extra camera slack so tall sprites near map edges are not clipped. */
export const CAMERA_SPRITE_PAD = 96;

export function createCamera(): Camera {
  return { x: 0, y: 0 };
}

export function followPlayer(args: FollowArgs): Camera {
  void args.cam;
  const worldW = args.mapW * args.tilePx;
  const worldH = args.mapH * args.tilePx;
  const focusX = args.playerX * args.tilePx + args.tilePx / 2;
  const focusY = args.playerY * args.tilePx + args.tilePx / 2;
  const targetX = focusX - args.viewW / 2;
  const targetY = focusY - args.viewH / 2;
  // Edge pad grows with viewport so the player stays centered (and on-screen)
  // at the north/west map edges instead of clipping under the HUD.
  const padX = Math.max(CAMERA_SPRITE_PAD, Math.floor(args.viewW / 2) - args.tilePx);
  const padY = Math.max(CAMERA_SPRITE_PAD, Math.floor(args.viewH / 2) - args.tilePx);
  const maxX = Math.max(-padX, worldW - args.viewW + padX);
  const maxY = Math.max(-padY, worldH - args.viewH + padY);
  return {
    x: clamp(targetX, -padX, maxX),
    y: clamp(targetY, -padY, maxY),
  };
}

export type ViewportPadArgs = Pick<
  FollowArgs,
  'mapW' | 'mapH' | 'viewW' | 'viewH' | 'tilePx'
>;

/** Letterbox offset when the map is smaller than the viewport. */
export function viewportPadding(args: ViewportPadArgs): { padX: number; padY: number } {
  const worldW = args.mapW * args.tilePx;
  const worldH = args.mapH * args.tilePx;
  return {
    padX: worldW < args.viewW ? (args.viewW - worldW) / 2 : 0,
    padY: worldH < args.viewH ? (args.viewH - worldH) / 2 : 0,
  };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
