-- Preferencias de onboarding (primer acción sugerida).
ALTER TABLE "User" ADD COLUMN "onboardingCompletedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "onboardingFirstAction" TEXT;
