import { createContext, useContext, type ReactNode } from "react";

const FinishParentOnboardingContext = createContext<(() => void) | null>(null);

export function ParentOnboardingFinishProvider({
  children,
  onFinish,
}: {
  children: ReactNode;
  onFinish: () => void;
}) {
  return <FinishParentOnboardingContext.Provider value={onFinish}>{children}</FinishParentOnboardingContext.Provider>;
}

export function useFinishParentOnboarding(): () => void {
  const v = useContext(FinishParentOnboardingContext);
  if (!v) {
    throw new Error("useFinishParentOnboarding debe usarse bajo ParentOnboardingFinishProvider.");
  }
  return v;
}
