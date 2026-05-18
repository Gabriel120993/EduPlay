const plans = [
  {
    name: 'Gratis',
    price: '$0',
    period: 'para siempre',
    features: ['30 min de juego/dÃ­a', '5 juegos bÃ¡sicos', '1 perfil', 'Hasta 3 amigos', 'Biblioteca limitada', 'Sin publicidad'],
    cta: 'Descargar',
    popular: false,
  },
  {
    name: 'Premium',
    price: '$2.99',
    period: '/mes',
    features: ['Tiempo ilimitado', 'Todos los juegos', 'Amigos ilimitados', 'Biblioteca completa', 'Videos premium', 'Avatar personalizado'],
    cta: 'Empezar Premium',
    popular: true,
  },
  {
    name: 'Familiar',
    price: '$4.99',
    period: '/mes',
    features: ['Todo Premium', 'Hasta 3 perfiles', 'Panel parental avanzado', 'Reportes detallados'],
    cta: 'Elegir Familiar',
    popular: false,
  },
];

export default function Pricing() {
  return (
    <section id="pricing" style={{ padding: '4rem 1rem', background: '#0f172a' }}>
      <h2 style={{ textAlign: 'center', fontSize: '2rem' }}>Planes</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem', maxWidth: 1100, margin: '2rem auto 0' }}>
        {plans.map((p) => (
          <article key={p.name} style={{ border: p.popular ? '2px solid #facc15' : '1px solid #475569', borderRadius: 16, padding: '1.5rem', background: '#1e293b' }}>
            {p.popular ? <span style={{ color: '#facc15', fontWeight: 700 }}>MÃ¡s popular</span> : null}
            <h3>{p.name}</h3>
            <p style={{ fontSize: '2rem', fontWeight: 800 }}>{p.price}<span style={{ fontSize: '1rem' }}>{p.period}</span></p>
            <ul style={{ paddingLeft: '1.2rem', lineHeight: 1.8 }}>
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <a href="#download" style={{ display: 'inline-block', marginTop: '1rem', background: p.popular ? '#facc15' : '#3b82f6', color: p.popular ? '#1e3a8a' : '#fff', padding: '0.75rem 1.25rem', borderRadius: 8, fontWeight: 700 }}>{p.cta}</a>
          </article>
        ))}
      </div>
    </section>
  );
}

