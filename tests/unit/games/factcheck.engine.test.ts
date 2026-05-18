import { describe, expect, it } from 'vitest';
import { FactCheckEngine } from '../../../src/games/factcheck/factcheck.engine';

describe('FactCheckEngine', () => {
  it('devuelve facts y valida respuestas', () => {
    const engine = new FactCheckEngine();
    const facts = engine.getRandomFacts(2, 5);
    expect(facts.length).toBe(2);
    const result = engine.check(facts[0].id, facts[0].isTrue);
    expect(result?.correct).toBe(true);
  });
});
