# Art & lighting direction

## Aesthetic

Cyberpunk + brazilianidade:

- Neon magenta/cyan over asphalt
- Accent triad: green `#009c3b`, yellow `#ffdf00`, blue `#002776`
- Favela silhouettes, boteco wood, pixo tags, tropical night markets
- Hand-composed hillside Morro Neon (stairs, alleys, stacked houses)

## Technique (v1.7 cleanup)

- **Hand-authored pixel art** in `src/rendering/pixel-gen.ts`: 3/4 favela houses (doors, windows, roofs, shadows), market stalls, corps, glowing stair exits, props (wires, tanks, lamps, crates)
- **Readable signs** via integer-scale monospace labels (never downscaled photo/AI images)
- **One character scale**: player and NPCs share the same 22×38 base, recolored per NPC
- **Hand-composed maps** in `src/world/maps.ts` — Morro Neon is terraced hillside with stairs
- Cached map layer keeps ≥60 FPS; glow pools on signs; light rain
- CC0 packs remain in `vendor/cc0/` for future curation — see `docs/credits.md`

## Palette reference

See `src/content/palette.ts`.
