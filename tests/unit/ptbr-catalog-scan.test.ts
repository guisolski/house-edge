import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const i18n = join(root, 'src/i18n');

/** Full English UI leftovers that must never appear in pt-BR catalogs. */
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
  'Elevator / VIP Salon',
  'Floor 42',
  'Skip credits',
  'Continue exploring',
];

/** Standalone English UI tokens that sneak into otherwise-pt strings. */
const ENGLISH_WORDS = [
  /\bElevator\b/,
  /\bVIP Salon\b/,
  /\bFloor 42\b/,
  /\bSkip credits\b/,
  /\bNew Game\b/,
  /\bSubmit lock\b/,
  /\bPlay again\b/,
];

/** Common gender agreement bugs called out in playtest #31. */
const GENDER_BUGS = [
  /\bo reviravolta\b/i,
  /\bo travada\b/i,
  /\bDispara o travada\b/i,
  /\bmeu travada\b/i,
  /\bErrou — a cena continua aberta\b/,
];

function catalogFiles(): string[] {
  return readdirSync(i18n).filter((f) => f.includes('pt-BR') || f.includes('ptBR'));
}

describe('pt-BR catalogs have no English blocklist leftovers', () => {
  for (const f of catalogFiles()) {
    it(f, () => {
      const src = readFileSync(join(i18n, f), 'utf8');
      const hits = BLOCKLIST.filter((p) => src.includes(p));
      expect(hits).toEqual([]);
    });
  }
});

describe('pt-BR catalogs scan English words + gender agreement', () => {
  for (const f of catalogFiles()) {
    it(`${f} has no common English UI words`, () => {
      const src = readFileSync(join(i18n, f), 'utf8');
      // Strip keys (left of :) so we only scan string values.
      const values = [...src.matchAll(/:\s*'((?:\\'|[^'])*)'/g)].map((m) => m[1] ?? '');
      const joined = values.join('\n');
      const hits = ENGLISH_WORDS.filter((re) => re.test(joined)).map((re) => String(re));
      expect(hits).toEqual([]);
    });

    it(`${f} has no known gender agreement bugs`, () => {
      const src = readFileSync(join(i18n, f), 'utf8');
      const hits = GENDER_BUGS.filter((re) => re.test(src)).map((re) => String(re));
      expect(hits).toEqual([]);
    });
  }
});
