-- Enum canónico de categorías (un solo conjunto para juego, logro, post, misión, intereses).
CREATE TYPE "ContentCategory" AS ENUM (
  'math',
  'astronomy',
  'science',
  'geography',
  'education',
  'history',
  'puzzle',
  'sports'
);

ALTER TABLE "Game" ALTER COLUMN "category" TYPE "ContentCategory" USING ("category"::"ContentCategory");

ALTER TABLE "Achievement" ALTER COLUMN "category" TYPE "ContentCategory" USING ("category"::"ContentCategory");

ALTER TABLE "Mission" ALTER COLUMN "category" TYPE "ContentCategory" USING (
  CASE
    WHEN "category" IS NULL THEN NULL
    ELSE "category"::"ContentCategory"
  END
);

ALTER TABLE "Post" ALTER COLUMN "category" TYPE "ContentCategory" USING (
  CASE
    WHEN "category" IS NULL THEN NULL
    ELSE "category"::"ContentCategory"
  END
);

ALTER TABLE "UserInterest" ALTER COLUMN "category" TYPE "ContentCategory" USING ("category"::"ContentCategory");
