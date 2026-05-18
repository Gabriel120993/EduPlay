export default function Hero() {
  return (
    <section
      id="inicio"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
        color: '#fff',
        padding: '2rem 1rem',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, marginBottom: '1.5rem' }}>
          Donde los ninos hacen amigos
          <span style={{ display: 'block', color: '#fde047' }}>mientras aprenden</span>
        </h1>
        <p style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.5rem)', opacity: 0.9, marginBottom: '2rem' }}>
          La primera red social educativa. Juegos, videos y amigos en un lugar seguro.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
          <a href="#download" style={{ background: '#facc15', color: '#1e3a8a', padding: '1rem 2rem', borderRadius: 9999, fontWeight: 700 }}>Descargar gratis</a>
          <a href="#features" style={{ border: '2px solid #fff', padding: '1rem 2rem', borderRadius: 9999, fontWeight: 700 }}>Ver caracteristicas</a>
        </div>
        <div style={{ marginTop: '3rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'center', fontSize: '0.9rem', opacity: 0.85 }}>
          <span>Sin publicidad</span>
          <span>Control parental</span>
          <span>Contenido verificado</span>
        </div>
      </div>
    </section>
  );
}

