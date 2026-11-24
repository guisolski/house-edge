# Playtest report — House Edge 1.6.0

Date: 2026-11-24

## Summary

**PASS** for art-direction slice: CC0 packs + AI pixel props, neon atlas, Tiled maps per district, 60 FPS desktop/mobile. Visual denseness improved vs v1.5 green/flat fields, but AI→pixel cleanup is still lossy — not hand-painted favela quality.

## Checks

| Item               | Result                                                 |
| ------------------ | ------------------------------------------------------ |
| CC0 packs credited | PASS — `docs/credits.md`                               |
| Neon atlas + scale | PASS — 16×16 atlas, neon remap                         |
| AI Brazilian props | PASS — favela/boteco/stalls/signs/NPCs documented      |
| Tiled maps         | PASS — `public/maps/*.tmj` + `src/content/maps/*.json` |
| FPS                | PASS — ~60 avg all districts (desktop + mobile)        |
| `make playtest`    | PASS — 7/7                                             |
| Console            | PASS — no errors on district travel                    |

## Screenshots

- Desktop: `v16-desktop-{morro,feira,avenida,torre}.png`
- Mobile: `v16-mobile-{morro,feira,avenida,torre}.png`

## Gaps (honest)

- AI photo-like sources quantize into muddy blobs; favela stacks need further manual pixel polish or better source sheets.
- Districts still read sparse in places; Kenney road tiles help more than AI buildings currently.
- Owner art direction can iterate on atlas contents without another systems rewrite.
