# Art & lighting direction

## Aesthetic

Cyberpunk + brazilianidade:

- Neon magenta/cyan over asphalt
- Accent triad: green `#009c3b`, yellow `#ffdf00`, blue `#002776`
- Favela silhouettes, boteco wood, pixo tags, tropical night markets
- Hand-composed hillside Morro Neon (stairs, alleys, stacked houses)

## Technique (v1.6+)

- **CC0 packs** (Kenney urban/modern city, Reflextions market stands) remapped into a shared neon-night atlas — see `docs/credits.md`
- **AI-generated** Brazilian-specific props/signs/NPCs, palette-reduced to the same atlas
- **Tiled maps** per district (`public/maps/*.tmj`) compiled to `src/content/maps/*.json`
- Runtime: atlas blit + cached map layer (keeps ≥60 FPS); glow pools on signs/landmarks; light rain
- Fallback procedural tiles from `pixel-gen.ts` if atlas has not loaded yet

## Palette reference

See `src/content/palette.ts`.

## Rebuild assets

```bash
python3 tools/build-assets.py
# then re-emit MapDef JSON if maps changed (script prints paths under public/maps)
```
