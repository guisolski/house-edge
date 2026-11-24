# Research — UX / HUD / input

## Sources

1. [Android — Enable natural input on all form factors](https://developer.android.com/games/develop/multiplatform/enable-natural-input-on-all-form-factors) — detect active input; switch UI on the fly; delay before flipping hints to avoid flicker.
2. [Android — Game controller essential design](https://developer.android.com/games/sdk/game-controller/essential-design-considerations) — hide touch when gamepad active; restore on touch; full gamepad menu nav; separate gameplay vs UI contexts; assign initial focus.
3. [Roblox adaptive design](https://create.roblox.com/docs/en-us/production/publishing/adaptive-design.md) — input fluidity; prompts match device.
4. [Microsoft handheld gaming best practices](https://developer.microsoft.com/en-us/games/articles/2025/06/best-practices-for-handheld-gaming-development/) — context-aware iconography.
5. [PixiJS / neon glow recipes](https://pixi-silk.schmooky.dev/docs/glass-and-glow/) + Excalibur post-process notes — additive layered glows for neon.

## Guidelines we adopt

| ID   | Guideline                                         | Application                                                       |
| ---- | ------------------------------------------------- | ----------------------------------------------------------------- |
| UX-1 | Switch UI by active device, not form factor alone | `InputMode` = keyboard \| touch \| gamepad from last event        |
| UX-2 | Debounce mode switches (~300–500ms)               | Avoid flicker when devices chatter                                |
| UX-3 | Hide virtual controls on keyboard/gamepad         | Touch joystick + actions only in touch mode                       |
| UX-4 | Show device-specific hints                        | Keyboard: WASD/E; Gamepad: A/B/Start; Touch: none in chrome       |
| UX-5 | One modal UI context at a time                    | UI state machine: title/play/dialogue/bet/menu/travel/jobs/ending |
| UX-6 | Gamepad navigates all menus                       | D-pad/stick moves focus; A confirm; B back                        |
| UX-7 | Touch: analog stick + clean action buttons        | Fixed bottom-left stick; Interact / Bet / Menu                    |
| UX-8 | HUD must not duplicate or overlap                 | Single stats strip; action chrome adapts by mode                  |

## Neon / lighting (browser)

| ID   | Guideline                            | Application                                               |
| ---- | ------------------------------------ | --------------------------------------------------------- |
| LT-1 | Additive layered glows beat one blur | Neon signs emit colored radial lights on a lighting pass  |
| LT-2 | Wet ground reads neon                | Specular streaks on asphalt under rain + sign color bleed |

## Decision cites

- `InputAdapter` + live mode → **UX-1, UX-2**
- Adaptive HUD / touch stick → **UX-3, UX-4, UX-7, UX-8**
- Modal stack → **UX-5**
- Gamepad focus in menus → **UX-6**
- Lighting layer → **LT-1, LT-2**
