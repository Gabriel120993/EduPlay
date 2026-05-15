# Changelog

## [Unreleased]

- Auditoría de calidad y seguridad (tests de integración, seguridad HTTP, Zod estricto en auth).
- Refactor parcial: `auth.service.ts` (registro/login tutor-menor), `contentList.service.ts` (listado educativo), `mapQuizCategoryToContentCategory` en `quiz.service.ts`.
- Schemas Zod `.strict()` en credenciales de login, registro tutor/menor y pares de amistad.
- Documentación: `LICENSE` (MIT), este changelog, README (pendiente de sección lint si se añade tooling).
