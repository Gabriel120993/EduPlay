/** Documentación OpenAPI mínima (endpoints principales). */
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'EduPlay API',
    version: '1.0.0',
    description: 'API educativa con enfoque social para menores y tutores.',
  },
  servers: [{ url: '/api', description: 'API base' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: { '200': { description: 'Servicio operativo' } },
      },
    },
    '/auth/register': {
      post: {
        summary: 'Registro de tutor',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 8 },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Cuenta creada' }, '409': { description: 'Conflicto' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login tutor o menor',
        responses: { '200': { description: 'Token JWT' }, '401': { description: 'Credenciales inválidas' } },
      },
    },
    '/auth/me': {
      get: {
        summary: 'Sesión actual',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Perfil de sesión' }, '401': { description: 'No autenticado' } },
      },
    },
    '/content': {
      get: {
        summary: 'Listado de contenido educativo',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', maximum: 100 } },
        ],
        responses: { '200': { description: 'Lista paginada' } },
      },
    },
    '/quizzes': {
      get: {
        summary: 'Listado de quizzes',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Quizzes publicados' } },
      },
    },
    '/friends': {
      get: {
        summary: 'Amigos del menor',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Lista de amigos' } },
      },
    },
    '/chat/threads': {
      get: {
        summary: 'Conversaciones del menor',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Threads' } },
      },
    },
    '/game-results': {
      post: {
        summary: 'Registrar resultado de juego',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Resultado guardado' } },
      },
    },
    '/parents/{parentId}/approvals': {
      get: {
        summary: 'Aprobaciones pendientes (tutor)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'parentId', in: 'path', required: true, schema: { type: 'string' } }],
        responses: { '200': { description: 'Solicitudes pendientes' } },
      },
    },
    '/users/me/profile': {
      get: {
        summary: 'Perfil completo del usuario autenticado',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Perfil' } },
      },
    },
    '/screen-time': {
      get: {
        summary: 'Estado de tiempo de pantalla',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Límite y uso del día' } },
      },
    },
    '/missions/daily': {
      get: {
        summary: 'Misión diaria',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Misión del día' } },
      },
    },
    '/reports': {
      post: {
        summary: 'Crear reporte de contenido',
        security: [{ bearerAuth: [] }],
        responses: { '201': { description: 'Reporte creado' } },
      },
    },
    '/premium/iap/verify': {
      post: {
        summary: 'Verificar compra in-app',
        security: [{ bearerAuth: [] }],
        responses: { '200': { description: 'Premium activado' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
} as const;
