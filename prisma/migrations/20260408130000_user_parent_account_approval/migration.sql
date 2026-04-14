-- AlterTable
ALTER TABLE "User" ADD COLUMN "parentAccountApprovedAt" TIMESTAMP(3);

-- Cuentas existentes: ya estaban en uso; se consideran aprobadas.
UPDATE "User" SET "parentAccountApprovedAt" = CURRENT_TIMESTAMP WHERE "parentAccountApprovedAt" IS NULL;
