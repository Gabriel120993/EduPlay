/**
 * Catálogo de misiones temáticas (historia + pasos + metadatos de temporada).
 * Las definiciones viven en código; el progreso y votos persisten en Prisma.
 */

export type ThematicMissionStepKind =
  | 'video'
  | 'quiz'
  | 'game'
  | 'reading'
  | 'experiment'
  | 'activity'
  | 'challenge'
  | 'creative';

export type ThematicMissionFestivity =
  | 'none'
  | 'christmas'
  | 'halloween'
  | 'earth_day'
  | 'carnival';

export type ThematicMissionSource = 'official' | 'community';

export interface ThematicMissionStep {
  order: number;
  kind: ThematicMissionStepKind;
  title: string;
  summary: string;
  /** Puente narrativo hacia la siguiente actividad */
  storyBeat?: string;
}

export interface ThematicMissionDef {
  slug: string;
  title: string;
  /** Tema central */
  theme: string;
  /** Historia que conecta las actividades */
  narrative: string;
  reward: string;
  rewardAvatarKey?: string;
  steps: ThematicMissionStep[];
  /** Rotación mensual sugerida (YYYY-MM) o null si permanente */
  seasonMonth: string | null;
  festivity: ThematicMissionFestivity;
  availableFrom: string | null;
  availableUntil: string | null;
  /** Urgencia para completar (misión limitada en tiempo) */
  urgentUntil: string | null;
  source: ThematicMissionSource;
  sortOrder: number;
}

type RawStep = Omit<ThematicMissionStep, 'order'>;

function buildSteps(raw: RawStep[]): ThematicMissionStep[] {
  return raw.map((x, i) => ({ ...x, order: i + 1 }));
}

function m(
  sortOrder: number,
  slug: string,
  title: string,
  theme: string,
  narrative: string,
  reward: string,
  rawSteps: RawStep[],
  opts: {
    rewardAvatarKey?: string;
    seasonMonth?: string | null;
    festivity?: ThematicMissionFestivity;
    availableFrom?: string | null;
    availableUntil?: string | null;
    urgentUntil?: string | null;
    source?: ThematicMissionSource;
  } = {},
): ThematicMissionDef {
  const steps = buildSteps(rawSteps);
  if (steps.length < 5 || steps.length > 10) {
    throw new Error(
      `Misión ${slug}: se requieren entre 5 y 10 actividades (tiene ${steps.length}).`,
    );
  }
  return {
    slug,
    title,
    theme,
    narrative,
    reward,
    rewardAvatarKey: opts.rewardAvatarKey,
    steps,
    seasonMonth: opts.seasonMonth ?? null,
    festivity: opts.festivity ?? 'none',
    availableFrom: opts.availableFrom ?? null,
    availableUntil: opts.availableUntil ?? null,
    urgentUntil: opts.urgentUntil ?? null,
    source: opts.source ?? 'official',
    sortOrder,
  };
}

/** Catálogo completo (≥ 20 misiones) incluyendo festividades y propuestas comunitarias. */
export const THEMATIC_MISSIONS: ThematicMissionDef[] = [
  m(
    1,
    'astronauta-por-un-dia',
    'Astronauta por un Día',
    'El Espacio',
    'Sos elegido para una misión orbital de entrenamiento: desde la Estación Espacial hasta un aterrizaje simbólico en la Luna, cada paso te acerca a dominar el cosmos con curiosidad y seguridad.',
    'Traje de astronauta para avatar',
    [
      {
        kind: 'video',
        title: 'Vivir en la Estación Espacial',
        summary: 'Cómo duermen, comen y experimentan los astronautas en microgravedad.',
        storyBeat: 'Ya sabés cómo es el día a día arriba; ahora poné a prueba lo aprendido.',
      },
      {
        kind: 'quiz',
        title: 'Planetas del sistema solar',
        summary: 'Orden, tamaños y datos curiosos de cada mundo.',
        storyBeat: 'Tu nave está lista: es hora de esquivar peligros en el cinturón de asteroides.',
      },
      {
        kind: 'game',
        title: 'Nave espacial y asteroides',
        summary: 'Pilotá esquivando rocas y recogiendo combustible de ciencia.',
        storyBeat: 'Aterrizá suave: leé cómo la humanidad llegó a la Luna.',
      },
      {
        kind: 'reading',
        title: 'Historia de la llegada a la Luna',
        summary: 'Apollo, cooperación internacional y el primer paso.',
        storyBeat: 'En la base lunar montamos un taller de propulsión casera.',
      },
      {
        kind: 'experiment',
        title: 'Cohete casero',
        summary: 'Construí un cohete con materiales seguros y medí alturas.',
        storyBeat: 'Cerrá la misión celebrando: ya tenés el traje para tu avatar.',
      },
      {
        kind: 'creative',
        title: 'Bitácora de comandante',
        summary: 'Escribí tres aprendizajes que llevarías a tu tripulación.',
      },
    ],
    { rewardAvatarKey: 'avatar_space_suit', seasonMonth: '2026-04' },
  ),
  m(
    2,
    'detective-del-pasado',
    'Detective del Pasado',
    'Historia Antigua',
    'Un museo digital te envía al Nilo: seguí pistas entre jeroglíficos, excavaciones y leyendas para reconstruir un caso histórico.',
    'Lupa de detective para avatar',
    [
      {
        kind: 'video',
        title: 'Un día en la vida de un niño egipcio',
        summary: 'Escuela, juegos y familia en el Antiguo Egipto.',
        storyBeat: 'Las pistas están talladas: descifrá su significado.',
      },
      {
        kind: 'quiz',
        title: 'Jeroglíficos y su significado',
        summary: 'Sonidos, ideogramas y mensajes cotidianos.',
        storyBeat: 'Bajo la arena hay tesoros: excavá con cuidado arqueológico.',
      },
      {
        kind: 'game',
        title: 'Excavar tesoros',
        summary: 'Encontrá artefactos sin romper el yacimiento.',
        storyBeat: 'Leé cómo se alzaron las pirámides sin grúas modernas.',
      },
      {
        kind: 'reading',
        title: 'Construcción de las pirámides',
        summary: 'Ingenio, trabajo en equipo y persistencia.',
        storyBeat: 'Firmá tu hallazgo con tu nombre en jeroglíficos.',
      },
      {
        kind: 'activity',
        title: 'Tu nombre en jeroglíficos',
        summary: 'Diseñá tu cartela y explicá cada signo elegido.',
      },
    ],
    { rewardAvatarKey: 'avatar_detective_magnifier', seasonMonth: '2026-05' },
  ),
  m(
    3,
    'guardian-de-la-naturaleza',
    'Guardián de la Naturaleza',
    'Ecología',
    'El planeta pide ayuda: seguí la cadena alimentaria hasta el océano y volvé con un plan de acción real para tu hogar.',
    'Mascota virtual de animal rescatado',
    [
      {
        kind: 'video',
        title: 'Cadenas alimentarias en acción',
        summary: 'Productores, consumidores y equilibrios.',
        storyBeat: 'Medí tu impacto: ¿qué especies están en riesgo?',
      },
      {
        kind: 'quiz',
        title: 'Especies en peligro',
        summary: 'Causas, hábitats y cómo ayudar.',
        storyBeat: 'Limpiá el océano en un minijuego cooperativo.',
      },
      {
        kind: 'game',
        title: 'Limpiar océano',
        summary: 'Rescatá fauna marina recolectando residuos.',
        storyBeat: 'Pasá a la lectura con ideas prácticas.',
      },
      {
        kind: 'reading',
        title: 'Ayudar al planeta desde casa',
        summary: 'Reducir, reutilizar, reciclar y energía responsable.',
        storyBeat: 'Montá una compostera y documentá el proceso.',
      },
      {
        kind: 'experiment',
        title: 'Compostera casera',
        summary: 'Restos seguros, humedad y aireación.',
      },
    ],
    { rewardAvatarKey: 'virtual_pet_rescued', seasonMonth: '2026-06' },
  ),
  m(
    4,
    'chef-matematico',
    'Chef Matemático',
    'Fracciones',
    'Un restaurante escolar abre sus puertas: cada receta exige medidas exactas y conversiones impecables.',
    'Gorro de chef para avatar',
    [
      {
        kind: 'video',
        title: 'Fracciones en la cocina',
        summary: 'Por qué 1/2 y 0,5 son el mismo ingrediente.',
        storyBeat: 'Convertí recetas entre fracciones y decimales.',
      },
      {
        kind: 'quiz',
        title: 'Fracciones y decimales',
        summary: 'Suma, resta y equivalencias con sentido culinario.',
        storyBeat: 'Cociná en el juego midiendo con exactitud.',
      },
      {
        kind: 'game',
        title: 'Recetas con medidas exactas',
        summary: 'Batí el récord sin desperdiciar ingredientes.',
        storyBeat: 'Conocé la historia de las medidas domésticas.',
      },
      {
        kind: 'reading',
        title: 'Historia de las medidas de cocina',
        summary: 'Cucharas, tazas y el sistema métrico.',
        storyBeat: 'Creá tu propia receta con fracciones.',
      },
      {
        kind: 'challenge',
        title: 'Receta propia con fracciones',
        summary: 'Ingredientes, porciones y explicación matemática.',
      },
    ],
    { rewardAvatarKey: 'avatar_chef_hat' },
  ),
  m(
    5,
    'artista-renacentista',
    'Artista Renacentista',
    'Arte',
    'Viajás al Renacimiento: del estudio de Leonardo a un museo interactivo donde el color y la perspectiva cobran vida.',
    'Paleta de pintor para avatar',
    [
      {
        kind: 'video',
        title: 'Leonardo da Vinci',
        summary: 'Curiosidad infinita entre arte y ciencia.',
        storyBeat: 'Relacioná obras icónicas con sus creadores.',
      },
      {
        kind: 'quiz',
        title: 'Obras famosas y autores',
        summary: 'Reconocé estilos y mensajes.',
        storyBeat: 'Armá rompecabezas de obras maestras.',
      },
      {
        kind: 'game',
        title: 'Puzzles de arte',
        summary: 'Recomponé detalles y descubrí anécdotas.',
        storyBeat: 'Recread una obra con materiales caseros.',
      },
      {
        kind: 'activity',
        title: 'Recrear una pintura famosa',
        summary: 'Técnica, texturas y tu interpretación.',
        storyBeat: 'Leé vidas de artistas que marcaron época.',
      },
      {
        kind: 'reading',
        title: 'Vidas de artistas',
        summary: 'Inspiración, obstáculos y legado.',
      },
    ],
    { rewardAvatarKey: 'avatar_paint_palette' },
  ),
  m(
    6,
    'bitacora-del-oceano',
    'Bitácora del Océano',
    'Ciencias marinas',
    'Zarpás en expedición: desde la zona fótica hasta la fosa, documentando vida marina y amenazas.',
    'Brújula marina para avatar',
    [
      {
        kind: 'video',
        title: 'Capas del océano',
        summary: 'Luz, presión y criaturas en cada nivel.',
        storyBeat: 'Evaluá tu conocimiento sobre ecosistemas.',
      },
      {
        kind: 'quiz',
        title: 'Vida marina y conservación',
        summary: 'Arrecifes, manglares y pesca sostenible.',
        storyBeat: 'Nadá recolectando datos en un juego de campo.',
      },
      {
        kind: 'game',
        title: 'Muestreo submarino',
        summary: 'Fotografiá especies sin alterar el hábitat.',
        storyBeat: 'Leé sobre corrientes y clima oceánico.',
      },
      {
        kind: 'reading',
        title: 'Océano y clima',
        summary: 'Corrientes que regulan la temperatura global.',
        storyBeat: 'Diseñá un experimento de densidad del agua.',
      },
      {
        kind: 'experiment',
        title: 'Salinidad y flotación',
        summary: 'Predecí resultados y anotá mediciones.',
      },
    ],
    { rewardAvatarKey: 'avatar_marine_compass', seasonMonth: '2026-07' },
  ),
  m(
    7,
    'inventor-junior',
    'Inventor Junior',
    'STEM / Inventiva',
    'Un taller abandonado cobra vida: problemas reales piden prototipos rápidos, pruebas y mejora continua.',
    'Casco de inventor para avatar',
    [
      {
        kind: 'video',
        title: 'Del problema al prototipo',
        summary: 'Design thinking adaptado a tu edad.',
        storyBeat: 'Quiz sobre materiales y fuerzas.',
      },
      {
        kind: 'quiz',
        title: 'Materiales y resistencia',
        summary: 'Flexión, fricción y seguridad.',
        storyBeat: 'Construí un mecanismo en el minijuego.',
      },
      {
        kind: 'game',
        title: 'Torre estable',
        summary: 'Equilibrá cargas bajo tiempo limitado.',
        storyBeat: 'Leé sobre inventores jóvenes.',
      },
      {
        kind: 'reading',
        title: 'Historias de inventos cotidianos',
        summary: 'Velcro, post-it y curiosidad accidental.',
        storyBeat: 'Documentá tu invento con un diagrama.',
      },
      {
        kind: 'challenge',
        title: 'Diario de iteraciones',
        summary: 'Tres versiones y qué aprendiste en cada una.',
      },
    ],
    { rewardAvatarKey: 'avatar_inventor_helmet' },
  ),
  m(
    8,
    'musa-y-ritmo',
    'Musa y Ritmo',
    'Música',
    'Un festival escolar mezcla géneros: escuchás, analizás y componés un motivo propio.',
    'Auriculares de estudio para avatar',
    [
      {
        kind: 'video',
        title: 'Familias de instrumentos',
        summary: 'Cuerda, viento, percusión y electrónica.',
        storyBeat: 'Identificá ritmos y compases en el quiz.',
      },
      {
        kind: 'quiz',
        title: 'Figuras musicales',
        summary: 'Negras, corcheas y silencios.',
        storyBeat: 'Seguí el pulso en el juego de ritmo.',
      },
      {
        kind: 'game',
        title: 'Secuencia rítmica',
        summary: 'Encadená patrones sin perder el tempo.',
        storyBeat: 'Leé sobre una obra famosa y su contexto.',
      },
      {
        kind: 'reading',
        title: 'Un concierto histórico',
        summary: 'Sala, público y emoción colectiva.',
        storyBeat: 'Componé un motivo de 4 compases.',
      },
      {
        kind: 'creative',
        title: 'Tu primer motivo',
        summary: 'Grabación simbólica o notación simple.',
      },
    ],
    { rewardAvatarKey: 'avatar_music_headphones' },
  ),
  m(
    9,
    'velocidad-lectora',
    'Velocidad Lectora',
    'Literatura',
    'Una biblioteca mágica te reta a leer con intención: predicción, inferencia y síntesis bajo cronómetro amable.',
    'Marcapáginas dorado para avatar',
    [
      {
        kind: 'video',
        title: 'Estrategias de lectura',
        summary: 'Ojear, preguntar y conectar.',
        storyBeat: 'Quiz de comprensión con textos cortos.',
      },
      {
        kind: 'quiz',
        title: 'Inferencias',
        summary: 'Qué dice el texto y qué sugiere.',
        storyBeat: 'Juego de asociación rápida de ideas.',
      },
      {
        kind: 'game',
        title: 'Carrera de ideas',
        summary: 'Uní conceptos sin perder el hilo.',
        storyBeat: 'Leé un microcuento y elegí un final.',
      },
      {
        kind: 'reading',
        title: 'Microcuento abierto',
        summary: 'Autor, conflicto y giro.',
        storyBeat: 'Escribí tu final alternativo.',
      },
      {
        kind: 'challenge',
        title: 'Dos finales posibles',
        summary: 'Compará tono y mensaje en cada uno.',
      },
    ],
    { rewardAvatarKey: 'avatar_golden_bookmark' },
  ),
  m(
    10,
    'explorador-polar',
    'Explorador Polar',
    'Clima y Ártico',
    'La base polar pierde señal: seguí huellas de fauna, hielo y datos climáticos para restaurar comunicaciones.',
    'Bufanda polar para avatar',
    [
      {
        kind: 'video',
        title: 'Ecosistema polar',
        summary: 'Fotoperíodo, adaptaciones y deriva de hielo.',
        storyBeat: 'Quiz sobre cambio climático en regiones frías.',
      },
      {
        kind: 'quiz',
        title: 'Hielo y clima',
        summary: 'Albedo, océanos y refugios de vida.',
        storyBeat: 'Trazá una ruta segura en el tablero helado.',
      },
      {
        kind: 'game',
        title: 'Travesía en icebergs',
        summary: 'Planificá movimientos sin quedar aislado.',
        storyBeat: 'Leé sobre expediciones históricas.',
      },
      {
        kind: 'reading',
        title: 'Exploradores legendarios',
        summary: 'Preparación, respeto y ciencia.',
        storyBeat: 'Simulá un informe meteorológico.',
      },
      {
        kind: 'activity',
        title: 'Parte meteorológico',
        summary: 'Temperatura, viento y recomendaciones.',
      },
    ],
    { rewardAvatarKey: 'avatar_polar_scarf' },
  ),
  m(
    11,
    'codigo-secreto',
    'Código Secreto',
    'Pensamiento computacional',
    'Un robot perdió su ruta: aprendé secuencias, bucles y condicionales para devolverlo a base.',
    'Gafas de código para avatar',
    [
      {
        kind: 'video',
        title: 'Instrucciones y algoritmos',
        summary: 'Precisión y orden en la vida cotidiana.',
        storyBeat: 'Quiz de lógica booleana sencilla.',
      },
      {
        kind: 'quiz',
        title: 'Condicionales',
        summary: 'Si-entonces aplicado a situaciones reales.',
        storyBeat: 'Programá el camino en la cuadrícula.',
      },
      {
        kind: 'game',
        title: 'Laberinto lógico',
        summary: 'Evitá obstáculos con bucles cortos.',
        storyBeat: 'Leé sobre mujeres pioneras en computación.',
      },
      {
        kind: 'reading',
        title: 'Pioneras de la computación',
        summary: 'Ideas que hoy siguen vigentes.',
        storyBeat: 'Diseñá tu propio mini-flujo.',
      },
      {
        kind: 'challenge',
        title: 'Diagrama del día',
        summary: 'Representá tu rutina con pseudocódigo.',
      },
    ],
    { rewardAvatarKey: 'avatar_code_glasses' },
  ),
  m(
    12,
    'cazador-de-fosiles',
    'Cazador de Fósiles',
    'Paleontología',
    'En el desierto aparecen capas rocosas: identificá eras, fósiles y la historia evolutiva que cuentan.',
    'Sombrero de explorador para avatar',
    [
      {
        kind: 'video',
        title: 'Tiempo geológico',
        summary: 'Eras y fósiles índice.',
        storyBeat: 'Quiz sobre dinosaurios y no dinosaurios.',
      },
      {
        kind: 'quiz',
        title: '¿Dinosaurio o no?',
        summary: 'Clasificación y rasgos clave.',
        storyBeat: 'Excavá y catalogá hallazgos.',
      },
      {
        kind: 'game',
        title: 'Campo de excavación',
        summary: 'Registrá posición y contexto.',
        storyBeat: 'Leé sobre un yacimiento famoso.',
      },
      {
        kind: 'reading',
        title: 'Historia en capas',
        summary: 'Sedimentación y registro fósil.',
        storyBeat: 'Montá una ficha de museo.',
      },
      {
        kind: 'activity',
        title: 'Ficha de especimen',
        summary: 'Nombre, época y hipótesis.',
      },
    ],
    { rewardAvatarKey: 'avatar_fossil_hat' },
  ),
  m(
    13,
    'maestro-del-cuerpo',
    'Maestro del Cuerpo',
    'Anatomía',
    'Recorrés sistemas del cuerpo humano con modelos interactivos y hábitos saludables.',
    'Estetoscopio de juguete para avatar',
    [
      {
        kind: 'video',
        title: 'Sistemas del cuerpo',
        summary: 'Digestivo, circulatorio, nervioso…',
        storyBeat: 'Quiz de órganos y funciones.',
      },
      {
        kind: 'quiz',
        title: 'Órganos y equilibrio',
        summary: 'Homeostasis en lenguaje simple.',
        storyBeat: 'Juego de ensamblar circuitos vitales.',
      },
      {
        kind: 'game',
        title: 'Cuerpo en equilibrio',
        summary: 'Nutrientes, oxígeno y descanso.',
        storyBeat: 'Leé sobre sueño y pantallas.',
      },
      {
        kind: 'reading',
        title: 'Descanso y pantallas',
        summary: 'Rutinas que ayudan al cerebro.',
        storyBeat: 'Medí tu pulso en reposo.',
      },
      {
        kind: 'experiment',
        title: 'Ritmo en reposo',
        summary: 'Antes y después de moverte con conciencia.',
      },
    ],
    { rewardAvatarKey: 'avatar_toy_stethoscope' },
  ),
  m(
    14,
    'mitos-y-leyendas',
    'Mitos y Leyendas',
    'Literatura oral',
    'Historias que cruzaron culturas: comparás versiones y creás tu propio mito explicativo.',
    'Antorcha narrativa para avatar',
    [
      {
        kind: 'video',
        title: 'Para qué sirven los mitos',
        summary: 'Miedos, valores y naturaleza.',
        storyBeat: 'Quiz sobre mitología comparada.',
      },
      {
        kind: 'quiz',
        title: 'Héroes y trampas',
        summary: 'Arquetipos y elecciones morales.',
        storyBeat: 'Elegí ramas en un relato interactivo.',
      },
      {
        kind: 'game',
        title: 'Relato ramificado',
        summary: 'Consecuencias de cada decisión.',
        storyBeat: 'Leé una leyenda local de tu región (genérica).',
      },
      {
        kind: 'reading',
        title: 'Leyenda del territorio',
        summary: 'Lugar, tiempo y enseñanza.',
        storyBeat: 'Escribí un mito sobre un fenómeno natural.',
      },
      {
        kind: 'creative',
        title: 'Tu mito natural',
        summary: 'Trueno, ríos o estrellas con personajes.',
      },
    ],
    { rewardAvatarKey: 'avatar_story_torch' },
  ),
  m(
    15,
    'robotica-en-accion',
    'Robótica en Acción',
    'Tecnología',
    'Ensamblás sensores y actuadores en simulación: el robot debe ayudar en un refugio de reciclaje.',
    'Insignia de robot para avatar',
    [
      {
        kind: 'video',
        title: 'Sensores y actuadores',
        summary: 'Qué percibe y qué mueve un robot.',
        storyBeat: 'Quiz de seguridad en el taller.',
      },
      {
        kind: 'quiz',
        title: 'Seguridad y normas',
        summary: 'Cableado, espacio y supervisión.',
        storyBeat: 'Calibrá sensores en el simulador.',
      },
      {
        kind: 'game',
        title: 'Clasificador automático',
        summary: 'Separá residuos con precisión.',
        storyBeat: 'Leé sobre robótica asistencial.',
      },
      {
        kind: 'reading',
        title: 'Robots que ayudan',
        summary: 'Hospital, hogar y respeto a la privacidad.',
        storyBeat: 'Programá una rutina simple.',
      },
      {
        kind: 'challenge',
        title: 'Rutina de 5 pasos',
        summary: 'Entrada, proceso y salida documentados.',
      },
    ],
    { rewardAvatarKey: 'avatar_robot_badge' },
  ),
  m(
    16,
    'coleccionista-de-banderas',
    'Coleccionista de Banderas',
    'Geografía',
    'Un atlas interactivo te guía por continentes, capitales y símbolos nacionales.',
    'Globo terráqueo para avatar',
    [
      {
        kind: 'video',
        title: 'Continentes y climas',
        summary: 'Patrones y diversidad humana.',
        storyBeat: 'Quiz de capitales y localización.',
      },
      {
        kind: 'quiz',
        title: 'Capitales y ríos',
        summary: 'Mapas mentales útiles.',
        storyBeat: 'Armá el mapa en el puzzle.',
      },
      {
        kind: 'game',
        title: 'Rompecabezas de mapas',
        summary: 'Piezas que encajan con datos.',
        storyBeat: 'Leé sobre fronteras y cooperación.',
      },
      {
        kind: 'reading',
        title: 'Vecinos en el mapa',
        summary: 'Comercio, cultura y respeto.',
        storyBeat: 'Creá tu pasaporte simbólico.',
      },
      {
        kind: 'activity',
        title: 'Pasaporte de aprendiz',
        summary: 'Tres países que te gustaría visitar y por qué.',
      },
    ],
    { rewardAvatarKey: 'avatar_globe_pin' },
  ),
  m(
    17,
    'quimica-en-la-cocina',
    'Química en la Cocina',
    'Química aplicada',
    'Reacciones seguras en casa: ácidos, bases y burbujas con supervisión adulta.',
    'Matraz decorativo para avatar',
    [
      {
        kind: 'video',
        title: 'Reacciones cotidianas',
        summary: 'Levadura, vinagre y bicarbonato.',
        storyBeat: 'Quiz de estados de la materia.',
      },
      {
        kind: 'quiz',
        title: 'Mezclas y soluciones',
        summary: 'Disolución, suspensión y seguridad.',
        storyBeat: 'Simulá una cocina segura en el juego.',
      },
      {
        kind: 'game',
        title: 'Orden en el laboratorio',
        summary: 'Evitá derrames y medí bien.',
        storyBeat: 'Leé sobre nutrición y reacciones al horno.',
      },
      {
        kind: 'reading',
        title: 'Ciencia del pan',
        summary: 'Gluten, gas y dorado perfecto.',
        storyBeat: 'Diseñá un experimento con adulto/a.',
      },
      {
        kind: 'experiment',
        title: 'Burbujas medibles',
        summary: 'Hipótesis, tabla y conclusión.',
      },
    ],
    { rewardAvatarKey: 'avatar_flask_pin' },
  ),
  m(
    18,
    'criaturas-de-la-noche',
    'Criaturas de la Noche',
    'Biología',
    'Ecosistemas nocturnos: ecolocalización, camuflaje y conservación del hábitat.',
    'Antifaz de búho para avatar',
    [
      {
        kind: 'video',
        title: 'Adaptaciones nocturnas',
        summary: 'Visión, oído y olfato.',
        storyBeat: 'Quiz sobre depredadores y presas.',
      },
      {
        kind: 'quiz',
        title: 'Cadenas nocturnas',
        summary: 'Quién caza y quién se esconde.',
        storyBeat: 'Seguí rastros en el juego.',
      },
      {
        kind: 'game',
        title: 'Sendero del bosque',
        summary: 'Decisiones silenciosas.',
        storyBeat: 'Leé sobre murciélagos y mitos.',
      },
      {
        kind: 'reading',
        title: 'Murciélagos útiles',
        summary: 'Polinización y control de plagas.',
        storyBeat: 'Diseñá un cartel de conservación.',
      },
      {
        kind: 'creative',
        title: 'Cartel nocturno',
        summary: 'Mensaje claro para tu comunidad.',
      },
    ],
    { rewardAvatarKey: 'avatar_owl_mask' },
  ),
  m(
    19,
    'dia-de-la-tierra-especial',
    'Eco-Héroe: Día de la Tierra',
    'Sostenibilidad',
    'Una semana de acciones concretas para reducir huella y celebrar el planeta.',
    'Broche planeta verde para avatar',
    [
      {
        kind: 'video',
        title: 'Huella ecológica',
        summary: 'Agua, energía y transporte.',
        storyBeat: 'Quiz de hábitos sostenibles.',
      },
      {
        kind: 'quiz',
        title: '¿Sostenible o no?',
        summary: 'Decisiones cotidianas.',
        storyBeat: 'Juego de clasificación de residuos.',
      },
      {
        kind: 'game',
        title: 'Reciclaje bajo tiempo',
        summary: 'Precisión y velocidad consciente.',
        storyBeat: 'Leé sobre reforestación comunitaria.',
      },
      {
        kind: 'reading',
        title: 'Bosques y comunidad',
        summary: 'Participación y cuidado colectivo.',
        storyBeat: 'Plan de 3 acciones para tu casa.',
      },
      {
        kind: 'challenge',
        title: 'Compromiso semanal',
        summary: 'Metas medibles y seguimiento.',
      },
    ],
    {
      rewardAvatarKey: 'avatar_earth_pin',
      festivity: 'earth_day',
      seasonMonth: '2026-04',
      availableFrom: '2026-04-15T00:00:00.000Z',
      availableUntil: '2026-04-30T23:59:59.999Z',
    },
  ),
  m(
    20,
    'noche-de-misterios',
    'Noche de Misterios',
    'Halloween educativo',
    'Una mansión de libros esconde enigmas: aprendé sobre miedos, luces y seguridad en festividades.',
    'Calabaza amigable para avatar',
    [
      {
        kind: 'video',
        title: 'Orígenes de Halloween',
        summary: 'Tradición, respeto y creatividad.',
        storyBeat: 'Quiz de seguridad al salir de casa.',
      },
      {
        kind: 'quiz',
        title: 'Seguridad y visibilidad',
        summary: 'Rutas, adultos y cruces.',
        storyBeat: 'Resolvé acertijos en el pasillo oscuro (virtual).',
      },
      {
        kind: 'game',
        title: 'Pasillo de pistas',
        summary: 'Linterna, mapa y paciencia.',
        storyBeat: 'Leé un cuento corto de suspense apto.',
      },
      {
        kind: 'reading',
        title: 'Suspenso sin terror gráfico',
        summary: 'Ambiente y ritmo narrativo.',
        storyBeat: 'Diseñá un disfraz creativo reciclado.',
      },
      {
        kind: 'creative',
        title: 'Disfraz con materiales reciclados',
        summary: 'Lista de materiales y boceto.',
      },
    ],
    {
      rewardAvatarKey: 'avatar_pumpkin_buddy',
      festivity: 'halloween',
      availableFrom: '2026-10-20T00:00:00.000Z',
      availableUntil: '2026-11-02T23:59:59.999Z',
    },
  ),
  m(
    21,
    'navidad-solidaria',
    'Navidad Solidaria',
    'Valores y comunidad',
    'Historias de generosidad cruzan el mundo: armás una cadena de buenas acciones locales.',
    'Gorro festivo para avatar',
    [
      {
        kind: 'video',
        title: 'Fiestas alrededor del mundo',
        summary: 'Luces, compartir y descanso.',
        storyBeat: 'Quiz sobre empatía y escucha activa.',
      },
      {
        kind: 'quiz',
        title: 'Empatía práctica',
        summary: 'Pequeños gestos, gran impacto.',
        storyBeat: 'Juego de logística de donaciones (simulado).',
      },
      {
        kind: 'game',
        title: 'Ruta de donaciones',
        summary: 'Optimizar tiempo y cuidado.',
        storyBeat: 'Leé sobre tradiciones solidarias.',
      },
      {
        kind: 'reading',
        title: 'Historias de ayuda mutua',
        summary: 'Vecinos, escuela y familia.',
        storyBeat: 'Plan de acción en tu comunidad.',
      },
      {
        kind: 'activity',
        title: 'Cadena de buenas acciones',
        summary: 'Tres ideas realistas con adulto/a.',
      },
    ],
    {
      rewardAvatarKey: 'avatar_festive_hat',
      festivity: 'christmas',
      availableFrom: '2026-12-15T00:00:00.000Z',
      availableUntil: '2027-01-07T23:59:59.999Z',
    },
  ),
  m(
    22,
    'laboratorio-de-electricidad',
    'Laboratorio de Electricidad',
    'Física',
    'Circuitos simples, seguridad y energía responsable en el día a día.',
    'Rayo brillante para avatar',
    [
      {
        kind: 'video',
        title: 'Carga y corriente',
        summary: 'Analogía del agua y precauciones.',
        storyBeat: 'Quiz de materiales conductores y aislantes.',
      },
      {
        kind: 'quiz',
        title: 'Conductores',
        summary: 'Metal, plástico y contexto seguro.',
        storyBeat: 'Armá circuitos en simulación.',
      },
      {
        kind: 'game',
        title: 'Circuito encendido',
        summary: 'Interruptores en serie y paralelo (simplificado).',
        storyBeat: 'Leé sobre energías renovables.',
      },
      {
        kind: 'reading',
        title: 'Energía limpia',
        summary: 'Sol, viento y pequeñas decisiones.',
        storyBeat: 'Diseñá un cartel de ahorro energético.',
      },
      {
        kind: 'challenge',
        title: 'Ahorro medible',
        summary: 'Apagar, desenchufar y registrar una semana.',
      },
    ],
    { rewardAvatarKey: 'avatar_lightning_pin', seasonMonth: '2026-08' },
  ),
  m(
    23,
    'comunidad-votada-lectura',
    'Desafío de Lectura Grupal',
    'Comunidad (votada)',
    'Propuesta comunitaria: leer el mismo libro corto y debatir con respeto en foros guiados.',
    'Insignia de comunidad (lectura) para avatar',
    [
      {
        kind: 'reading',
        title: 'Libro corto compartido',
        summary: 'Capítulos con preguntas guía.',
        storyBeat: 'Anotá personajes favoritos.',
      },
      {
        kind: 'quiz',
        title: 'Comprensión colectiva',
        summary: 'Inferencias y vocabulario.',
        storyBeat: 'Prepará una pregunta para el círculo.',
      },
      {
        kind: 'activity',
        title: 'Círculo de preguntas',
        summary: 'Escuchar, turnarse, sintetizar.',
        storyBeat: 'Creá un fan-art del escenario.',
      },
      {
        kind: 'creative',
        title: 'Fan-art o mapa de escena',
        summary: 'Representación libre con materiales simples.',
        storyBeat: 'Escribí una reseña de cuatro oraciones.',
      },
      {
        kind: 'challenge',
        title: 'Reseña breve',
        summary: 'Sin spoilers injustos; tono amable.',
      },
    ],
    { source: 'community', seasonMonth: '2026-09' },
  ),
  m(
    24,
    'comunidad-votada-ciencia',
    'Ciencia en el Barrio',
    'Comunidad (votada)',
    'Propuesta comunitaria: medir datos locales (ruido, temperatura o basura) y presentar conclusiones.',
    'Insignia de comunidad (ciencia) para avatar',
    [
      {
        kind: 'video',
        title: 'Ciencia ciudadana',
        summary: 'Hipótesis en tu entorno cercano.',
        storyBeat: 'Elegí variable y método simple.',
      },
      {
        kind: 'quiz',
        title: 'Método científico',
        summary: 'Observación, medición, conclusión.',
        storyBeat: 'Recolectá datos en tabla.',
      },
      {
        kind: 'game',
        title: 'Tablero de datos',
        summary: 'Sin trampas: honestidad en los números.',
        storyBeat: 'Leé sobre sesgos comunes.',
      },
      {
        kind: 'reading',
        title: 'Sesgos y muestras',
        summary: 'Por qué importa repetir mediciones.',
        storyBeat: 'Presentá resultados en dos viñetas.',
      },
      {
        kind: 'challenge',
        title: 'Informe de dos viñetas',
        summary: 'Qué mediste y qué harías después.',
      },
    ],
    { source: 'community', seasonMonth: '2026-10' },
  ),
  m(
    25,
    'sprint-carnaval-creativo',
    'Sprint Carnaval Creativo',
    'Carnaval',
    'Una misión corta y urgente: ritmo, color y responsabilidad en grupo antes de que termine el tiempo.',
    'Máscara de carnaval para avatar',
    [
      {
        kind: 'video',
        title: 'Carnavales y cultura',
        summary: 'Respeto, inclusión y alegría compartida.',
        storyBeat: 'Quiz de trabajo en equipo.',
      },
      {
        kind: 'quiz',
        title: 'Roles en grupo',
        summary: 'Quién organiza, quién anima, quién documenta.',
        storyBeat: 'Ensayá una coreo corta en el juego.',
      },
      {
        kind: 'game',
        title: 'Coreografía exprés',
        summary: 'Sincronía sin competir en vano.',
        storyBeat: 'Elegí materiales reciclados.',
      },
      {
        kind: 'activity',
        title: 'Disfraz reciclado exprés',
        summary: 'Boceto rápido y lista de materiales.',
        storyBeat: 'Presentación final en 30 segundos simbólicos.',
      },
      {
        kind: 'challenge',
        title: 'Presentación final',
        summary: 'Mensaje positivo para tu clase.',
      },
    ],
    {
      rewardAvatarKey: 'avatar_carnival_mask',
      festivity: 'carnival',
      urgentUntil: '2026-04-25T23:59:59.999Z',
      availableFrom: '2026-04-01T00:00:00.000Z',
      availableUntil: '2026-04-30T23:59:59.999Z',
    },
  ),
];

const bySlug = new Map(THEMATIC_MISSIONS.map((x) => [x.slug, x]));

export function getThematicMissionBySlug(slug: string): ThematicMissionDef | undefined {
  return bySlug.get(slug);
}

export function thematicMissionStepCount(def: ThematicMissionDef): number {
  return def.steps.length;
}

function parseIso(d: string | null): Date | null {
  if (!d) return null;
  const t = Date.parse(d);
  return Number.isNaN(t) ? null : new Date(t);
}

/** Disponibilidad por ventanas temporales y festividades (catálogo). */
export function isThematicMissionAvailableNow(def: ThematicMissionDef, now: Date): boolean {
  const from = parseIso(def.availableFrom);
  const until = parseIso(def.availableUntil);
  if (from && now < from) return false;
  if (until && now > until) return false;
  return true;
}

export function computeProgressRatio(currentStepIndex: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0;
  return Math.min(100, Math.max(0, (currentStepIndex / totalSteps) * 100));
}

export interface MapNode {
  stepOrder: number;
  label: string;
  x: number;
  y: number;
}

/** Mapa visual tipo recorrido (coordenadas 0–100 para layout en cliente). */
export function buildMissionMapNodes(def: ThematicMissionDef): MapNode[] {
  const n = def.steps.length;
  if (n === 0) return [];
  return def.steps.map((s, i) => {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = Math.round(t * 100);
    const y = Math.round(50 + 18 * Math.sin((i + 1) * 1.1));
    return { stepOrder: s.order, label: s.title, x, y };
  });
}

export function currentSeasonMonthUtc(now: Date): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
