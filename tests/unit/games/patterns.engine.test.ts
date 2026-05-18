import { describe, expect, it } from 'vitest';
import { PatternsEngine } from '../../../src/games/patterns/patterns.engine';

describe('PatternsEngine', () => {
  it('genera ronda con opción correcta', () => {
    const engine = new PatternsEngine();
    const round = engine.generate(3);
    expect(round.sequence.length).toBeGreaterThan(0);
    expect(round.options).toHaveLength(4);
    expect(round.options[round.correctIndex]).toBeDefined();
  });
});
