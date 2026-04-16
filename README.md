# EduPlay

Plataforma educativa con enfoque social para menores y tutores, compuesta por:

- una API backend en `Node.js + Express + TypeScript + Prisma + PostgreSQL`
- una app móvil en `React Native + Expo`

---

## Stack Tecnológico

### Backend (`/`)

- `Node.js` + `TypeScript`
- `Express`
- `Prisma` + `PostgreSQL`
- `JWT` + `bcrypt`
- `Zod` para validación
- `Vitest` + `Supertest` para pruebas
- `Testcontainers` para integración con PostgreSQL real en CI/local

### Mobile (`/mobile`)

- `Expo`
- `React Native`
- `React Navigation`
- `Axios`
- `expo-notifications`, `expo-in-app-purchases`, `expo-av`, etc.

---

## Estructura del Repositorio

```text
.
├─ src/                  # API backend (controladores, rutas, middlewares, lib)
├─ prisma/               # Schema Prisma, migraciones y seed
├─ tests/                # Tests rápidos + tests con DB real
├─ mobile/               # App Expo / React Native
├─ legal/                # Contenido legal
├─ scripts/              # Scripts utilitarios
└─ .github/workflows/    # CI de GitHub Actions
```

---

## Requisitos

- `Node.js 22+`
- `npm 10+`
- `PostgreSQL` local (para correr backend con DB local)
- `Docker` (para `npm run test:db`)

---

## Instalación

### 1) Backend

```bash
npm install
```

Copiar variables de entorno:

```bash
cp .env.example .env
```

> En Windows PowerShell:
>
> ```powershell
> Copy-Item .env.example .env
> ```

### 2) Mobile

```bash
cd mobile
npm install
```

---

## Variables de Entorno (Backend)

Archivo base: `.env.example`.

Variables clave:

- `PORT`: puerto del servidor (default `3000`)
- `NODE_ENV`: `development` / `test` / `production`
- `DATABASE_URL`: conexión PostgreSQL de Prisma
- `JWT_SECRET`: obligatorio, mínimo 32 caracteres
- `BCRYPT_ROUNDS`: recomendado entre `10` y `14`
- `TRUST_PROXY`: `true` si estás detrás de reverse proxy

Opcionales importantes:

- límites de rate-limiting (`LOGIN_REGISTER_RATE_LIMIT_*`, `API_*`, etc.)
- IAP (`APPLE_IAP_SHARED_SECRET`, `GOOGLE_PLAY_*`)
- Cloudinary (`CLOUDINARY_*`)

---

## Base de Datos (Prisma)

Generar cliente Prisma:

```bash
npm run prisma:generate
```

Migración en desarrollo:

```bash
npm run prisma:migrate
```

Aplicar migraciones en despliegue:

```bash
npm run prisma:migrate:deploy
```

Semillas:

```bash
npm run db:seed
```

Abrir Prisma Studio:

```bash
npm run prisma:studio
```

---

## Ejecutar la App

### Backend (desarrollo)

```bash
npm run dev
```

### Backend (build + producción)

```bash
npm run build
npm run start
```

### Mobile (Expo)

Desde `mobile/`:

```bash
npm run dev
```

Opciones:

- `npm run android`
- `npm run ios`
- `npm run web`

---

## Docker (compartir con colegas)

Se incluye dockerización del backend + PostgreSQL con `docker-compose`.

### Requisitos

- Docker Desktop / Docker Engine
- Docker Compose v2

### Levantar todo

Primero (opcional pero recomendado), preparar entorno para Docker:

```bash
cp .env.docker.example .env.docker
```

Luego exportar al shell las variables (al menos `JWT_SECRET`) o definirlas en tu entorno.

Después levantar:

```bash
docker compose up --build
```

Servicios levantados:

- API: `http://localhost:3800` (host)
- Healthcheck API: `http://localhost:3800/api/health`
- PostgreSQL: `localhost:5432`

### Ejecutar en segundo plano

```bash
docker compose up -d --build
```

### Ver logs

```bash
docker compose logs -f api
docker compose logs -f db
```

### Apagar servicios

```bash
docker compose down
```

### Apagar y borrar volumen de base de datos

```bash
docker compose down -v
```

### Variables importantes en Docker

- `JWT_SECRET`: configurala en tu entorno antes de levantar.
- `API_HOST_PORT`: puerto host para exponer la API (default `3800` para evitar conflictos con procesos locales).
- `DATABASE_URL` ya está resuelta dentro de Docker (`db:5432`).
- Para integraciones opcionales (Cloudinary/IAP), podés exportar variables antes de `docker compose up`.

> El contenedor de API aplica `prisma migrate deploy` automáticamente al iniciar.

---

## API: Endpoints Principales

### Salud / públicos

- `GET /`
- `GET /api/health`
- `GET /api/content-categories`

### Módulos de API (`/api/...`)

- `auth`
- `account`
- `parents`
- `users`
- `content`
- `quiz` / `visual-quiz`
- `posts` / `reactions`
- `friends`
- `chat` + `messages`
- `game-results`
- `achievements` / `user-achievements`
- `analytics`
- `reports`
- `media`

> La app también mantiene algunos prefijos legacy/directos (`/auth`, `/friends`, `/posts`, etc.) con middlewares de seguridad y rate limit.

---

## Seguridad

- Headers de seguridad con `helmet`
- `cors` habilitado
- JWT HS256 con expiración (7 días)
- Middleware global de autenticación + control de cuenta infantil aprobada
- Rate-limits por IP y por usuario autenticado
- Validación de payloads con `zod`

---

## Testing

### Suite rápida (sin contenedor)

```bash
npm test
```

Incluye smoke tests y tests de integración con mocks.

### Suite integración DB real (Docker + PostgreSQL temporal)

```bash
npm run test:db
```

### Preparación explícita de Prisma para tests

```bash
npm run test:prepare
```

---

## CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

Se ejecuta en `push` y `pull_request` con dos jobs:

1. `test`: instala dependencias, prepara Prisma y ejecuta `npm test`.
2. `test-db`: instala dependencias, prepara Prisma y ejecuta `npm run test:db`.

---

## Publicar imagen en DockerHub

Workflow: `.github/workflows/docker-publish.yml`

Publica la imagen del backend en DockerHub cuando hay `push` a `main`, tags `v*.*.*` o ejecución manual (`workflow_dispatch`).

### Secrets requeridos en GitHub

- `DOCKERHUB_USERNAME`
- `DOCKERHUB_TOKEN` (access token de DockerHub)

La imagen se publica como:

- `DOCKERHUB_USERNAME/eduplay-api:latest` (solo rama principal)
- `DOCKERHUB_USERNAME/eduplay-api:<branch>`
- `DOCKERHUB_USERNAME/eduplay-api:<tag>`
- `DOCKERHUB_USERNAME/eduplay-api:sha-...`

### Seed demo en Docker

El contenedor API ahora soporta:

- `AUTO_SEED_DEMO=true`: ejecuta `npm run db:seed` al iniciar.
- `AUTO_SEED_DEMO=false`: no ejecuta seed (valor recomendado luego del primer arranque).

Credenciales demo ya definidas en `prisma/seed.ts`:

- contraseña para tutor/menores: `EduPlayDemo2026`
- tutores: `seed.parent1@eduplay.demo`, `seed.parent2@eduplay.demo`
- menores: `lucia_explora`, `mateo_numeros`, `sofia_ciencia`, `daniel_mapas`, `emma_lectora`

### Servidor privado usando imagen publicada

Se agregó `Dockerfile.private-server` para construir una imagen final desde DockerHub:

```bash
docker build -f Dockerfile.private-server --build-arg BASE_IMAGE=docker.io/<tu_usuario>/eduplay-api:latest -t eduplay-api-private .
```

Luego podés correrla en tu servidor con `DATABASE_URL`, `JWT_SECRET` y `AUTO_SEED_DEMO=true` en el primer arranque.

---

## Deploy en VPS con Docker Compose

Se agregó `docker-compose.prod.yml` para correr API + PostgreSQL usando imagen publicada en DockerHub.

### Pasos rápidos

1. Copiar archivo de entorno:

```bash
cp .env.prod.example .env.prod
```

2. Editar `.env.prod` (mínimo: `POSTGRES_PASSWORD`, `JWT_SECRET`, `DOCKERHUB_IMAGE`).

3. Primer arranque con datos demo (opcional):

- `AUTO_SEED_DEMO=true` solo en el primer `up`.
- luego volver a `AUTO_SEED_DEMO=false`.

4. Levantar servicios:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

5. Verificar estado:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml ps
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f api
```

---

## Problemas Comunes

### 1) `EADDRINUSE: address already in use :::3000`

El puerto está ocupado. Soluciones:

- cerrar el proceso existente
- cambiar `PORT` en `.env`

### 2) Error Prisma en Windows (`EPERM ... query_engine-windows.dll.node`)

Puede ocurrir por bloqueo del archivo (antivirus/IDE/proceso en uso). Sugerencias:

- cerrar procesos Node/Prisma activos
- reintentar `npm run prisma:generate`
- evitar ejecutar comandos de generación simultáneamente

### 3) `npm run test:db` falla

- verificar Docker encendido
- revisar permisos para descargar/ejecutar imagen `postgres:16-alpine`

---

## Scripts Disponibles (Backend)

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run test`
- `npm run test:watch`
- `npm run test:db`
- `npm run test:prepare`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:migrate:deploy`
- `npm run prisma:studio`
- `npm run db:seed`
- `npm run db:repair-checksums`

---

## Estado actual del proyecto

- Backend compilando correctamente (`npm run build`)
- Suite rápida de tests pasando
- Suite de integración con PostgreSQL real (Testcontainers) pasando
- CI configurada para validar ambas suites automáticamente

---

## Contribuir

Si vas a colaborar en el proyecto, seguí la guía en `CONTRIBUTING.md` para ramas, commits, PRs, tests y cambios de API/DB.
