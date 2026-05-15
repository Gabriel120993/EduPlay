import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";

type PostOnboardingValue = {
  /** Tras completar onboarding: el Feed debe mostrar bienvenida y resaltar recomendaciones. */
  pendingFeedWelcome: boolean;
  consumePendingFeedWelcome: () => void;
};

const PostOnboardingContext = createContext<PostOnboardingValue | null>(null);

export function PostOnboardingProvider({
  children,
  pendingFeedWelcome,
  onConsume,
}: {
  children: ReactNode;
  pendingFeedWelcome: boolean;
  onConsume: () => void;
}) {
  const consumePendingFeedWelcome = useCallback(() => {
    onConsume();
  }, [onConsume]);

  const value = useMemo(
    () => ({ pendingFeedWelcome, consumePendingFeedWelcome }),
    [pendingFeedWelcome, consumePendingFeedWelcome],
  );

  return <PostOnboardingContext.Provider value={value}>{children}</PostOnboardingContext.Provider>;
}

export function usePostOnboarding(): PostOnboardingValue {
  const v = useContext(PostOnboardingContext);
  if (!v) {
    throw new Error("usePostOnboarding debe usarse dentro de PostOnboardingProvider");
  }
  return v;
}
