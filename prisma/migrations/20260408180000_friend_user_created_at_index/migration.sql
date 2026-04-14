-- Índice para contar solicitudes de amistad salientes recientes por remitente (anti-abuso).
CREATE INDEX "Friend_userId_createdAt_idx" ON "Friend"("userId", "createdAt");
