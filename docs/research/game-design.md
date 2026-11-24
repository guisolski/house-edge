# Research — Game design (House Edge)

Findings applied to the ~20 min betting-city campaign.

## Sources

1. [Urban Design and the Creation of Videogame Cities](https://www.gamedeveloper.com/design/urban-design-and-the-creation-of-videogame-cities) — Kevin Lynch’s paths / edges / districts / nodes / landmarks for legible cities.
2. [Best Practices of Landmark in Level Design](https://scholar.smu.edu/cgi/viewcontent.cgi?article=1048&context=guildhall_leveldesign_etds) — landmark hierarchy + denial/reward sightlines.
3. [David Shaver — Invisible Intuition](https://davidshaver.net/DShaver_Invisible_Intuition_DirectorsCut.pdf) — weenies / repeated landmark reveals.
4. GDC roundtable notes on pacing short adventures (goals every few minutes).

## Guidelines we adopt

| ID   | Guideline                                           | Application in House Edge                                                                            |
| ---- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| GD-1 | Short campaigns need a clear goal every few minutes | Story beats map to NPCs; objective HUD always shows the next beat                                    |
| GD-2 | Gate content without soft-locking                   | District unlocks via beat completion; bets can lose credits but story still advances after resolving |
| GD-3 | Risk must be readable                               | Bet UI shows stake, odds, house-edge flavor, and animated roll before payout                         |
| GD-4 | Every interaction needs spatial framing             | Interact/bet only within NPC proximity + on-screen prompt                                            |
| GD-5 | Reward exploration lightly, story heavily           | Side jobs for grind; story NPCs for progress                                                         |

## Decision cites

- Proximity prompts → **GD-4**
- Bet stake/odds/roll animation → **GD-3**
- Objective string + marker → **GD-1**
- District gates via story flags → **GD-2**
