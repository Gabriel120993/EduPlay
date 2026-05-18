import { describe, expect, it } from 'vitest';
import { computePlayGameXp } from '../../../src/services/playGames.service';

describe('computePlayGameXp', () => {
  it('otorga XP base al completar', () => {
    expect(
      computePlayGameXp({
        completed: true,
        wonVersus: false,
        difficulty: 3,
        durationMs: 60_000,
      }),
    ).toBe(16);
  });

  it('suma bonus de victoria versus', () => {
    expect(
      computePlayGameXp({
        completed: true,
        wonVersus: true,
        difficulty: 2,
        durationMs: 30_000,
      }),
    ).toBe(29);
  });

  it('no otorga XP si no completó', () => {
    expect(
      computePlayGameXp({
        completed: false,
        wonVersus: true,
        difficulty: 5,
        durationMs: 1000,
      }),
    ).toBe(0);
  });
});
