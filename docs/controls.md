# Controls — House Edge

Input-adaptive UI (see `docs/research/ux-input.md` — UX-1…UX-7).

## Keyboard / mouse

- **WASD / arrows** — move
- **E / Space** — interact (NPC or district exit in range)
- **F** — bet when near a job NPC / confirm bet modal
- **Esc** — pause menu (Travel, Side Jobs, Mute)
- **M** — mute
- **F3** — toggle FPS overlay (also listed in the pause-menu controls hint)

On-screen touch buttons stay hidden. Keyboard hint strip stays in the HUD.

## Touch

- Analog stick (bottom-left) — move
- **Interact / Bet / Menu** action buttons (bottom-right)
- Menus are fully tappable

Touch chrome appears only while the active input mode is touch.

## Gamepad

- Left stick / D-pad — move (or menu focus when a modal is open)
- **A** — interact / confirm focused button
- **B** — bet / back
- **Start** — menu
- **Select** — mute

Touch chrome hidden; gamepad hint strip shown.

## Mode switching

The last used device wins after a short debounce (~350ms) so mixed chatter does not flicker the HUD.

## Accessibility

Canvas scales with `object-fit: contain`. Desktop HUD remains mouse-clickable without touch chrome.
