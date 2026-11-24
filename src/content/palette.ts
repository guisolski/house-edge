/** Night cyberpunk + brasilidade accents (neon over deep blues). */

export const Palette = {
  void: '#05040c',
  nightSky: '#0a0a18',
  asphalt: '#161622',
  wetAsphalt: '#1c1c2e',
  asphaltLine: '#3a3a28',
  sidewalk: '#2a2a3a',
  curb: '#3d3d52',
  concrete: '#2e2e42',
  wallDark: '#1a1528',
  wallWarm: '#2a2030',
  roofPink: '#c4187a',
  roofCyan: '#1a6a7a',
  neonMagenta: '#ff2bd6',
  neonCyan: '#2bfff2',
  neonLime: '#b8ff2b',
  neonOrange: '#ff7a3d',
  brasilGreen: '#009c3b',
  brasilYellow: '#ffdf00',
  brasilBlue: '#002776',
  gold: '#f5c518',
  danger: '#ff3b5c',
  rain: '#9ad7ff44',
  pixo: '#f4f4ff',
  botecoWood: '#4a3028',
  plant: '#1a6a3a',
  plantDark: '#0e3a22',
  windowLit: '#ffe08a',
  shadow: '#00000088',
} as const;

export type PaletteKey = keyof typeof Palette;
