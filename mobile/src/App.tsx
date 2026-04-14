import { NavigationContainer } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
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
import { AuthNavigator } from "./navigation/AuthNavigator";
import { ParentRootNavigator } from "./navigation/ParentRootNavigator";
import { RootNavigator } from "./navigation/RootNavigator";
import { OnboardingFlow } from "./screens/onboarding/OnboardingFlow";
import { getOnboardingStatus } from "./services/api";
import { warmUpAudio } from "./services/soundManager";

function ThemedNavigationContainer({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return <NavigationContainer theme={navigationThemeFrom(colors)}>{children}</NavigationContainer>;
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

function AppContent() {
  const { loading, token, sessionRole, logout, viewerUserId } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  const [pendingFeedWelcome, setPendingFeedWelcome] = useState(false);

  useEffect(() => {
    if (!token) {
      setPendingFeedWelcome(false);
    }
  }, [token]);

  useEffect(() => {
    if (loading) return;
    if (!token || sessionRole !== "child") {
      setOnboardingDone(null);
      return;
    }
    if (!viewerUserId) {
      setOnboardingDone(true);
      return;
    }
    let cancelled = false;
    setOnboardingDone(null);
    (async () => {
      try {
        const s = await getOnboardingStatus(viewerUserId);
        if (!cancelled) setOnboardingDone(s.completed);
      } catch {
        if (!cancelled) setOnboardingDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, token, sessionRole, viewerUserId]);

  if (loading) {
    return <ThemedBootSpinner />;
  }

  if (!token) {
    return (
      <ThemedNavigationContainer>
        <AuthNavigator />
      </ThemedNavigationContainer>
    );
  }

  if (sessionRole === "parent") {
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

  if (onboardingDone === null) {
    return <ThemedBootSpinner />;
  }

  if (onboardingDone === false) {
    return (
      <OnboardingFlow
        userId={viewerUserId}
        onComplete={() => {
          setPendingFeedWelcome(true);
          setOnboardingDone(true);
        }}
      />
    );
  }

  return (
    <ScreenTimeProvider userId={viewerUserId}>
      <PostOnboardingProvider
        pendingFeedWelcome={pendingFeedWelcome}
        onConsume={() => setPendingFeedWelcome(false)}
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
