import { describe, expect, it } from 'vitest';
import { computePlayGameXp } from '../../src/services/playGames.service';

describe('social feed XP (regression)', () => {
  it('mantiene formula de XP de juegos', () => {
    expect(
      computePlayGameXp({
        completed: true,
        wonVersus: false,
        difficulty: 2,
        durationMs: 1000,
      }),
    ).toBe(14);
  });
});
