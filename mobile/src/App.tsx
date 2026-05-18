import "./i18n";
import { initMobileSentry } from "./lib/sentry";

initMobileSentry();
import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppErrorBoundary } from "./components/AppErrorBoundary";
import { CelebrationHost } from "./components/CelebrationHost";
import { ToastHost } from "./components/ToastHost";
import { BrandSplashScreen } from "./components/BrandSplashScreen";
import { LocalNotificationScheduler } from "./components/LocalNotificationScheduler";
import { PushNotificationSetup } from "./components/PushNotificationSetup";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ParentIapProvider } from "./contexts/ParentIapContext";
import { PostOnboardingProvider } from "./contexts/PostOnboardingContext";
import { ScreenTimeProvider } from "./contexts/ScreenTimeContext";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";
import { ChatPushListenerBridge } from "./components/ChatPushListenerBridge";
import { ParentPushListenerBridge } from "./components/ParentPushListenerBridge";
import { navigationThemeFrom } from "./navigation/navigationTheme";
import { parentNavigationRef, rootNavigationRef } from "./navigation/navigationRefs";
import { authLinking } from "./navigation/authLinking";
import { AuthNavigator } from "./navigation/AuthNavigator";
import { ParentOnboardingNavigator } from "./navigation/ParentOnboardingNavigator";
import { ParentRootNavigator } from "./navigation/ParentRootNavigator";
import { RootNavigator } from "./navigation/RootNavigator";
import { OnboardingCompleteScreen } from "./screens/onboarding/OnboardingCompleteScreen";
import { OnboardingFlow } from "./screens/onboarding/OnboardingFlow";
import { formatApiError } from "./lib/apiErrors";
import { showToast } from "./lib/toastBus";
import {
  getOnboardingStatus,
  postParentOnboardingComplete,
  type OnboardingStatusResponse,
} from "./services/api";
import { warmUpAudio } from "./services/soundManager";

function ThemedNavigationContainer({
  children,
  linking,
}: {
  children: ReactNode;
  linking?: Parameters<typeof NavigationContainer>[0]["linking"];
}) {
  const { colors } = useTheme();
  return (
    <NavigationContainer linking={linking} theme={navigationThemeFrom(colors)}>
      {children}
    </NavigationContainer>
  );
}

function ChildNavigationContainer({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <NavigationContainer ref={rootNavigationRef} theme={navigationThemeFrom(colors)}>
      {children}
    </NavigationContainer>
  );
}

function ParentNavigationContainer({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <NavigationContainer ref={parentNavigationRef} theme={navigationThemeFrom(colors)}>
      {children}
    </NavigationContainer>
  );
}

function ThemedStatusBar() {
  const { mode } = useTheme();
  return <StatusBar style={mode === "dark" ? "light" : "dark"} />;
}

function ThemedBootSpinner() {
  const { colors } = useTheme();
  return (
    <View style={[styles.boot, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}

const ONBOARDING_FALLBACK_OK: OnboardingStatusResponse = {
  completed: true,
  firstAction: null,
  userType: null,
  interestCount: 0,
  hasMinors: false,
};

function AppContent() {
  const { loading, token, sessionRole, logout, viewerUserId, parentUserId } = useAuth();
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatusResponse | null>(null);
  const [onboardingCheckLoading, setOnboardingCheckLoading] = useState(true);
  const [minorOnboardingCelebrate, setMinorOnboardingCelebrate] = useState(false);
  const [pendingFeedWelcome, setPendingFeedWelcome] = useState(false);
  const consumePendingFeedWelcome = useCallback(() => {
    setPendingFeedWelcome(false);
  }, []);

  const loadOnboardingStatus = useCallback(async () => {
    const id = sessionRole === "parent" ? parentUserId : viewerUserId;
    if (!id) return;
    try {
      const s = await getOnboardingStatus(id);
      setOnboardingStatus(s);
    } catch {
      setOnboardingStatus(ONBOARDING_FALLBACK_OK);
    }
  }, [sessionRole, parentUserId, viewerUserId]);

  useEffect(() => {
    if (!token) {
      setPendingFeedWelcome(false);
      setMinorOnboardingCelebrate(false);
      setOnboardingStatus(null);
      setOnboardingCheckLoading(true);
    }
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (!token) {
      return;
    }
    if (sessionRole === "parent" && !parentUserId) {
      setOnboardingStatus({
        completed: true,
        firstAction: null,
        userType: "parent",
        interestCount: 0,
        hasMinors: false,
      });
      setOnboardingCheckLoading(false);
      return;
    }
    if (sessionRole === "child" && !viewerUserId) {
      setOnboardingCheckLoading(false);
      return;
    }
    if (sessionRole !== "parent" && sessionRole !== "child") {
      setOnboardingCheckLoading(false);
      return;
    }

    let cancelled = false;
    setOnboardingStatus(null);
    setOnboardingCheckLoading(true);
    (async () => {
      try {
        const id = sessionRole === "parent" ? parentUserId! : viewerUserId!;
        const s = await getOnboardingStatus(id);
        if (!cancelled) setOnboardingStatus(s);
      } catch {
        if (!cancelled) setOnboardingStatus(ONBOARDING_FALLBACK_OK);
      } finally {
        if (!cancelled) setOnboardingCheckLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, token, sessionRole, parentUserId, viewerUserId]);

  if (loading) {
    return <ThemedBootSpinner />;
  }

  if (!token) {
    return (
      <ThemedNavigationContainer linking={authLinking}>
        <AuthNavigator />
      </ThemedNavigationContainer>
    );
  }

  if (sessionRole === "parent") {
    if (onboardingCheckLoading || onboardingStatus === null) {
      return <ThemedBootSpinner />;
    }
    const st = onboardingStatus;
    if (st && !st.completed) {
      const ut = st.userType;
      const treatAsParentProfile = ut === "parent" || ut == null;
      if (treatAsParentProfile) {
        if (st.hasMinors) {
          return (
            <OnboardingCompleteScreen
              variant="parent"
              onContinue={async () => {
                if (!parentUserId) return;
                try {
                  await postParentOnboardingComplete(parentUserId);
                  await loadOnboardingStatus();
                } catch (e) {
                  showToast(formatApiError(e, "No se pudo sincronizar la cuenta."), "error");
                }
              }}
            />
          );
        }
        return (
          <ParentNavigationContainer>
            <PushNotificationSetup />
            <ParentPushListenerBridge />
            <ParentIapProvider>
              <ParentOnboardingNavigator
                onLogout={() => void logout()}
                onFinished={() => void loadOnboardingStatus()}
              />
            </ParentIapProvider>
          </ParentNavigationContainer>
        );
      }
    }
    return (
      <ParentNavigationContainer>
        <PushNotificationSetup />
        <ParentPushListenerBridge />
        <ParentIapProvider>
          <ParentRootNavigator onLogout={() => void logout()} />
        </ParentIapProvider>
      </ParentNavigationContainer>
    );
  }

  if (sessionRole !== "child" || !viewerUserId) {
    return <ThemedBootSpinner />;
  }

  if (onboardingCheckLoading || onboardingStatus === null) {
    return <ThemedBootSpinner />;
  }

  if (minorOnboardingCelebrate) {
    return (
      <OnboardingCompleteScreen
        variant="child"
        onContinue={() => {
          setPendingFeedWelcome(true);
          setMinorOnboardingCelebrate(false);
          void loadOnboardingStatus();
        }}
      />
    );
  }

  const childSt = onboardingStatus;
  if (childSt && !childSt.completed) {
    const ut = childSt.userType;
    const treatAsMinor = ut === "minor" || ut == null;
    if (treatAsMinor) {
      return (
        <OnboardingFlow
          userId={viewerUserId}
          onComplete={() => {
            setMinorOnboardingCelebrate(true);
            void loadOnboardingStatus();
          }}
        />
      );
    }
  }

  return (
    <ScreenTimeProvider userId={viewerUserId}>
      <PostOnboardingProvider
        pendingFeedWelcome={pendingFeedWelcome}
        onConsume={consumePendingFeedWelcome}
      >
        <PushNotificationSetup />
        <LocalNotificationScheduler />
        <ChildNavigationContainer>
          <ChatPushListenerBridge />
          <RootNavigator onLogout={() => void logout()} />
        </ChildNavigationContainer>
      </PostOnboardingProvider>
    </ScreenTimeProvider>
  );
}

export default function App() {
  const [showBrandSplash, setShowBrandSplash] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowBrandSplash(false), 1400);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (showBrandSplash) return;
    void warmUpAudio();
  }, [showBrandSplash]);

  return (
    <AppErrorBoundary>
      {showBrandSplash ? (
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaProvider>
            <BrandSplashScreen />
          </SafeAreaProvider>
        </GestureHandlerRootView>
      ) : (
        <GestureHandlerRootView style={styles.root}>
          <SafeAreaProvider>
            <ThemeProvider>
              <AuthProvider>
                <AppContent />
              </AuthProvider>
              <ToastHost />
              <CelebrationHost />
              <ThemedStatusBar />
            </ThemeProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      )}
    </AppErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  boot: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
