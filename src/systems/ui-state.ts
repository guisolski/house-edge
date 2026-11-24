/** UX-5: one modal context at a time. */

export type UiScreen =
  | 'title'
  | 'play'
  | 'dialogue'
  | 'bet'
  | 'menu'
  | 'travel'
  | 'jobs'
  | 'upgrades'
  | 'ending';

/** Extra edges beyond play→anything and →play/title/ending. */
const EXTRA = new Set<string>([
  'dialogue>bet',
  'menu>jobs',
  'menu>travel',
  'menu>upgrades',
  'jobs>menu',
  'travel>menu',
  'upgrades>menu',
]);

export class UiStateMachine {
  private screen: UiScreen = 'title';

  get(): UiScreen {
    return this.screen;
  }

  is(screen: UiScreen): boolean {
    return this.screen === screen;
  }

  canOpenModal(): boolean {
    return this.screen === 'play' || this.screen === 'menu';
  }

  go(screen: UiScreen): boolean {
    if (screen === this.screen) return true;
    if (!this.allowed(this.screen, screen)) return false;
    this.screen = screen;
    return true;
  }

  backToPlay(): void {
    if (this.screen !== 'title' && this.screen !== 'ending') {
      this.screen = 'play';
    }
  }

  private allowed(from: UiScreen, to: UiScreen): boolean {
    if (to === 'title' || to === 'ending' || to === 'play' || from === 'play')
      return true;
    if (from === 'title') return to === 'play';
    return EXTRA.has(`${from}>${to}`);
  }
}
