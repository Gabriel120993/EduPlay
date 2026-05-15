# QA Checklist — EduPlay

Checklist manual para demo / release. Marcar cada ítem al verificarlo.

## Cuentas y sesión

- [ ] Registrar tutor con email válido
- [ ] Rechazar email duplicado
- [ ] Login tutor correcto
- [ ] Login menor con usuario y contraseña
- [ ] Cerrar sesión y volver a entrar (token / SecureStore)
- [ ] Rutas privadas sin token responden 401

## Onboarding y familia

- [ ] Tutor: flujo onboarding (si aplica) hasta completar
- [ ] Menor: onboarding / primera acción
- [ ] Tutor agrega menor desde el panel
- [ ] Tutor ve lista de menores y dashboard sin 403 (id coincide con JWT)
- [ ] Aprobar cuenta del menor pendiente

## Tiempo de pantalla (tutor)

- [ ] Activar / desactivar límite ilimitado (switch)
- [ ] Botones rápidos 30 / 60 / 90 / 120 min actualizan UI y persisten tras recargar
- [ ] Barra de progreso coherente con uso del día (UTC)

## Contenido y juego

- [ ] Feed o exploración cargan sin error
- [ ] Completar contenido educativo (si aplica)
- [ ] Quiz: responder, resultado y XP
- [ ] Subida de nivel / celebración (si aplica)

## Social y moderación

- [ ] Solicitud de amistad y aprobación por tutor (si flujo activo)
- [ ] Chat o mensajes según configuración del menor

## Seguridad (smoke)

- [ ] No se expone `passwordHash` en JSON de API
- [ ] No se accede a datos de otro usuario con token ajeno (403/404)
- [ ] Rate limit en login no permite fuerza bruta obvia (prueba manual moderada)

## Rendimiento y UX

- [ ] Pantallas principales cargan en tiempo razonable con red normal
- [ ] Estados de carga (spinner) en acciones lentas
- [ ] Mensajes de error comprensibles en español
- [ ] Empty states cuando no hay datos

## Automatizado (CI local)

- [ ] `npm run test:unit`
- [ ] `npm run test:integration`
- [ ] `npm test` (suite completa sin DB)
- [ ] `npm run test:db` (si tenés Postgres de test / Testcontainers)
- [ ] `npm run qa:audit`
- [ ] `npm run verify` (con API en marcha)

## Mobile (Expo)

- [ ] Web: `npx expo start --web` — login tutor y panel
- [ ] Dispositivo o emulador: mismo flujo crítico
- [ ] Variables `EXPO_PUBLIC_*` coherentes con el API en uso

## E2E automatizado

- [ ] Pendiente: ver `tests/e2e/README.txt` (Playwright / Detox)
