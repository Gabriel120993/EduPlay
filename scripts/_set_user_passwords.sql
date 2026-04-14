-- Misma contraseña demo que seed (EduPlayDemo2026) para login de menores.
UPDATE "User"
SET "passwordHash" = '$2b$10$sMZjqxFg2qdrdazBREswkeOfyJpD9CxtAfwTjzmZQPjiMB0p/wpVu'
WHERE "passwordHash" IS NULL;
