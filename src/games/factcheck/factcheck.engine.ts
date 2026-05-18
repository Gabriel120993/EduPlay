export interface FactCheck {
  id: string;
  statement: string;
  isTrue: boolean;
  explanation: string;
  category: string;
  difficulty: number;
}

export class FactCheckEngine {
  private readonly facts: FactCheck[] = [
    {
      id: 'fc1',
      statement: 'Los plátanos crecen en árboles.',
      isTrue: false,
      explanation: 'Los plátanos crecen en plantas herbáceas gigantes, no en árboles.',
      category: 'naturaleza',
      difficulty: 1,
    },
    {
      id: 'fc2',
      statement: 'La Gran Muralla China es visible desde el espacio a simple vista.',
      isTrue: false,
      explanation: 'Es un mito: es muy estrecha para verse así desde el espacio.',
      category: 'geografía',
      difficulty: 2,
    },
    {
      id: 'fc3',
      statement: 'El agua hierve a 100 °C al nivel del mar.',
      isTrue: true,
      explanation: 'A presión atmosférica normal, el agua hierve aproximadamente a 100 °C.',
      category: 'ciencia',
      difficulty: 1,
    },
    {
      id: 'fc4',
      statement: 'Los delfines son peces.',
      isTrue: false,
      explanation: 'Los delfines son mamíferos acuáticos.',
      category: 'naturaleza',
      difficulty: 1,
    },
    {
      id: 'fc5',
      statement: 'La Luna gira alrededor de la Tierra.',
      isTrue: true,
      explanation: 'La Luna es el satélite natural de la Tierra.',
      category: 'astronomía',
      difficulty: 1,
    },
    {
      id: 'fc6',
      statement: 'Todos los metales son magnéticos.',
      isTrue: false,
      explanation: 'Solo algunos metales (como el hierro) son ferromagnéticos.',
      category: 'ciencia',
      difficulty: 3,
    },
  ];

  getRandomFacts(count: number, difficulty: number): FactCheck[] {
    const filtered = this.facts.filter((f) => f.difficulty <= difficulty);
    return this.shuffle(filtered.length ? filtered : this.facts).slice(0, count);
  }

  check(factId: string, userSaysTrue: boolean): { correct: boolean; explanation: string } | null {
    const fact = this.facts.find((f) => f.id === factId);
    if (!fact) return null;
    return {
      correct: fact.isTrue === userSaysTrue,
      explanation: fact.explanation,
    };
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
