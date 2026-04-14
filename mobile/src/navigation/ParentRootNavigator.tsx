import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Pressable, Text } from "react-native";

import { AppHeaderBrandTitle } from "../components/AppHeaderBrandTitle";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { space } from "../theme/tokens";
import type { ParentStackParamList } from "./types";
import { LegalDocumentScreen } from "../screens/LegalDocumentScreen";
import { ParentAnalyticsScreen } from "../screens/ParentAnalyticsScreen";
import { ParentScreen } from "../screens/ParentScreen";
import { PremiumScreen } from "../screens/PremiumScreen";

function legalTitle(kind: "privacy" | "terms"): string {
  return kind === "privacy" ? "Privacidad" : "Términos";
}

const Stack = createNativeStackNavigator<ParentStackParamList>();

export function ParentRootNavigator({ onLogout }: { onLogout: () => void }) {
  const { parent } = useAuth();
  const { colors } = useTheme();

  return (
    <Stack.Navigator
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
        name="ParentAnalytics"
        component={ParentAnalyticsScreen}
        options={{
          headerTitle: () => <AppHeaderBrandTitle detail="Analíticas" />,
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
