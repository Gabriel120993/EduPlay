export interface MemoryCard {
  id: string;
  value: string;
  isRevealed: boolean;
  isMatched: boolean;
  position: number;
}

export interface MemoryState {
  cards: MemoryCard[];
  currentPlayer: string;
  scores: Record<string, number>;
  moves: number;
  status: 'waiting' | 'playing' | 'finished';
}

export class MemoryEngine {
  private state: MemoryState;

  constructor(private config: { pairs: number; players: string[] }) {
    this.state = this.initialize();
  }

  private initialize(): MemoryState {
    const values = this.generatePairs(this.config.pairs);
    const shuffled = this.shuffle([...values, ...values]);

    return {
      cards: shuffled.map((value, i) => ({
        id: `card-${i}`,
        value,
        isRevealed: false,
        isMatched: false,
        position: i,
      })),
      currentPlayer: this.config.players[0] ?? '',
      scores: Object.fromEntries(this.config.players.map((p) => [p, 0])),
      moves: 0,
      status: 'waiting',
    };
  }

  start(): void {
    this.state.status = 'playing';
  }

  revealCard(
    playerId: string,
    position: number,
  ): { state: MemoryState; event: string } {
    if (this.state.status !== 'playing') {
      throw new Error('La partida no está en curso.');
    }
    if (this.state.currentPlayer !== playerId) {
      throw new Error('No es tu turno.');
    }

    const card = this.state.cards[position];
    if (!card || card.isRevealed || card.isMatched) {
      throw new Error('Carta no disponible.');
    }

    card.isRevealed = true;

    const revealedCards = this.state.cards.filter((c) => c.isRevealed && !c.isMatched);

    if (revealedCards.length === 2) {
      this.state.moves += 1;

      if (revealedCards[0].value === revealedCards[1].value) {
        revealedCards.forEach((c) => {
          c.isMatched = true;
        });
        this.state.scores[playerId] = (this.state.scores[playerId] ?? 0) + 1;

        if (this.state.cards.every((c) => c.isMatched)) {
          this.state.status = 'finished';
          return { state: this.cloneState(), event: 'match_and_finish' };
        }

        return { state: this.cloneState(), event: 'match' };
      }

      const players = Object.keys(this.state.scores);
      const currentIndex = players.indexOf(playerId);
      this.state.currentPlayer = players[(currentIndex + 1) % players.length] ?? playerId;

      return { state: this.cloneState(), event: 'no_match' };
    }

    return { state: this.cloneState(), event: 'reveal' };
  }

  hideUnmatched(): MemoryState {
    this.state.cards.forEach((c) => {
      if (!c.isMatched) c.isRevealed = false;
    });
    return this.cloneState();
  }

  getState(): MemoryState {
    return this.cloneState();
  }

  /** Rehidrata motor desde estado persistido. */
  static fromState(state: MemoryState, config: { pairs: number; players: string[] }): MemoryEngine {
    const engine = new MemoryEngine(config);
    engine.state = structuredClone(state);
    return engine;
  }

  private cloneState(): MemoryState {
    return structuredClone(this.state);
  }

  private generatePairs(count: number): string[] {
    const emojis = [
      '🦁',
      '🐶',
      '🐱',
      '🐭',
      '🐹',
      '🐰',
      '🦊',
      '🐻',
      '🐼',
      '🐨',
      '🐯',
      '🐷',
      '🐸',
      '🐵',
      '🐔',
      '🐧',
      '🐦',
      '🐤',
      '🦆',
      '🦅',
    ];
    return emojis.slice(0, count);
  }

  private shuffle<T>(array: T[]): T[] {
    const copy = [...array];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
