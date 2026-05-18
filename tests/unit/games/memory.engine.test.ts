import { describe, expect, it } from 'vitest';
import { MemoryEngine } from '../../../src/games/memory/memory.engine';

describe('MemoryEngine', () => {
  it('inicia partida y revela cartas', () => {
    const engine = new MemoryEngine({ pairs: 3, players: ['u1', 'u2'] });
    engine.start();
    const state = engine.getState();
    expect(state.status).toBe('playing');
    expect(state.cards).toHaveLength(6);

    const first = engine.revealCard('u1', 0);
    expect(first.event).toBe('reveal');
    expect(first.state.cards[0].isRevealed).toBe(true);
  });

  it('rechaza turno ajeno', () => {
    const engine = new MemoryEngine({ pairs: 2, players: ['u1', 'u2'] });
    engine.start();
    engine.revealCard('u1', 0);
    expect(() => engine.revealCard('u2', 1)).toThrow(/turno/i);
  });

  it('rehidrata desde estado', () => {
    const engine = new MemoryEngine({ pairs: 2, players: ['u1'] });
    engine.start();
    const saved = engine.getState();
    const restored = MemoryEngine.fromState(saved, { pairs: 2, players: ['u1'] });
    expect(restored.getState().moves).toBe(saved.moves);
  });
});
