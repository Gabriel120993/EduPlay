# Guía de despliegue a producción

## Pre-requisitos

- [ ] Dominio configurado con DNS apuntando al servidor
- [ ] VPS con Docker y Docker Compose
- [ ] Proyecto en [Sentry](https://sentry.io) y `SENTRY_DSN` generado
- [ ] Secretos fuertes (`JWT_SECRET`, `POSTGRES_PASSWORD`) generados localmente
- [ ] `CORS_ALLOWED_ORIGINS` con dominios reales (sin `*`)

## Pasos

1. Clonar el repositorio en el servidor.
2. Copiar `.env.prod.example` a `.env.prod` y completar todos los valores.
3. Validar configuración:

   ```bash
   npm run verify:prod
   ```

4. Levantar stack:

   ```bash
   docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
   ```

5. Verificar salud:

   ```bash
   curl -sS http://localhost:3800/api/health
   curl -sS http://localhost:3800/api/health/ready
   ```

6. Configurar monitoreo externo (gratis):
   - [UptimeRobot](https://uptimerobot.com): ping cada 5 min a `https://tu-dominio.com/api/health`
   - [Better Stack](https://betterstack.com) u otro para alertas por email

7. Configurar backups (ver `docs/TROUBLESHOOTING.md` sección Backup).

## Rollback

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml down
# Desplegar imagen anterior
export DOCKERHUB_IMAGE=tu-usuario/eduplay-api:tag-anterior
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

## Checklist post-deploy

- [ ] `GET /api/health` → `200` y `database: "ok"`
- [ ] `GET /api/health/ready` → `200`
- [ ] Sentry recibe un evento de prueba (opcional: `captureMessage` desde consola)
- [ ] Rate limit en login responde `429` tras intentos repetidos
- [ ] CORS rechaza origen no listado
- [ ] Backup manual o servicio `backup` en compose probado una vez
