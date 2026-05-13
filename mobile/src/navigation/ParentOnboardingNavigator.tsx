import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text } from "react-native";

import { AppHeaderBrandTitle } from "../components/AppHeaderBrandTitle";
import { useTheme } from "../contexts/ThemeContext";
import { space } from "../theme/tokens";
import type { ParentOnboardingOnlyParamList } from "./types";
import { ParentOnboardingFinishProvider } from "./parentOnboardingGate";
import { AddMinorScreen } from "../screens/AddMinorScreen";
import { ParentOnboardingFlow } from "../screens/onboarding/ParentOnboardingFlow";
import { ParentOnboardingCompleteScreen } from "../screens/onboarding/ParentOnboardingCompleteScreen";

const Stack = createNativeStackNavigator<ParentOnboardingOnlyParamList>();

/**
 * Stack solo para el wizard de onboarding del tutor (antes del panel principal).
 * El gate vive en {@link AppContent}.
 */
export function ParentOnboardingNavigator({
  onLogout,
  onFinished,
}: {
  onLogout: () => void;
  onFinished: () => void;
}) {
  const { colors } = useTheme();

  return (
    <ParentOnboardingFinishProvider onFinish={onFinished}>
      <Stack.Navigator
        initialRouteName="ParentOnboarding"
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.headerTint,
          headerTitleStyle: { color: colors.headerTint },
          headerTitleAlign: "center",
          headerRight: () => (
            <Pressable
              onPress={onLogout}
              style={{ marginRight: space.sm, paddingVertical: 8, paddingHorizontal: 4 }}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Text style={{ color: colors.link, fontWeight: "700" }}>Salir</Text>
            </Pressable>
          ),
        }}
      >
        <Stack.Screen name="ParentOnboarding" component={ParentOnboardingFlow} options={{ headerShown: false }} />
        <Stack.Screen
          name="ParentOnboardingComplete"
          component={ParentOnboardingCompleteScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="AddMinor"
          component={AddMinorScreen}
          options={{
            headerTitle: () => <AppHeaderBrandTitle detail="Agregar menor" />,
          }}
        />
      </Stack.Navigator>
    </ParentOnboardingFinishProvider>
  );
}
