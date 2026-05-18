export interface MathProblem {
  id: string;
  expression: string;
  answer: number;
  difficulty: number;
}

export class MathEngine {
  private readonly problemBank = new Map<string, MathProblem>();

  generateProblems(count: number, difficulty: number): MathProblem[] {
    return Array.from({ length: count }, () => this.generateProblem(difficulty));
  }

  generateProblem(difficulty: number): MathProblem {
    const operations = ['+', '-', '*'] as const;
    const op = operations[Math.min(Math.max(difficulty, 1) - 1, operations.length - 1)];
    const a = Math.floor(Math.random() * (difficulty * 10)) + 1;
    const b = Math.floor(Math.random() * (difficulty * 10)) + 1;

    let answer: number;
    let expression: string;

    switch (op) {
      case '+':
        answer = a + b;
        expression = `${a} + ${b} = ?`;
        break;
      case '-':
        answer = Math.max(a, b) - Math.min(a, b);
        expression = `${Math.max(a, b)} - ${Math.min(a, b)} = ?`;
        break;
      case '*':
        answer = a * b;
        expression = `${a} × ${b} = ?`;
        break;
      default:
        answer = a + b;
        expression = `${a} + ${b} = ?`;
    }

    const problem: MathProblem = {
      id: `math-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      expression,
      answer,
      difficulty,
    };
    this.problemBank.set(problem.id, problem);
    return problem;
  }

  validateAnswer(problemId: string, answer: number, problems?: MathProblem[]): boolean {
    const fromBank = this.problemBank.get(problemId);
    if (fromBank) return fromBank.answer === answer;
    const list = problems ?? [];
    const found = list.find((p) => p.id === problemId);
    return found != null && found.answer === answer;
  }
}
