import { PrismaClient } from '../.prisma-client';

const prisma = new PrismaClient();

const PLAY_GAMES = [
  {
    slug: 'memory-arena',
    name: 'Memory Arena',
    description: 'Encontrá pares de cartas. En modo versus, compite con un amigo en el mismo tablero.',
    category: 'MEMORY' as const,
    type: 'VERSUS' as const,
    difficultyMin: 1,
    difficultyMax: 8,
    isPremium: false,
    rules:
      'Por turnos, volteá dos cartas. Si coinciden, sumás un punto y seguís. Gana quien tenga más pares.',
  },
  {
    slug: 'patrones-rapidos',
    name: 'Patrones Rápidos',
    description: 'Descubrí la secuencia lógica y elegí el siguiente elemento.',
    category: 'LOGIC' as const,
    type: 'DAILY_CHALLENGE' as const,
    difficultyMin: 1,
    difficultyMax: 10,
    isPremium: false,
    rules: 'Observá la secuencia y elegí la opción correcta. Cada acierto suma puntos.',
  },
  {
    slug: 'detective-junior',
    name: 'Detective Junior',
    description: 'Resolvé misterios con pistas. Modo cooperativo con amigos.',
    category: 'LOGIC' as const,
    type: 'COOPERATIVE' as const,
    difficultyMin: 1,
    difficultyMax: 5,
    isPremium: false,
    rules: 'Revelá pistas, discutí en equipo y votá al sospechoso correcto.',
  },
  {
    slug: 'matematica-relampago',
    name: 'Matemática Relámpago',
    description: 'Operaciones contra reloj. Modo 1v1: más respuestas correctas en 60 segundos.',
    category: 'MATH' as const,
    type: 'VERSUS' as const,
    difficultyMin: 1,
    difficultyMax: 10,
    isPremium: true,
    rules: 'Resolvé el mayor número de operaciones en un minuto.',
  },
  {
    slug: 'cierto-o-fake',
    name: 'Cierto o Fake',
    description: '¿Es verdad o es un mito? Aprendé curiosidades y compartí en el feed.',
    category: 'GENERAL_KNOWLEDGE' as const,
    type: 'SOLO' as const,
    difficultyMin: 1,
    difficultyMax: 5,
    isPremium: false,
    rules: 'Leé cada afirmación y decidí si es cierta o falsa.',
  },
];

export async function seedPlayGames(): Promise<void> {
  for (const game of PLAY_GAMES) {
    await prisma.playGame.upsert({
      where: { slug: game.slug },
      create: game,
      update: {
        name: game.name,
        description: game.description,
        category: game.category,
        type: game.type,
        difficultyMin: game.difficultyMin,
        difficultyMax: game.difficultyMax,
        isPremium: game.isPremium,
        rules: game.rules,
        isActive: true,
      },
    });
  }
  console.log(`[seed-play-games] ${PLAY_GAMES.length} juegos sociales listos.`);
}

if (require.main === module) {
  seedPlayGames()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
