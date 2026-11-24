/** Cyberpunk + brasilidade: neon over green/yellow/blue. */

export const Palette = {
  void: '#07060f',
  asphalt: '#12121c',
  concrete: '#2a2a38',
  neonMagenta: '#ff2bd6',
  neonCyan: '#2bfff2',
  neonLime: '#b8ff2b',
  brasilGreen: '#009c3b',
  brasilYellow: '#ffdf00',
  brasilBlue: '#002776',
  gold: '#f5c518',
  danger: '#ff3b5c',
  fog: '#6b7cff33',
  rain: '#9ad7ff55',
  pixo: '#ffffff',
  botecoWood: '#5c3b2e',
  ipêPink: '#ff6eb4',
  tropicalLeaf: '#1faa5a',
} as const;

export type PaletteKey = keyof typeof Palette;
