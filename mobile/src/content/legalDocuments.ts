/**
 * Textos legales mostrados en la app. La versión canónica extendida está en `/legal/*.md` del repositorio.
 */

export type LegalSection = {
  title: string;
  body: string;
};

export const PRIVACY_POLICY_META = {
  title: "Política de privacidad",
  updated: "Abril 2026",
};

export const PRIVACY_POLICY_SECTIONS: LegalSection[] = [
  {
    title: "Introducción",
    body: "En EduPlay respetamos la privacidad de las familias y los menores. Esta política describe qué datos tratamos, con qué finalidad, y cómo se relaciona con el control parental, el uso de datos y la moderación de contenido. Al usar el servicio, el tutor o adulto responsable acepta estas prácticas en nombre del hogar.",
  },
  {
    title: "Datos que podemos recopilar",
    body: "Podemos tratar: datos de cuenta del tutor (correo, credenciales seguras); datos del perfil del menor que configure el tutor; métricas de actividad y analíticas agregadas visibles al tutor en cuentas premium; eventos técnicos necesarios para seguridad y rendimiento; tokens de notificaciones push si los activás; y contenido generado en la app (publicaciones, reacciones, etc.) sujeto a moderación. No pedimos datos innecesarios para prestar el servicio.",
  },
  {
    title: "Uso de los datos",
    body: "Usamos los datos para prestar el servicio, permitir el control parental (límites, filtros, resúmenes cuando estén disponibles), mantener la seguridad, moderar contenido, mejorar el producto con estadísticas agregadas cuando sea posible, y cumplir obligaciones legales. No vendemos datos personales de menores a terceros para publicidad dirigida.",
  },
  {
    title: "Menores y control parental",
    body: "El tutor crea la cuenta principal y autoriza los perfiles de menor. Las funciones sensibles están pensadas para ser gestionadas o supervisadas por el adulto. Si tomás conocimiento de un uso no supervisado, contactanos para restringir o cerrar cuentas según corresponda.",
  },
  {
    title: "Moderación de contenido",
    body: "Aplicamos normas de comunidad (respeto, prohibición de contenido ilegal, violento, acoso, material sexual explícito, etc.). Podemos eliminar, ocultar o restringir contenido o cuentas que incumplan las normas o la ley. Podés reportar conductas cuando la función esté disponible. La moderación puede ser automática y/o manual.",
  },
  {
    title: "Conservación, seguridad y terceros",
    body: "Conservamos datos el tiempo necesario para las finalidades descritas y para cumplir la ley. Aplicamos medidas razonables de seguridad. Podemos encargar tratamiento a proveedores (infraestructura, tiendas de apps) bajo obligaciones de confidencialidad. Consultá la versión completa en el repositorio (legal/privacy-policy.md) para más detalle.",
  },
  {
    title: "Derechos y cambios",
    body: "Podés ejercer derechos de acceso, rectificación, supresión u otros según la ley aplicable, contactando al canal oficial del proyecto. Podemos actualizar esta política; la fecha de vigencia se indicará arriba. El uso continuado tras cambios relevantes puede implicar aceptación, salvo que la ley exija otro trámite.",
  },
];

export const TERMS_OF_SERVICE_META = {
  title: "Términos del servicio",
  updated: "Abril 2026",
};

export const TERMS_OF_SERVICE_SECTIONS: LegalSection[] = [
  {
    title: "Aceptación",
    body: "Estos Términos regulan el uso de EduPlay por tutores y menores bajo su supervisión. Al registrarte o usar el servicio aceptás estos Términos y la Política de privacidad. Si no estás de acuerdo, no uses el servicio.",
  },
  {
    title: "El servicio y las cuentas",
    body: "EduPlay ofrece actividades educativas y, según la versión, funciones sociales moderadas. La cuenta de tutor debe ser creada por quien tenga capacidad para autorizar el uso por menores. Los perfiles de menor dependen del tutor, que es responsable de la información que ingrese y de la supervisión.",
  },
  {
    title: "Control parental",
    body: "El tutor puede configurar límites de pantalla, filtros de contenido, permisos sociales y ver analíticas agregadas cuando estén disponibles (algunas funciones pueden requerir suscripción). Estas herramientas son asistenciales: la supervisión activa del adulto sigue siendo esencial.",
  },
  {
    title: "Uso aceptable",
    body: "Te comprometés a un uso lícito y respetuoso: no publicar contenido ilegal, acosador, sexualmente explícito ni que vulnere la privacidad de terceros; no eludir moderación ni medidas de seguridad; no abusar técnicamente del servicio.",
  },
  {
    title: "Moderación de contenido",
    body: "EduPlay puede revisar, filtrar, ocultar o eliminar contenido o cuentas que infrinjan los Términos, la ley o la protección de menores. La moderación puede ser automática o humana. El tutor acepta que las interacciones sociales están sujetas a estas reglas.",
  },
  {
    title: "Datos personales",
    body: "El tratamiento de datos se rige por la Política de privacidad (incluye uso de datos, menores y moderación). Las suscripciones y pagos pueden estar sujetos a las condiciones de Apple App Store o Google Play.",
  },
  {
    title: "Propiedad, responsabilidad y baja",
    body: "Los contenidos de EduPlay están protegidos; recibís una licencia limitada para usar el servicio. En la medida que permita la ley, el servicio se ofrece sin garantías de disponibilidad continua; la responsabilidad por daños indirectos puede estar limitada. Podemos suspender cuentas por incumplimiento; podés dejar de usar el servicio en cualquier momento.",
  },
  {
    title: "Cambios, ley aplicable y contacto",
    body: "Podemos modificar estos Términos publicando la versión actualizada. La ley y tribunales aplicables serán los que correspondan según el responsable del servicio o los canales oficiales. Para consultas, usá el contacto indicado en la app o en la documentación del proyecto. Versión extendida: legal/terms-of-service.md en el repositorio.",
  },
];
