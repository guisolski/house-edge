import type { DistrictId } from '../core/types';
import morro from '../content/maps/morro-neon.json';
import feira from '../content/maps/feira-central.json';
import avenida from '../content/maps/avenida-odds.json';
import torre from '../content/maps/torre-casa.json';

/** Tile kinds — night city (collision / semantics). */
export type TileKind =
  | 'asphalt'
  | 'sidewalk'
  | 'alley'
  | 'plaza'
  | 'grass'
  | 'stairs'
  | 'interior'
  | 'blocked'
  | 'exit';

export type BuildingStyle = 'morro' | 'feira' | 'avenida' | 'torre';

export type MapDecor = { x: number; y: number; sprite: string };

export type MapDef = {
  districtId: DistrictId;
  width: number;
  height: number;
  tiles: TileKind[];
  /** Atlas GIDs for hand-composed Tiled ground layer (1-based). */
  visualGids?: number[];
  buildings: {
    x: number;
    y: number;
    w: number;
    h: number;
    style: number;
    kind: BuildingStyle;
  }[];
  signs: {
    x: number;
    y: number;
    label: string;
    color: string;
    sprite?: string;
  }[];
  props: { x: number; y: number; kind: 'moto' | 'kiosk' | 'wire' }[];
  decor?: MapDecor[];
  landmark: { x: number; y: number; kind: string; sprite?: string };
};

export function tileAt(map: MapDef, x: number, y: number): TileKind {
  if (x < 0 || y < 0 || x >= map.width || y >= map.height) return 'blocked';
  return map.tiles[y * map.width + x] ?? 'blocked';
}

export function isWalkable(map: MapDef, x: number, y: number): boolean {
  const t = tileAt(map, x, y);
  return t !== 'blocked';
}

export function buildDistrictMap(id: DistrictId): MapDef {
  const raw =
    id === 'morro-neon'
      ? morro
      : id === 'feira-central'
        ? feira
        : id === 'avenida-odds'
          ? avenida
          : torre;
  return raw as MapDef;
}
