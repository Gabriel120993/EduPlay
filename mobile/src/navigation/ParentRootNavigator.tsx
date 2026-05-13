import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text } from "react-native";

import { AppHeaderBrandTitle } from "../components/AppHeaderBrandTitle";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { space } from "../theme/tokens";
import type { ParentStackParamList } from "./types";
import { LegalDocumentScreen } from "../screens/LegalDocumentScreen";
import { ParentAnalyticsScreen } from "../screens/ParentAnalyticsScreen";
import { ParentDashboardScreen } from "../screens/ParentDashboardScreen";
import { ParentScreen } from "../screens/ParentScreen";
import { AddMinorScreen } from "../screens/AddMinorScreen";
import { ParentApprovalScreen } from "../screens/ParentApprovalScreen";
import { PremiumScreen } from "../screens/PremiumScreen";
import { ParentCoachScreen } from "../screens/ParentCoachScreen";

function legalTitle(kind: "privacy" | "terms"): string {
  return kind === "privacy" ? "Privacidad" : "Términos";
}

const Stack = createNativeStackNavigator<ParentStackParamList>();

/** Panel principal del tutor (onboarding se resuelve en App antes de montar este stack). */
export function ParentRootNavigator({ onLogout }: { onLogout: () => void }) {
  const { parent } = useAuth();
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="Parent"
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
      <Stack.Screen
        name="Parent"
        component={ParentScreen}
        initialParams={{ parentId: parent?.id }}
        options={{
          headerTitle: () => <AppHeaderBrandTitle />,
        }}
      />
      <Stack.Screen
        name="ParentDashboard"
        component={ParentDashboardScreen}
        initialParams={{ parentId: parent?.id }}
        options={{
          headerTitle: () => <AppHeaderBrandTitle detail="Dashboard" />,
        }}
      />
      <Stack.Screen
        name="AddMinor"
        component={AddMinorScreen}
        options={{
          headerTitle: () => <AppHeaderBrandTitle detail="Agregar menor" />,
        }}
      />
      <Stack.Screen
        name="ParentApproval"
        component={ParentApprovalScreen}
        initialParams={{ parentId: parent?.id }}
        options={{
          headerTitle: () => <AppHeaderBrandTitle detail="Aprobaciones" />,
        }}
      />
      <Stack.Screen
        name="ParentAnalytics"
        component={ParentAnalyticsScreen}
        options={{
          headerTitle: () => <AppHeaderBrandTitle detail="Analíticas" />,
        }}
      />
      <Stack.Screen
        name="ParentCoach"
        component={ParentCoachScreen}
        initialParams={{ parentId: parent?.id }}
        options={{
          headerTitle: () => <AppHeaderBrandTitle detail="Guía para padres" />,
        }}
      />
      <Stack.Screen
        name="Premium"
        component={PremiumScreen}
        options={{
          headerTitle: () => <AppHeaderBrandTitle detail="Premium" />,
        }}
      />
      <Stack.Screen
        name="LegalDocument"
        component={LegalDocumentScreen}
        options={({ route }) => ({
          headerTitle: () => <AppHeaderBrandTitle detail={legalTitle(route.params.kind)} />,
        })}
      />
    </Stack.Navigator>
  );
}
