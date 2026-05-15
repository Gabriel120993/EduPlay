# Informe de auditoría — progreso (EduPlay)

## Pre-launch (`prompt_prelaunch.docx`)

| Tarea | Estado |
|-------|--------|
| 1 CORS: bloquear `*` en producción | ✅ `productionSafety.ts` + validación en `env.ts` + tests |
| 2 Sentry backend + mobile | ✅ `@sentry/node`, `@sentry/react-native` (opcional con DSN) |
| 3 Backups PostgreSQL | ✅ `scripts/backup-db.sh`, servicio `backup` en compose prod, docs |
| 4 Health detallado + `/ready` | ✅ `GET /api/health`, `GET /api/health/ready` |
| 5 Legal mínima | ✅ `legal/coppa-compliance.md`, consentimiento en registro tutor |
| 6 Rate limit producción | ✅ defaults más estrictos en `env.ts` |
| 7 Secrets producción | ✅ `.env.prod.example`, `npm run verify:prod` |
| 8 Documentación deploy | ✅ `docs/DEPLOY.md` |

## Tabla auditoría anterior (resumen)

Ver commits `67429b8` y posteriores: CORS allowlist, ESLint/Prettier, servicios, Docker, i18n, OpenAPI, etc.

## Verificación

```bash
npm test
npm run lint
npm run verify:prod   # con .env.prod de prueba
```
