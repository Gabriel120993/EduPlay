# Guía de Contribución

Gracias por contribuir a EduPlay.

Este documento define el flujo recomendado para colaborar en backend, mobile y base de datos sin romper estabilidad.

---

## Principios del proyecto

- Priorizar seguridad y protección de menores.
- Mantener compatibilidad de API para la app móvil.
- No mergear cambios sin pruebas.
- Hacer cambios pequeños, revisables y trazables.

---

## Requisitos para contribuir

- `Node.js 22+`
- `npm 10+`
- `Docker` (obligatorio para pruebas `test:db`)
- `PostgreSQL` local (si vas a ejecutar backend fuera de testcontainers)

Configuración base:

```bash
npm install
cp .env.example .env
```

En PowerShell:

```powershell
Copy-Item .env.example .env
```

---

## Flujo de ramas

Convención sugerida:

- `feature/<descripcion-corta>`
- `fix/<descripcion-corta>`
- `refactor/<descripcion-corta>`
- `chore/<descripcion-corta>`
- `docs/<descripcion-corta>`
- `test/<descripcion-corta>`

Ejemplos:

- `feature/parent-dashboard-notifications`
- `fix/auth-login-rate-limit`

---

## Convención de commits

Usar mensajes claros y orientados al porqué del cambio.

Formato recomendado:

```text
tipo(scope): mensaje corto en imperativo
```

Tipos sugeridos:

- `feat`
- `fix`
- `refactor`
- `test`
- `docs`
- `chore`

Ejemplos:

- `feat(auth): agregar validación de cuenta infantil aprobada`
- `fix(reports): evitar 500 por enum no disponible en tests`
- `test(api): cubrir login y rate-limit de tutor`

---

## Calidad de código (backend)

Antes de commitear o abrir un PR, conviene ejecutar:

```bash
npm run lint
npm run format:check
```

Para formatear automáticamente:

```bash
npm run format
```

**CORS:** en entornos distintos de desarrollo, definir `CORS_ALLOWED_ORIGINS` con los orígenes reales de la app web/Expo (CSV). Los tests de integración usan una lista fija sin `*`; si agregás un origen nuevo que deba pasar CORS en producción, documentalo en el PR y actualizá `.env.example` si aplica.

---

## Antes de abrir un Pull Request

Ejecutar localmente:

```bash
npm run test:prepare
npm test
npm run lint
npm run format:check
npm run test:db
npm run build
```

Si tocaste `mobile/`, además:

```bash
cd mobile
npx tsc --noEmit
```

Checklist mínima:

- [ ] compila sin errores
- [ ] tests rápidos pasan
- [ ] tests con DB real pasan
- [ ] sin secretos en commits
- [ ] documentación actualizada si cambió comportamiento

---

## Reglas para Pull Requests

### Tamaño y foco

- Un PR debe resolver un solo problema/feature principal.
- Evitar mezclar refactor + feature grande + cambios de infra en el mismo PR.

### Descripción recomendada

Incluir:

1. Problema o necesidad.
2. Solución implementada.
3. Riesgos o impactos.
4. Plan de pruebas ejecutadas.

Plantilla sugerida:

```markdown
## Resumen
- ...

## Cambios principales
- ...

## Test plan
- [x] npm test
- [x] npm run test:db
- [x] npm run build

## Riesgos / notas
- ...
```

---

## Cambios en Base de Datos (Prisma)

Si modificas `prisma/schema.prisma`:

1. Crear migración con:

   ```bash
   npm run prisma:migrate
   ```

2. Verificar que compile y tests pasen.
3. Documentar impacto en API/seed si aplica.

Evitar cambios destructivos sin plan de migración de datos.

---

## Cambios de API

Cuando cambie contrato de endpoints:

- actualizar documentación en `README.md`
- mantener compatibilidad cuando sea posible
- si hay breaking change, indicarlo explícitamente en el PR

Validar siempre:

- autenticación/autorización
- rate-limits
- respuestas de error consistentes

---

## Tests: estrategia esperada

- `npm test`: smoke + integración con mocks (rápido, obligatorio en cada iteración).
- `npm run test:db`: integración real con PostgreSQL temporal via Testcontainers.

Si agregas endpoint nuevo, incluir al menos:

- caso exitoso
- caso de validación inválida
- caso no autenticado/no autorizado (si aplica)

---

## Seguridad y secretos

- Nunca commitear `.env` ni credenciales reales.
- No incluir tokens/API keys en código, tests o fixtures.
- Revisar logs antes de subir cambios para evitar fuga de datos sensibles.

---

## CI y merge

La CI de GitHub Actions (`.github/workflows/ci.yml`) ejecuta:

- `test`
- `test-db`

No se debe mergear si alguno falla.

---

## Estilo de código

- TypeScript estricto.
- Nombres descriptivos.
- Comentarios solo cuando el bloque no sea obvio.
- Evitar complejidad accidental: preferir funciones pequeñas y explícitas.

---

## Reporte de bugs

Al reportar un bug incluir:

- entorno (`OS`, versión `node`, rama/commit)
- pasos para reproducir
- resultado esperado vs actual
- logs/error exacto
- evidencia (captura o output) cuando sea posible

---

## ¿Qué contribuciones son más valiosas?

- mejoras de seguridad y moderación
- robustez en auth/rate-limit
- tests de regresión
- mejoras de rendimiento en consultas Prisma
- documentación operativa para despliegue y soporte
