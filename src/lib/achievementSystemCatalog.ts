import type { AchievementRarity } from '@prisma/client';
import { AchievementSystemKind, ContentCategory } from '@prisma/client';

export type AchievementSeedRow = {
  id: string;
  title: string;
  description: string;
  category: ContentCategory;
  badgeColor: string;
  badgeIcon: string;
  rarity: AchievementRarity;
  systemKind: AchievementSystemKind;
  hidden: boolean;
  collectionKey: string | null;
  slug: string;
  sortOrder: number;
};

const ANIMALS = [
  'León',
  'Tigre',
  'Elefante',
  'Jirafa',
  'Pingüino',
  'Delfín',
  'Ballena',
  'Águila',
  'Búho',
  'Zorro',
  'Oso',
  'Lobo',
  'Canguro',
  'Koala',
  'Panda',
  'Guepardo',
  'Hipopótamo',
  'Rinoceronte',
  'Cebra',
  'Camello',
  'Flamenco',
  'Tortuga marina',
  'Medusa',
  'Pulpo',
  'Tiburón',
  'Caballito de mar',
  'Mariposa monarca',
  'Abeja',
  'Hormiga',
  'Araña',
  'Rana',
  'Serpiente',
  'Iguana',
  'Camaleón',
  'Colibrí',
  'Tucán',
  'Cóndor',
  'Llama',
  'Alpaca',
  'Suricata',
  'Nutria',
  'Castor',
  'Mapache',
  'Ardilla',
  'Erizo',
  'Murciélago',
  'Venado',
  'Jaguar',
  'Gorila',
  'Orangután',
  'Chimpancé',
];

const COUNTRY_CODES = [
  'AR',
  'BR',
  'CL',
  'CO',
  'MX',
  'PE',
  'UY',
  'ES',
  'FR',
  'DE',
  'IT',
  'GB',
  'US',
  'CA',
  'JP',
  'CN',
  'IN',
  'EG',
  'ZA',
  'AU',
];

function aid(n: number): string {
  const h = n.toString(16).padStart(12, '0');
  return `f0000001-0000-4000-8000-${h}`;
}

export function buildAchievementSystemCatalog(): AchievementSeedRow[] {
  const rows: AchievementSeedRow[] = [];
  let order = 0;

  const push = (r: Omit<AchievementSeedRow, 'sortOrder'> & { sortOrder?: number }) => {
    const so = r.sortOrder ?? order;
    order = so + 1;
    rows.push({ ...r, sortOrder: so });
  };

  // —— Progreso ——
  push({
    id: aid(1),
    slug: 'primeros_pasos',
    title: 'Primeros Pasos',
    description: 'Completar la primera actividad en EduPlay.',
    category: ContentCategory.education,
    badgeColor: '#b45309',
    badgeIcon: 'footsteps',
    rarity: 'COMMON',
    systemKind: AchievementSystemKind.PROGRESS,
    hidden: false,
    collectionKey: null,
  });
  push({
    id: aid(2),
    slug: 'aprendiz_constante',
    title: 'Aprendiz Constante',
    description: '7 días consecutivos con actividad registrada.',
    category: ContentCategory.education,
    badgeColor: '#ca8a04',
    badgeIcon: 'flame',
    rarity: 'RARE',
    systemKind: AchievementSystemKind.PROGRESS,
    hidden: false,
    collectionKey: null,
  });
  push({
    id: aid(3),
    slug: 'maratonista',
    title: 'Maratonista',
    description: '30 días consecutivos con actividad.',
    category: ContentCategory.education,
    badgeColor: '#ea580c',
    badgeIcon: 'calendar',
    rarity: 'EPIC',
    systemKind: AchievementSystemKind.PROGRESS,
    hidden: false,
    collectionKey: null,
  });
  push({
    id: aid(4),
    slug: 'maestro_100',
    title: 'Maestro',
    description: 'Completar 100 actividades (quizzes, juegos, lecturas).',
    category: ContentCategory.education,
    badgeColor: '#7c3aed',
    badgeIcon: 'school',
    rarity: 'LEGENDARY',
    systemKind: AchievementSystemKind.PROGRESS,
    hidden: false,
    collectionKey: null,
  });
  push({
    id: aid(5),
    slug: 'especialista_temas',
    title: 'Especialista',
    description: 'Dominar 5 temas diferentes al 100% en seguimiento de habilidades.',
    category: ContentCategory.education,
    badgeColor: '#0d9488',
    badgeIcon: 'ribbon',
    rarity: 'EPIC',
    systemKind: AchievementSystemKind.PROGRESS,
    hidden: false,
    collectionKey: null,
  });

  // —— Habilidad ——
  push({
    id: aid(6),
    slug: 'perfecto_20',
    title: 'Perfecto',
    description: '20 preguntas seguidas sin error.',
    category: ContentCategory.math,
    badgeColor: '#2563eb',
    badgeIcon: 'checkmark-done',
    rarity: 'EPIC',
    systemKind: AchievementSystemKind.SKILL,
    hidden: false,
    collectionKey: null,
  });
  push({
    id: aid(7),
    slug: 'velocista_quiz',
    title: 'Velocista',
    description: 'Completar un quiz en menos de la mitad del tiempo asignado.',
    category: ContentCategory.math,
    badgeColor: '#db2777',
    badgeIcon: 'flash',
    rarity: 'RARE',
    systemKind: AchievementSystemKind.SKILL,
    hidden: false,
    collectionKey: null,
  });
  push({
    id: aid(8),
    slug: 'sin_pistas',
    title: 'Sin Pistas',
    description: 'Terminar un juego o quiz sin usar ayudas ni pistas.',
    category: ContentCategory.creativity,
    badgeColor: '#4f46e5',
    badgeIcon: 'eye-off',
    rarity: 'RARE',
    systemKind: AchievementSystemKind.SKILL,
    hidden: false,
    collectionKey: null,
  });
  push({
    id: aid(9),
    slug: 'explorador_areas',
    title: 'Explorador',
    description: 'Probar todas las áreas de conocimiento al menos una vez.',
    category: ContentCategory.geography,
    badgeColor: '#059669',
    badgeIcon: 'map',
    rarity: 'EPIC',
    systemKind: AchievementSystemKind.SKILL,
    hidden: false,
    collectionKey: null,
  });

  // —— Social ——
  push({
    id: aid(10),
    slug: 'amistad',
    title: 'Amistad',
    description: 'Agregar tu primer amigo aceptado.',
    category: ContentCategory.education,
    badgeColor: '#ec4899',
    badgeIcon: 'heart',
    rarity: 'COMMON',
    systemKind: AchievementSystemKind.SOCIAL,
    hidden: false,
    collectionKey: null,
  });
  push({
    id: aid(11),
    slug: 'mentor',
    title: 'Mentor',
    description: 'Ayudar a 10 amigos con sus dudas (mensajes de apoyo contabilizados).',
    category: ContentCategory.education,
    badgeColor: '#8b5cf6',
    badgeIcon: 'hand-left',
    rarity: 'EPIC',
    systemKind: AchievementSystemKind.SOCIAL,
    hidden: false,
    collectionKey: null,
  });
  push({
    id: aid(12),
    slug: 'popular',
    title: 'Popular',
    description: 'Recibir 50 likes en contenido compartido.',
    category: ContentCategory.education,
    badgeColor: '#f59e0b',
    badgeIcon: 'star',
    rarity: 'RARE',
    systemKind: AchievementSystemKind.SOCIAL,
    hidden: false,
    collectionKey: null,
  });
  push({
    id: aid(13),
    slug: 'colaborador',
    title: 'Colaborador',
    description: 'Completar 5 desafíos grupales.',
    category: ContentCategory.education,
    badgeColor: '#14b8a6',
    badgeIcon: 'people',
    rarity: 'EPIC',
    systemKind: AchievementSystemKind.SOCIAL,
    hidden: false,
    collectionKey: null,
  });

  // —— Especiales (ocultos hasta desbloquear) ——
  push({
    id: aid(14),
    slug: 'noche_de_estudio',
    title: 'Noche de Estudio',
    description: 'Usar la app después de las 22:00 (hora local).',
    category: ContentCategory.puzzle,
    badgeColor: '#312e81',
    badgeIcon: 'moon',
    rarity: 'RARE',
    systemKind: AchievementSystemKind.SPECIAL,
    hidden: true,
    collectionKey: null,
  });
  push({
    id: aid(15),
    slug: 'tempranero',
    title: 'Tempranero',
    description: 'Usar la app antes de las 8:00 (hora local).',
    category: ContentCategory.puzzle,
    badgeColor: '#fbbf24',
    badgeIcon: 'sunny',
    rarity: 'RARE',
    systemKind: AchievementSystemKind.SPECIAL,
    hidden: true,
    collectionKey: null,
  });
  push({
    id: aid(16),
    slug: 'curioso_datos',
    title: 'Curioso',
    description: 'Tocar 50 datos curiosos en la biblioteca en un solo día.',
    category: ContentCategory.science,
    badgeColor: '#22c55e',
    badgeIcon: 'sparkles',
    rarity: 'EPIC',
    systemKind: AchievementSystemKind.SPECIAL,
    hidden: true,
    collectionKey: null,
  });
  push({
    id: aid(17),
    slug: 'persistente',
    title: 'Persistente',
    description: 'Fallar 10 veces en el mismo reto y luego completarlo.',
    category: ContentCategory.sports,
    badgeColor: '#dc2626',
    badgeIcon: 'fitness',
    rarity: 'LEGENDARY',
    systemKind: AchievementSystemKind.SPECIAL,
    hidden: true,
    collectionKey: null,
  });

  // —— Colección Científicos ——
  const scientists = [
    { n: 'Einstein', emoji: '🧪' },
    { n: 'Curie', emoji: '☢️' },
    { n: 'Newton', emoji: '🍎' },
    { n: 'Galileo', emoji: '🔭' },
  ];
  scientists.forEach((s, i) => {
    push({
      id: aid(20 + i),
      slug: `scientist_${s.n.toLowerCase()}`,
      title: `Científicos · ${s.n}`,
      description: `Insignia coleccionable 3D: ${s.n}.`,
      category: ContentCategory.science,
      badgeColor: '#0369a1',
      badgeIcon: s.emoji,
      rarity: 'EPIC',
      systemKind: AchievementSystemKind.COLLECTIBLE,
      hidden: false,
      collectionKey: 'scientists',
    });
  });

  const explorers = [
    { n: 'Colón', emoji: '⛵' },
    { n: 'Marco Polo', emoji: '🐫' },
    { n: 'Amelia Earhart', emoji: '✈️' },
  ];
  explorers.forEach((s, i) => {
    push({
      id: aid(30 + i),
      slug: `explorer_${i + 1}`,
      title: `Exploradores · ${s.n}`,
      description: `Insignia coleccionable: ${s.n}.`,
      category: ContentCategory.geography,
      badgeColor: '#0f766e',
      badgeIcon: s.emoji,
      rarity: 'RARE',
      systemKind: AchievementSystemKind.COLLECTIBLE,
      hidden: false,
      collectionKey: 'explorers',
    });
  });

  const artists = [
    { n: 'Picasso', emoji: '🎨' },
    { n: 'Mozart', emoji: '🎵' },
    { n: 'Frida Kahlo', emoji: '🖌️' },
  ];
  artists.forEach((s, i) => {
    push({
      id: aid(40 + i),
      slug: `artist_${i + 1}`,
      title: `Artistas · ${s.n}`,
      description: `Insignia coleccionable: ${s.n}.`,
      category: ContentCategory.creativity,
      badgeColor: '#c026d3',
      badgeIcon: s.emoji,
      rarity: 'RARE',
      systemKind: AchievementSystemKind.COLLECTIBLE,
      hidden: false,
      collectionKey: 'artists',
    });
  });

  ANIMALS.forEach((name, i) => {
    push({
      id: aid(100 + i),
      slug: `animal_${String(i + 1).padStart(2, '0')}`,
      title: `Animales · ${name}`,
      description: `Colección Animales (${i + 1}/50): ${name}.`,
      category: ContentCategory.science,
      badgeColor: '#15803d',
      badgeIcon: 'paw',
      rarity: 'COMMON',
      systemKind: AchievementSystemKind.COLLECTIBLE,
      hidden: false,
      collectionKey: 'animals',
    });
  });

  COUNTRY_CODES.forEach((code, i) => {
    push({
      id: aid(200 + i),
      slug: `country_${code.toLowerCase()}`,
      title: `Países · ${code}`,
      description: `Bandera y datos: colección mundial (${code}).`,
      category: ContentCategory.geography,
      badgeColor: '#1d4ed8',
      badgeIcon: 'flag',
      rarity: 'COMMON',
      systemKind: AchievementSystemKind.COLLECTIBLE,
      hidden: false,
      collectionKey: 'countries',
    });
  });

  return rows;
}
