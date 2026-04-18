-- Ejecutar manualmente en PostgreSQL cuando la tabla sea grande (evita bloqueos largos de escritura).
-- NO usar dentro de transacción. Ejemplo:
--   psql "$DATABASE_URL" -f scripts/sql/performance_indexes_concurrent.sql
--
-- Mismos índices que la migración 20260418230000_performance_indexes, pero con CONCURRENTLY.
-- Si ya existen por migrate deploy, estos fallarán con "already exists" salvo que uses otro nombre.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_gamification_level_xp"
  ON "User" ("level" DESC, "experience" DESC)
  WHERE "type" = 'minor';

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_user_gamification_snapshot_total_xp"
  ON "UserGamificationSnapshot" ("totalXpEarned" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_educational_content_published_difficulty_topic"
  ON "EducationalContent" ("published", "difficulty", "topicId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_quiz_attempts_user_finished_at"
  ON "QuizAttempt" ("userId", "finishedAt" DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_thematic_mission_progress_user_completed"
  ON "UserThematicMissionProgress" ("userId", "completed");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_friend_status_users"
  ON "Friend" ("status", "userId", "friendId");

CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_app_notification_user_unread_created"
  ON "AppNotification" ("userId", "createdAt" DESC)
  WHERE "readAt" IS NULL;
