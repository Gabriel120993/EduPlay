export interface PatternRound {
  sequence: (number | string)[];
  options: (number | string)[];
  correctIndex: number;
  difficulty: number;
}

export class PatternsEngine {
  generate(difficulty: number): PatternRound {
    const types = ['arithmetic', 'geometric', 'fibonacci', 'alternating', 'squares'] as const;
    const type = types[Math.min(Math.max(difficulty, 1) - 1, types.length - 1)];

    switch (type) {
      case 'arithmetic':
        return this.generateArithmetic(difficulty);
      case 'geometric':
        return this.generateGeometric(difficulty);
      case 'fibonacci':
        return this.generateFibonacci(difficulty);
      case 'alternating':
        return this.generateAlternating(difficulty);
      case 'squares':
        return this.generateSquares(difficulty);
      default:
        return this.generateArithmetic(difficulty);
    }
  }

  private generateArithmetic(difficulty: number): PatternRound {
    const start = Math.floor(Math.random() * 10) + 1;
    const step = Math.floor(Math.random() * difficulty) + 1;
    const sequence = Array.from({ length: 5 }, (_, i) => start + step * i);
    const correct = start + step * 5;
    const options = this.generateOptions(correct, step);

    return {
      sequence,
      options,
      correctIndex: options.indexOf(correct),
      difficulty,
    };
  }

  private generateGeometric(difficulty: number): PatternRound {
    const start = Math.floor(Math.random() * 5) + 2;
    const ratio = Math.min(2 + Math.floor(difficulty / 3), 4);
    const sequence = Array.from({ length: 4 }, (_, i) => start * ratio ** i);
    const correct = start * ratio ** 4;
    const options = this.generateOptions(correct, ratio);

    return {
      sequence,
      options,
      correctIndex: options.indexOf(correct),
      difficulty,
    };
  }

  private generateFibonacci(difficulty: number): PatternRound {
    const a = Math.floor(Math.random() * 3) + 1;
    const b = Math.floor(Math.random() * 3) + 2;
    const sequence = [a, b];
    while (sequence.length < 5) {
      sequence.push(sequence[sequence.length - 1] + sequence[sequence.length - 2]);
    }
    const correct = sequence[sequence.length - 1] + sequence[sequence.length - 2];
    const options = this.generateOptions(correct, Math.max(1, difficulty));

    return {
      sequence: sequence.slice(0, 5),
      options,
      correctIndex: options.indexOf(correct),
      difficulty,
    };
  }

  private generateAlternating(difficulty: number): PatternRound {
    const base = Math.floor(Math.random() * 5) + 1;
    const step = Math.floor(Math.random() * difficulty) + 1;
    const sequence = Array.from({ length: 5 }, (_, i) => (i % 2 === 0 ? base : base + step) + i);
    const correct = (5 % 2 === 0 ? base : base + step) + 5;
    const options = this.generateOptions(correct, step);

    return {
      sequence,
      options,
      correctIndex: options.indexOf(correct),
      difficulty,
    };
  }

  private generateSquares(difficulty: number): PatternRound {
    const offset = Math.floor(Math.random() * 3);
    const sequence = Array.from({ length: 5 }, (_, i) => (i + offset) ** 2);
    const correct = (5 + offset) ** 2;
    const options = this.generateOptions(correct, difficulty + 1);

    return {
      sequence,
      options,
      correctIndex: options.indexOf(correct),
      difficulty,
    };
  }

  private generateOptions(correct: number, step: number): number[] {
    const wrong1 = correct + step;
    const wrong2 = correct - step;
    const wrong3 = correct + step * 2;
    return this.shuffle([correct, wrong1, wrong2, wrong3]);
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
