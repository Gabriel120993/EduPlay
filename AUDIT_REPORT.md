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

## Juegos sociales (`PlayGame`)

| Entregable | Estado |
|------------|--------|
| Schema Prisma `PlayGame`, sesiones, leaderboard, desafíos, progreso | ✅ |
| Migración `20260518120000_add_social_play_games` | ✅ |
| 5 engines (`src/games/*`) | ✅ |
| API `/api/play-games` | ✅ |
| XP y progreso (`computePlayGameXp`, `UserPlayGameProgress`) | ✅ |
| Seed `prisma/seed-play-games.ts` | ✅ (`npm run db:seed:play-games`) |
| Tests unitarios engines + XP | ✅ |
| Mobile hub + pantallas juego/resultado/ranking/desafíos | ✅ |
| Versus solo entre amigos aceptados | ✅ |

**Nota:** `/api/games` sigue reservado a **minijuegos** (`MiniGame`). El catálogo social usa **`/api/play-games`** para no colisionar con el modelo legacy `Game`.

## Feed social + landing (`prompt_social_landing`)

| Entregable | Estado |
|------------|--------|
| PostType extendido + PostComment + desafíos grupales + rachas amigos | ✅ migración `20260518140000_social_feed_enhanced` |
| Posts automáticos (`socialFeed.service`) | ✅ integrado en PlayGame complete |
| API `/api/feed`, `/api/social-challenges`, `/api/social-streaks` | ✅ |
| Landing comercial Next.js (`landing/`) | ✅ export estático |
| Pantallas mobile sociales (7) | ✅ |
| Tests smoke feed | ✅ |

## Biblioteca multimedia (`ContentLibrary`)

| Entregable | Estado |
|------------|--------|
| Schema `ContentLibrary`, canales, progreso, bookmarks, ratings | ✅ |
| Migración `20260518160000_add_content_library` | ✅ |
| Seed 15 ítems + 5 canales (`npm run db:seed:library`) | ✅ |
| API `/api/library`, `/api/channels` | ✅ |
| Recomendaciones (`libraryRecommendation.service`) | ✅ |
| 10 pantallas mobile (reproductores video/audio/cómic) | ✅ |
| Tests smoke biblioteca | ✅ |

## Verificación

```bash
npm test
npm run test:unit
npm run lint
npm run verify:prod   # con .env.prod de prueba
npm run db:seed:play-games   # tras migrate
```
