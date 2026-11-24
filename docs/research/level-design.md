# Research — Level / map design (top-down 2D)

## Sources

1. [Stop Getting Lost: Make Cognitive Maps, Not Levels](https://www.youtube.com/watch?v=Q1Tczf8vxCM) — paths catch lost players; landmarks must be directional and revisited.
2. [GDC 2018 Level Design Workshop](https://www.gamedeveloper.com/design/gdc-2018-level-design-workshop-an-expert-roundtable-q-a) — Disney “weenies”; top-down “pathway flooring”; temporary HUD arrows when 2D lacks vertical landmarks.
3. [Urban Design and Videogame Cities](https://www.gamedeveloper.com/design/urban-design-and-the-creation-of-videogame-cities) — Lynch: Paths, Edges, Districts, Nodes, Landmarks.
4. [3/4 View Pixel Art](https://gridwright.store/blog/three-quarter-view-pixel-art) — tops+fronts, Y-sort by feet, consistent projection.
5. [Pixeli — Perspective rules](https://pixeli.pebbly.space/knowledge/rules/70-perspective) — one projection per scene; 3/4 buildings = front + roof.

## Guidelines we adopt

| ID   | Guideline                                     | Application                                                                         |
| ---- | --------------------------------------------- | ----------------------------------------------------------------------------------- |
| LD-1 | Paths + edges make cognitive maps             | Distinct asphalt streets vs sidewalks vs alleys; water/walls as edges               |
| LD-2 | One landmark per district (“weenie”)          | Morro: LED tower; Fair: calçadão plaza; Avenue: OddsCorp glass; Tower: Casa Suprema |
| LD-3 | Pathway flooring for critical path            | Brighter/wetter street tiles lead to story NPCs and district exits                  |
| LD-4 | Gate with visible next landmark               | District exit tiles + objective marker toward unlocked next district                |
| LD-5 | 3/4 buildings: front + roof, Y-sort           | Buildings drawn with facade + roof band; sort by foot Y                             |
| LD-6 | Camera follows in maps larger than one screen | Districts ≥ 40×28 tiles; camera centers on player with clamp                        |
| LD-7 | Squint test / distinct palettes               | Per-district accent + ground materials                                              |

## Decision cites

- Street/sidewalk/alley tile set → **LD-1, LD-3**
- Landmark props per district → **LD-2**
- Exit pads + travel UI → **LD-4**
- Depth-sorted buildings/NPCs → **LD-5**
- Scrolling camera → **LD-6**
