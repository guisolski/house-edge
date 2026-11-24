# Playtest report — House Edge 1.9.0

Independent check against v1.8.0 feedback (art 5/10, bugs 4–8).

## Verdict

**Bugs: PASS.** **Art: ~6/10** (better than 5, still short of a clean hillside read). Console: **0 errors**.

## Before → After

| Item               | v1.8 / ask                           | v1.9 result                                                                                                                                                                                  |
| ------------------ | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Morro height       | Flat bands                           | Blocked 3-row cliff faces + dark brick overlays + central 4-tile stairs spine. Height reads more, but faces still compete with neon accents / house sprites — not a full “favela step” look. |
| Left window column | Full-height cyan/yellow strip        | Solid edge wall + brick blocked fill; left cyan residue ≈0 in pixel sample. Residual vertical accents can still read as a strip.                                                             |
| Fair ground        | Speckled plaza + yellow-window bands | Plaza fill + quiet feira asphalt (no yellow lane hatch). Stalls still share a base silhouette (awning recolors/size variants only).                                                          |
| Sprite repetition  | High                                 | Building flips + style recolors + stall size variants. Still repetitive at a glance.                                                                                                         |
| Camera north       | Player half off-screen               | Camera Y pad ≈ half viewport; north shot shows map void above while player stays on-screen.                                                                                                  |
| E range / prompt   | ~50px / Nobody in range              | `INTERACT_RANGE=3.5`; on-screen `E (Name)` when in range.                                                                                                                                    |
| NPC collision      | Inconsistent                         | All NPCs non-blocking (walk-through).                                                                                                                                                        |
| Side Jobs Close    | Closed everything                    | Esc → Side Jobs → Close returns to **Menu**.                                                                                                                                                 |
| ATM vs story       | Side bet stole E                     | Story-available NPCs preferred; ATM moved to (38,17); incomplete beats no longer fall through to rematch.                                                                                    |
| Story length       | Toward ~20 min                       | Extra dialogue + `avenida-radar` beat via Mensageiro.                                                                                                                                        |

## Automated

- `npm test` — pass (coverage ≥90%)
- `npm run lint` — pass
- `make playtest` — 7/7 pass (golden path, FPS, story-complete, mobile dialogue)

## Honest art note

Prior agent 7.5 was too high; independent 5/10 on v1.8 was fair. This pass lands around **6/10**: stepped cliffs and calmer Fair are real, but Morro still skews “banded grid with neon” more than organic stacked favela, and Fair stalls remain same-shaped.

## Shots

- `01-morro-terraces.png` — cliffs + central stairs + E prompt
- `05-e-prompt.png` — `E (Dona Nair)`
- `06-morro-north-edge.png` — north camera scroll
- `07-jobs-close-menu.png` — Close → Menu
- `08-central-fair.png` — quieter plaza ground
