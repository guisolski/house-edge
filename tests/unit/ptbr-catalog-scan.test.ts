import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const i18n = join(root, 'src/i18n');

const BLOCKLIST = [
  'Ice-cold water at the boteco',
  'Street pixo vs influencer',
  'The house takes its cut, as always.',
  'Onboarding timing pour',
  'Almost clean… almost.',
  'Travel to Central Fair',
  'Rita Odds — timed every needle',
  'Built with Excalibur',
  'Skip anytime',
  'The credits roll for everyone who bet with you',
  'Ready to roll',
  'Nobody in range',
  'Use Elevator',
  'POLICE LINE',
  'PIT FLOOR',
  'CENTRAL FAIR',
  'VIP SALON',
  'Radio Pirate',
  'Mole Contact',
  'Cage Runner',
  'Stage Hand',
  'Odds Influencer',
  'Lobby Cam Tech',
  'ATM Hacker',
  'Foyer Guard',
  'Pit Dealer',
  'VIP Host',
];

describe('pt-BR catalogs have no English blocklist leftovers', () => {
  const files = readdirSync(i18n).filter(
    (f) => f.includes('pt-BR') || f.includes('ptBR'),
  );
  for (const f of files) {
    it(f, () => {
      const src = readFileSync(join(i18n, f), 'utf8');
      const hits = BLOCKLIST.filter((p) => src.includes(p));
      expect(hits).toEqual([]);
    });
  }
});
