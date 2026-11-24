# Art & lighting direction

## Aesthetic

Cyberpunk + brazilianidade:

- Neon magenta/cyan over asphalt
- Accent triad: green `#009c3b`, yellow `#ffdf00`, blue `#002776`
- Favela silhouettes, boteco wood, pixo tags, ipê pink, tropical leaves
- Copacabana wave patterns on fair sidewalks

## Technique

- Procedural pixel sprites/tiles generated at runtime (`src/rendering/pixel-gen.ts`) — original assets, no third-party sprite packs required
- Dynamic radial lights around the player
- Rain streaks + fog tint for atmosphere
- Excalibur `pixelArt: true` for crisp upscaling
- Depth sorted blits for a fake 3/4 perspective

## Palette reference

See `src/content/palette.ts`.
