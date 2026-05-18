export type Locale = 'es' | 'en';

export const translations = {
  es: {
    meta: {
      title: 'EduPlay — Red social educativa para niños',
      description:
        'Donde los niños hacen amigos mientras aprenden. Juegos, biblioteca y control parental en un lugar seguro.',
    },
    hero: {
      titleLine1: 'Donde los niños hacen amigos',
      titleLine2: 'mientras aprenden',
      subtitle:
        'La primera red social educativa. Juegos, videos y amigos en un lugar seguro.',
      ctaPrimary: 'Descargar gratis',
      ctaSecondary: 'Ver características',
      ctaLogin: 'Iniciar sesión',
      badges: ['Sin publicidad', 'Control parental', 'Contenido verificado'],
    },
    features: {
      heading: 'Por qué EduPlay',
      items: [
        {
          icon: '🎮',
          title: 'Juegos que entretienen',
          description:
            'Memory, lógica, matemáticas e idiomas. Cada juego desarrolla una habilidad real.',
        },
        {
          icon: '🤝',
          title: 'Amigos seguros',
          description:
            'Conexión solo entre menores verificados. Sin contactos con desconocidos.',
        },
        {
          icon: '👨‍👩‍👧',
          title: 'Vos tenés el control',
          description:
            'Límite de tiempo, reportes semanales y aprobación de contactos.',
        },
        {
          icon: '📚',
          title: 'Biblioteca infinita',
          description:
            'Videos, audiolibros y cómics educativos por edad e interés.',
        },
        {
          icon: '🏆',
          title: 'Progreso real',
          description:
            'XP, niveles y logros. Tu hijo ve cómo mejora día a día.',
        },
        {
          icon: '🌐',
          title: 'En tu idioma',
          description: 'Español e inglés. Más idiomas próximamente.',
        },
      ],
    },
    testimonials: {
      heading: 'Familias que confían',
      items: [
        {
          name: 'María G.',
          country: '🇦🇷',
          role: 'Mamá de Valentina, 7 años',
          text: 'Valentina pide jugar sola. Noto que pregunta más y cuestiona las cosas.',
        },
        {
          name: 'Carlos R.',
          country: '🇲🇽',
          role: 'Papá de Emilio, 10 años',
          text: 'Vi cómo Emilio empezó a resolver problemas de lógica.',
        },
        {
          name: 'Ana M.',
          country: '🇪🇸',
          role: 'Mamá de Pablo, 12 años',
          text: 'Sin publicidad ni compras sorpresa. EduPlay cumplió todo.',
        },
      ],
    },
    pricing: {
      heading: 'Planes',
      popular: 'Más popular',
      plans: [
        {
          name: 'Gratis',
          price: '$0',
          period: 'para siempre',
          features: [
            '30 min de juego/día',
            '5 juegos básicos',
            '1 perfil',
            'Hasta 3 amigos',
            'Biblioteca limitada',
            'Sin publicidad',
          ],
          cta: 'Descargar',
        },
        {
          name: 'Premium',
          price: '$2.99',
          period: '/mes',
          features: [
            'Tiempo ilimitado',
            'Todos los juegos',
            'Amigos ilimitados',
            'Biblioteca completa',
            'Videos premium',
            'Avatar personalizado',
          ],
          cta: 'Empezar Premium',
        },
        {
          name: 'Familiar',
          price: '$4.99',
          period: '/mes',
          features: [
            'Todo Premium',
            'Hasta 3 perfiles',
            'Panel parental avanzado',
            'Reportes detallados',
          ],
          cta: 'Elegir Familiar',
        },
      ],
    },
    faq: {
      heading: 'Preguntas frecuentes',
      items: [
        {
          q: '¿A partir de qué edad se puede usar?',
          a: 'Desde los 5 años. El contenido se adapta al rango de edad.',
        },
        {
          q: '¿Es seguro para mi hijo?',
          a: 'Sí. Solo menores verificados. Control parental completo.',
        },
        { q: '¿Tiene publicidad?', a: 'No. Cero anuncios en toda la app.' },
        { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, sin penalizaciones.' },
        {
          q: '¿Funciona sin internet?',
          a: 'Algunos juegos sí. La biblioteca requiere conexión.',
        },
        {
          q: '¿Puedo tener varios hijos?',
          a: 'Sí, con el plan Familiar hasta 3 perfiles.',
        },
      ],
    },
    cta: {
      heading: 'Empezá hoy gratis',
      body: 'Descargá EduPlay en iOS o Android. Creá la cuenta del tutor en minutos.',
      button: 'Descargar EduPlay',
      login: '¿Ya tenés cuenta? Iniciá sesión',
    },
    footer: {
      tagline: 'Red social educativa para menores.',
      faq: 'FAQ',
      pricing: 'Precios',
      contact: 'Contacto',
    },
    lang: { switchTo: 'English', label: 'Idioma' },
  },
  en: {
    meta: {
      title: 'EduPlay — Educational social network for kids',
      description:
        'Where kids make friends while they learn. Games, library, and parental controls in one safe place.',
    },
    hero: {
      titleLine1: 'Where kids make friends',
      titleLine2: 'while they learn',
      subtitle:
        'The first educational social network. Games, videos, and friends in a safe place.',
      ctaPrimary: 'Download free',
      ctaSecondary: 'See features',
      ctaLogin: 'Sign in',
      badges: ['No ads', 'Parental controls', 'Verified content'],
    },
    features: {
      heading: 'Why EduPlay',
      items: [
        {
          icon: '🎮',
          title: 'Games that entertain',
          description:
            'Memory, logic, math, and languages. Each game builds a real skill.',
        },
        {
          icon: '🤝',
          title: 'Safe friends',
          description:
            'Connections only between verified minors. No contact with strangers.',
        },
        {
          icon: '👨‍👩‍👧',
          title: "You're in control",
          description: 'Time limits, weekly reports, and contact approval.',
        },
        {
          icon: '📚',
          title: 'Endless library',
          description:
            'Videos, audiobooks, and educational comics by age and interest.',
        },
        {
          icon: '🏆',
          title: 'Real progress',
          description:
            'XP, levels, and achievements. Your child sees how they improve day by day.',
        },
        {
          icon: '🌐',
          title: 'In your language',
          description: 'Spanish and English. More languages coming soon.',
        },
      ],
    },
    testimonials: {
      heading: 'Families who trust us',
      items: [
        {
          name: 'María G.',
          country: '🇦🇷',
          role: 'Valentina\'s mom, age 7',
          text: 'Valentina asks to play on her own. I notice she asks more questions and thinks things through.',
        },
        {
          name: 'Carlos R.',
          country: '🇲🇽',
          role: 'Emilio\'s dad, age 10',
          text: 'I saw how Emilio started solving logic problems.',
        },
        {
          name: 'Ana M.',
          country: '🇪🇸',
          role: 'Pablo\'s mom, age 12',
          text: 'No ads and no surprise purchases. EduPlay delivered on everything.',
        },
      ],
    },
    pricing: {
      heading: 'Plans',
      popular: 'Most popular',
      plans: [
        {
          name: 'Free',
          price: '$0',
          period: 'forever',
          features: [
            '30 min of play/day',
            '5 basic games',
            '1 profile',
            'Up to 3 friends',
            'Limited library',
            'No ads',
          ],
          cta: 'Download',
        },
        {
          name: 'Premium',
          price: '$2.99',
          period: '/month',
          features: [
            'Unlimited play time',
            'All games',
            'Unlimited friends',
            'Full library',
            'Premium videos',
            'Custom avatar',
          ],
          cta: 'Start Premium',
        },
        {
          name: 'Family',
          price: '$4.99',
          period: '/month',
          features: [
            'Everything in Premium',
            'Up to 3 profiles',
            'Advanced parent dashboard',
            'Detailed reports',
          ],
          cta: 'Choose Family',
        },
      ],
    },
    faq: {
      heading: 'Frequently asked questions',
      items: [
        {
          q: 'What is the minimum age?',
          a: 'From age 5. Content adapts to the child\'s age range.',
        },
        {
          q: 'Is it safe for my child?',
          a: 'Yes. Verified minors only. Full parental controls.',
        },
        { q: 'Does it have ads?', a: 'No. Zero ads across the entire app.' },
        { q: 'Can I cancel anytime?', a: 'Yes, with no penalties.' },
        {
          q: 'Does it work offline?',
          a: 'Some games do. The library requires a connection.',
        },
        {
          q: 'Can I add more than one child?',
          a: 'Yes, with the Family plan you get up to 3 profiles.',
        },
      ],
    },
    cta: {
      heading: 'Start free today',
      body: 'Download EduPlay on iOS or Android. Create your parent account in minutes.',
      button: 'Download EduPlay',
      login: 'Already have an account? Sign in',
    },
    footer: {
      tagline: 'Educational social network for minors.',
      faq: 'FAQ',
      pricing: 'Pricing',
      contact: 'Contact',
    },
    lang: { switchTo: 'Español', label: 'Language' },
  },
} as const;

export type Translation = (typeof translations)['es'];
