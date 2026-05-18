export interface Suspect {
  id: string;
  name: string;
  description: string;
  alibi: string;
}

export interface Clue {
  id: string;
  text: string;
  reveals: string;
  foundBy?: string;
}

export interface DetectiveMystery {
  id: string;
  title: string;
  scenario: string;
  suspects: Suspect[];
  clues: Clue[];
  solution: string;
}

export class DetectiveEngine {
  private readonly mysteries: DetectiveMystery[] = [
    {
      id: 'mystery-1',
      title: 'El pastel desaparecido',
      scenario:
        'El pastel de cumpleaños desapareció de la cocina. Hay 3 sospechosos. Reuní pistas y votá al culpable.',
      suspects: [
        {
          id: 's1',
          name: 'El hermano mayor',
          description: 'Le encanta el chocolate',
          alibi: 'Estaba viendo TV',
        },
        {
          id: 's2',
          name: 'La mascota',
          description: 'Un perro travieso',
          alibi: 'Estaba durmiendo',
        },
        {
          id: 's3',
          name: 'El vecino',
          description: 'Vino a visitar',
          alibi: 'Estaba en el jardín',
        },
      ],
      clues: [
        { id: 'c1', text: 'Hay migas de chocolate en el sofá', reveals: 's1' },
        { id: 'c2', text: 'El plato está en la mesa, no en el piso', reveals: 's3' },
        { id: 'c3', text: 'No hay huellas de patas', reveals: 's2' },
      ],
      solution: 's1',
    },
    {
      id: 'mystery-2',
      title: 'El lápiz mágico',
      scenario: 'Un lápiz de colores desapareció del estuche en clase. ¿Quién lo tiene?',
      suspects: [
        {
          id: 's1',
          name: 'Compañero del fondo',
          description: 'Siempre pide prestado',
          alibi: 'Estaba en recreo afuera',
        },
        {
          id: 's2',
          name: 'La bibliotecaria',
          description: 'Guarda materiales',
          alibi: 'Estaba catalogando libros',
        },
        {
          id: 's3',
          name: 'El monitor',
          description: 'Ayuda a ordenar',
          alibi: 'Estaba en el pasillo',
        },
      ],
      clues: [
        { id: 'c1', text: 'Hay restos de goma de borrar nuevos en el pupitre del fondo', reveals: 's1' },
        { id: 'c2', text: 'El estuche estaba en el aula, no en biblioteca', reveals: 's2' },
        { id: 'c3', text: 'El monitor no entró al aula en esa hora', reveals: 's3' },
      ],
      solution: 's1',
    },
  ];

  getRandomMystery(): DetectiveMystery {
    const pick = this.mysteries[Math.floor(Math.random() * this.mysteries.length)];
    return structuredClone(pick);
  }

  revealClue(mystery: DetectiveMystery, clueId: string, userId: string): Clue {
    const clue = mystery.clues.find((c) => c.id === clueId);
    if (!clue) throw new Error('Pista no encontrada.');
    clue.foundBy = userId;
    return clue;
  }

  solve(
    mystery: DetectiveMystery,
    suspectId: string,
  ): { correct: boolean; explanation: string } {
    const correct = mystery.solution === suspectId;
    return {
      correct,
      explanation: correct
        ? '¡Correcto! Las pistas encajan con ese sospechoso.'
        : 'No es correcto. Revisá las pistas con tus amigos.',
    };
  }
}
