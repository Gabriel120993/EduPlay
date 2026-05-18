const features = [
  { icon: 'ðŸŽ®', title: 'Juegos que entrenan', description: 'Memory, lÃ³gica, matemÃ¡ticas, idiomas. Cada juego desarrolla una habilidad real.' },
  { icon: 'ðŸ¤', title: 'Amigos seguros', description: 'ConexiÃ³n solo entre menores verificados. Sin contactos de extraÃ±os.' },
  { icon: 'ðŸ‘¨â€ðŸ‘©â€ðŸ‘§', title: 'TÃº tienes el control', description: 'LÃ­mite de tiempo, reportes semanales, aprobaciÃ³n de contactos.' },
  { icon: 'ðŸ“š', title: 'Biblioteca infinita', description: 'Videos, audiolibros, cÃ³mics educativos por edad e interÃ©s.' },
  { icon: 'ðŸ†', title: 'Progreso real', description: 'XP, niveles, logros. Tu hijo ve cÃ³mo mejora dÃ­a a dÃ­a.' },
  { icon: 'ðŸŒ', title: 'En tu idioma', description: 'EspaÃ±ol e inglÃ©s. MÃ¡s idiomas prÃ³ximamente.' },
];

export default function Features() {
  return (
    <section id="features" style={{ padding: '4rem 1rem', background: '#1e293b' }}>
      <h2 style={{ textAlign: 'center', fontSize: '2rem', marginBottom: '2rem' }}>Por quÃ© EduPlay</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1.5rem',
          maxWidth: 1100,
          margin: '0 auto',
        }}
      >
        {features.map((f) => (
          <article
            key={f.title}
            style={{
              background: '#334155',
              borderRadius: 16,
              padding: '1.5rem',
            }}
          >
            <span style={{ fontSize: '2rem' }}>{f.icon}</span>
            <h3 style={{ margin: '0.75rem 0 0.5rem' }}>{f.title}</h3>
            <p style={{ margin: 0, opacity: 0.85, lineHeight: 1.5 }}>{f.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

