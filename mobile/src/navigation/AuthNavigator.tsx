import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useTheme } from "../contexts/ThemeContext";
import { AuthScreen } from "../screens/AuthScreen";
import { LegalDocumentScreen } from "../screens/LegalDocumentScreen";
import type { AuthStackParamList } from "./types";

const Stack = createNativeStackNavigator<AuthStackParamList>();

function legalTitle(kind: "privacy" | "terms"): string {
  return kind === "privacy" ? "Privacidad" : "Términos";
}

export function AuthNavigator() {
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerTint,
        headerTitleStyle: { color: colors.headerTint },
      }}
    >
      <Stack.Screen name="AuthHome" component={AuthScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="LegalDocument"
        component={LegalDocumentScreen}
        options={({ route }) => ({ title: legalTitle(route.params.kind) })}
      />
    </Stack.Navigator>
  );
}
