-- Índices de rendimiento (equivalentes funcionales a la petición original).
-- Esquema EduPlay: "User" + "UserGamificationSnapshot", "EducationalContent", "QuizAttempt",
-- "UserThematicMissionProgress", "Friend", "AppNotification".
-- Sin CONCURRENTLY para poder aplicarse dentro de la transacción de `prisma migrate deploy`.
-- Para tablas muy grandes en producción, usar además `scripts/sql/performance_indexes_concurrent.sql`.

-- Gamificación: ranking por nivel y XP (menores)
CREATE INDEX IF NOT EXISTS "idx_user_gamification_level_xp"
  ON "User" ("level" DESC, "experience" DESC)
  WHERE "type" = 'minor';

-- Gamificación: snapshot por XP total acumulada
CREATE INDEX IF NOT EXISTS "idx_user_gamification_snapshot_total_xp"
  ON "UserGamificationSnapshot" ("totalXpEarned" DESC);

-- Contenido: filtros típicos (publicado, dificultad, tema). Si más adelante hay edad en meta/JSON,
-- se pueden añadir columnas minAge/maxAge y recrear un índice compuesto.
CREATE INDEX IF NOT EXISTS "idx_educational_content_published_difficulty_topic"
  ON "EducationalContent" ("published", "difficulty", "topicId");

-- Progreso quizzes: por usuario y fecha de finalización (el modelo usa "finishedAt", no "createdAt")
CREATE INDEX IF NOT EXISTS "idx_quiz_attempts_user_finished_at"
  ON "QuizAttempt" ("userId", "finishedAt" DESC);

-- Progreso misiones temáticas
CREATE INDEX IF NOT EXISTS "idx_thematic_mission_progress_user_completed"
  ON "UserThematicMissionProgress" ("userId", "completed");

-- Amistades (tabla "Friend": userId / friendId)
CREATE INDEX IF NOT EXISTS "idx_friend_status_users"
  ON "Friend" ("status", "userId", "friendId");

-- Notificaciones: listar no leídas por usuario ordenadas por fecha
CREATE INDEX IF NOT EXISTS "idx_app_notification_user_unread_created"
  ON "AppNotification" ("userId", "createdAt" DESC)
  WHERE "readAt" IS NULL;
