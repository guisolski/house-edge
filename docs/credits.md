# Credits & licenses — House Edge art

Runtime art in **v1.7+** is **hand-authored pixel art** (project original in `src/rendering/pixel-gen.ts`) plus optional CC0 reference packs under `vendor/cc0/` for provenance. Muddy AI→pixel conversions from v1.6 were **removed from the runtime**.

## CC0 packs (vendor / reference — free / permissive)

| Pack                  | Author      | License | Source                                                                    | Notes                                          |
| --------------------- | ----------- | ------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| RPG Urban Pack        | Kenney      | CC0 1.0 | [OpenGameArt](https://opengameart.org/content/rpg-urban-pack)             | Vendor tilemap kept for future curation        |
| Roguelike Modern City | Kenney      | CC0 1.0 | [OpenGameArt](https://opengameart.org/content/roguelike-modern-city-pack) | Vendor sheet kept                              |
| (12×12) City Tiles    | FisherG     | CC0     | [OpenGameArt](https://opengameart.org/content/12x12-city-tiles-top-down)  | Character strips for reference                 |
| Market Stand          | Reflextions | CC0     | [OpenGameArt](https://opengameart.org/content/market-stand)               | Market stall PNGs in vendor / optional sprites |

## Runtime (v1.7 cleanup)

- **Tiles / buildings / props / exit stairs / characters**: hand-drawn grids in `pixel-gen.ts` (strict neon palette)
- **Signs**: crisp integer-scale monospace bitmap labels (readable at game zoom)
- **Maps**: hand-composed terraces in `src/world/maps.ts` (Morro = hillside stairs + stacked houses + wires/tanks)

## Not used at runtime

- v1.6 AI JPEG sources may remain in `vendor/cc0/ai-source/` for history only; they are not loaded by the game.
- `neon-atlas.png` / `atlas.ts` are unused leftovers from v1.6 (safe to ignore until removed).

## Original / procedural

- Player + NPC sprites, favela / market / corp buildings, rain/glow FX, ending art — `src/rendering/pixel-gen.ts`
- Brasil accent palette — `src/content/palette.ts`
