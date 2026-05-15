# Solución de problemas (EduPlay)

Guía breve para errores frecuentes al levantar backend, base de datos o la app móvil.

---

## Backend: `403` con `CORS_NOT_ALLOWED`

**Síntoma:** el navegador o Expo web muestra error de CORS; la API responde `403` y cuerpo con `code: CORS_NOT_ALLOWED`.

**Causa:** el origen de la petición (`Origin`) no está en `CORS_ALLOWED_ORIGINS` (y en `test`/`production` no se aplica la excepción de `localhost` de desarrollo).

**Qué hacer:**

1. Añadir el origen exacto (esquema + host + puerto si aplica) a `CORS_ALLOWED_ORIGINS` en `.env`, separado por comas.
2. En desarrollo local con Expo, suele incluirse `http://localhost:19006` y el host que use Metro.
3. Evitar `*` en producción.

---

## Backend: `JWT_SECRET` inválido o corto

**Síntoma:** fallo al arrancar o al firmar tokens.

**Qué hacer:** definir `JWT_SECRET` con al menos 32 caracteres aleatorios (ver comentario en `.env.example`).

---

## Prisma: cliente desactualizado tras cambiar el schema

**Síntoma:** errores de tipos o `Unknown arg` en runtime.

**Qué hacer:**

```bash
npx prisma generate
```

Tras pull con migraciones nuevas:

```bash
npm run prisma:migrate
```

---

## Tests con base de datos (`npm run test:db`)

**Síntoma:** fallos por Docker no disponible o timeout.

**Qué hacer:** asegurar Docker Desktop (o motor equivalente) en ejecución y volver a lanzar `npm run test:db`. En CI esto corre en un job separado con Testcontainers.

---

## Mobile: `tsc` falla tras actualizar tipos de API

**Qué hacer:** desde `mobile/`, `npm ci` y `npx tsc --noEmit`. Si el contrato de la API cambió, actualizar tipos en `mobile/src/types` o la capa que consuma `api.ts`.

---

## Docker: build de la imagen API

**Síntoma:** fallo en etapa `builder` o `runner`.

**Qué hacer:** revisar que `npm ci` en la raíz funcione en máquina local con la misma versión de Node (22+). El workflow `docker-build` en CI reproduce el build sin push.
