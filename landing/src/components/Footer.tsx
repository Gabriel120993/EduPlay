export default function Footer() {
  return (
    <footer style={{ padding: '2rem 1rem', borderTop: '1px solid #334155', textAlign: 'center', opacity: 0.8 }}>
      <p>Â© {new Date().getFullYear()} EduPlay. Red social educativa para menores.</p>
      <p style={{ marginTop: '0.5rem' }}>
        <a href="#faq">FAQ</a> Â· <a href="#pricing">Precios</a> Â· <a href="mailto:hola@eduplay.app">Contacto</a>
      </p>
    </footer>
  );
}

