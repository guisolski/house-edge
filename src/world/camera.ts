/** LD-6: camera follows player, clamped to map (no off-map void). */

export type Camera = {
  x: number;
  y: number;
};

/** Keep the player sprite fully below the HTML play-HUD band (head clearance). */
export const HUD_TOP_INSET_PX = 140;
/** Keep a little air above the touch / FPS strip. */
export const HUD_BOTTOM_INSET_PX = 24;

export type FollowArgs = {
  cam: Camera;
  playerX: number;
  playerY: number;
  mapW: number;
  mapH: number;
  viewW: number;
  viewH: number;
  tilePx: number;
  /** Pixels reserved at the top for the HTML HUD (player stays below). */
  topInsetPx?: number;
  bottomInsetPx?: number;
};

export function createCamera(): Camera {
  return { x: 0, y: 0 };
}

/**
 * Follow the player, clamped to world bounds.
 * Biases the focus so the player sits below the HUD inset.
 * Never scrolls past the map — letterbox when the map is smaller than the view.
 */
export function followPlayer(args: FollowArgs): Camera {
  void args.cam;
  const top = args.topInsetPx ?? HUD_TOP_INSET_PX;
  const bottom = args.bottomInsetPx ?? HUD_BOTTOM_INSET_PX;
  const worldW = args.mapW * args.tilePx;
  const worldH = args.mapH * args.tilePx;
  const focusX = args.playerX * args.tilePx + args.tilePx / 2;
  const focusY = args.playerY * args.tilePx + args.tilePx / 2;
  // Prefer the player in the middle of the *usable* band under the HUD.
  const usableH = Math.max(args.tilePx, args.viewH - top - bottom);
  const preferredScreenY = top + usableH * 0.45;
  const targetX = focusX - args.viewW / 2;
  const targetY = focusY - preferredScreenY;
  const maxX = Math.max(0, worldW - args.viewW);
  const maxY = Math.max(0, worldH - args.viewH);
  return {
    x: clamp(targetX, 0, maxX),
    y: clamp(targetY, 0, maxY),
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

/**
 * Minimum walkable tile Y so the player sprite stays below the HUD when the
 * camera is clamped to the north edge of the map.
 */
export function minPlayerTileY(tilePx: number, topInsetPx = HUD_TOP_INSET_PX): number {
  // Extra tile of headroom so Morro ramp tops never kiss the screen edge.
  return Math.max(2, Math.ceil((topInsetPx + 24) / tilePx));
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}
