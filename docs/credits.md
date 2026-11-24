# Credits & licenses — House Edge art

All third-party packs used here are **CC0 1.0** (public domain dedication) or project-original / AI-generated as noted. Attribution is not required for CC0; we credit authors anyway.

## CC0 pixel-art packs

| Pack                          | Author      | License | Source                                                                    | Use in House Edge                                            |
| ----------------------------- | ----------- | ------- | ------------------------------------------------------------------------- | ------------------------------------------------------------ |
| RPG Urban Pack                | Kenney      | CC0 1.0 | [OpenGameArt](https://opengameart.org/content/rpg-urban-pack)             | Roads, sidewalks, urban props → neon atlas (`urban_*` tiles) |
| Roguelike Modern City         | Kenney      | CC0 1.0 | [OpenGameArt](https://opengameart.org/content/roguelike-modern-city-pack) | City sheet subsample → neon atlas (`modern_*` tiles)         |
| (12×12) City Tiles - Top Down | FisherG     | CC0     | [OpenGameArt](https://opengameart.org/content/12x12-city-tiles-top-down)  | Vendor reference / character walking strip                   |
| Market Stand                  | Reflextions | CC0     | [OpenGameArt](https://opengameart.org/content/market-stand)               | Feira stalls (`market_0..2` sprites)                         |

Vendor mirrors (source files kept for provenance): `vendor/cc0/`.

## Adaptation

- Runtime atlas: `public/assets/neon-atlas.png` (+ `neon-atlas.json`)
- Build: `python3 tools/build-assets.py` (Pillow) — remaps tiles to the House Edge neon-night palette, 16×16 grid, consistent dark outlines via quantization
- Hand-composed Tiled maps: `public/maps/*.tmj` → baked MapDef JSON in `src/content/maps/`

## AI-generated assets (then pixel-cleaned)

Generated with Cursor `GenerateImage`, then palette-reduced / grid-aligned by `tools/build-assets.py` into `public/assets/sprites/`.

| Asset        | File(s)                                                              | Purpose                       |
| ------------ | -------------------------------------------------------------------- | ----------------------------- |
| Favela stack | `ai_favela.png` (from `ai-favela-stack.jpg`)                         | Morro hillside stacked houses |
| Boteco       | `ai_boteco.png`                                                      | Dona Nair boteco exterior     |
| Feira stalls | `stall_0.png` … `stall_2.png`                                        | Central Fair market stalls    |
| Neon signs   | `sign_boteco.png`, `sign_laje.png`, `sign_odds.png`, `sign_casa.png` | District signage              |
| NPC sheet    | `npc_0.png` … `npc_5.png`                                            | Distinct NPC silhouettes      |

Source JPEGs: `vendor/cc0/ai-source/`.

## Original / procedural (still used)

- Player sprite, some building silhouettes, rain/glow FX, ending art scene — `src/rendering/pixel-gen.ts` (project original)
- Brasil accent palette — `src/content/palette.ts`
