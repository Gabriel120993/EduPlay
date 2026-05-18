const faqs = [
  { q: 'Â¿A partir de quÃ© edad se puede usar?', a: 'Desde los 5 aÃ±os. El contenido se adapta al rango de edad.' },
  { q: 'Â¿Es seguro para mi hijo?', a: 'SÃ­. Solo menores verificados. Control parental completo.' },
  { q: 'Â¿Tiene publicidad?', a: 'No. Cero anuncios en toda la app.' },
  { q: 'Â¿Puedo cancelar cuando quiera?', a: 'SÃ­, sin penalizaciones.' },
  { q: 'Â¿Funciona sin internet?', a: 'Algunos juegos sÃ­. La biblioteca requiere conexiÃ³n.' },
  { q: 'Â¿Puedo tener varios hijos?', a: 'SÃ­, con el plan Familiar hasta 3 perfiles.' },
];

export default function FAQ() {
  return (
    <section id="faq" style={{ padding: '4rem 1rem', maxWidth: 800, margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center' }}>Preguntas frecuentes</h2>
      {faqs.map((item) => (
        <details key={item.q} style={{ marginTop: '1rem', background: '#1e293b', padding: '1rem', borderRadius: 12 }}>
          <summary style={{ fontWeight: 700, cursor: 'pointer' }}>{item.q}</summary>
          <p style={{ marginTop: '0.5rem', opacity: 0.9 }}>{item.a}</p>
        </details>
      ))}
    </section>
  );
}

