-- Opcional: supervisión de chat y avisos al tutor
ALTER TABLE "ParentSettings" ADD COLUMN "parentChatSupervisionEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ParentSettings" ADD COLUMN "notifyParentNewContact" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ParentSettings" ADD COLUMN "notifyParentSuspiciousChat" BOOLEAN NOT NULL DEFAULT true;
