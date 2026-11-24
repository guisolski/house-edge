/** LD-6: camera follows player, clamped to map. */

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

export function createCamera(): Camera {
  return { x: 0, y: 0 };
}

export function followPlayer(args: FollowArgs): Camera {
  void args.cam;
  const worldW = args.mapW * args.tilePx;
  const worldH = args.mapH * args.tilePx;
  const targetX = args.playerX * args.tilePx + args.tilePx / 2 - args.viewW / 2;
  const targetY = args.playerY * args.tilePx + args.tilePx / 2 - args.viewH / 2;
  return {
    x: clamp(targetX, 0, Math.max(0, worldW - args.viewW)),
    y: clamp(targetY, 0, Math.max(0, worldH - args.viewH)),
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
