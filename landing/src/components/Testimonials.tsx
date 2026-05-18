const testimonials = [
  { name: 'MarÃ­a G.', country: 'ðŸ‡¦ðŸ‡·', role: 'MamÃ¡ de Valentina, 7 aÃ±os', text: 'Valentina pide jugar sola. Noto que pregunta mÃ¡s y cuestiona las cosas.', rating: 5 },
  { name: 'Carlos R.', country: 'ðŸ‡²ðŸ‡½', role: 'PapÃ¡ de Emilio, 10 aÃ±os', text: 'Vi cÃ³mo Emilio empezÃ³ a resolver problemas de lÃ³gica.', rating: 5 },
  { name: 'Ana M.', country: 'ðŸ‡ªðŸ‡¸', role: 'MamÃ¡ de Pablo, 12 aÃ±os', text: 'Sin publicidad ni compras sorpresa. EduPlay cumpliÃ³ todo.', rating: 5 },
];

export default function Testimonials() {
  return (
    <section style={{ padding: '4rem 1rem', background: '#1e293b' }}>
      <h2 style={{ textAlign: 'center' }}>Familias que confÃ­an</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', maxWidth: 1100, margin: '2rem auto 0' }}>
        {testimonials.map((t) => (
          <blockquote key={t.name} style={{ background: '#334155', padding: '1.25rem', borderRadius: 12, margin: 0 }}>
            <p>&ldquo;{t.text}&rdquo;</p>
            <footer style={{ marginTop: '1rem', opacity: 0.85 }}>
              {t.country} {t.name} â€” {t.role}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

