import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { ContentDetailScreen } from "../screens/ContentDetailScreen";
import { GameCategoryScreen } from "../screens/GameCategoryScreen";
import { QuizResultScreen } from "../screens/QuizResultScreen";
import { QuizScreen } from "../screens/QuizScreen";
import { VisualGameScreen } from "../screens/VisualGameScreen";
import { ChatInboxScreen } from "../screens/ChatInboxScreen";
import { ChatThreadScreen } from "../screens/ChatThreadScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import type { RootStackParamList } from "./types";
import { MainTabNavigator } from "./MainTabNavigator";

const Stack = createNativeStackNavigator<RootStackParamList>();
const QUIZ_CATEGORY_TITLE: Record<string, { label: string; icon: string }> = {
  astronomy: { label: "Astronomía", icon: "🌌" },
  math: { label: "Matemáticas", icon: "➗" },
  science: { label: "Ciencia", icon: "🧪" },
  history: { label: "Historia", icon: "📜" },
  geography: { label: "Geografía", icon: "🌍" },
  creativity: { label: "Creatividad", icon: "🎨" },
  mixed: { label: "Modo desafío", icon: "🎯" },
};

export function RootNavigator({ onLogout }: { onLogout: () => void }) {
  const { viewerUserId } = useAuth();
  const { colors } = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="Main" options={{ headerShown: false }}>
        {() => (
          <MainTabNavigator onLogout={onLogout} viewerUserId={viewerUserId ?? undefined} />
        )}
      </Stack.Screen>
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          headerShown: true,
          title: "Ajustes",
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.headerTint, fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="ChatInbox"
        component={ChatInboxScreen}
        options={{
          headerShown: true,
          title: "Mensajes",
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.headerTint, fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="ChatThread"
        component={ChatThreadScreen}
        options={({ route }) => ({
          headerShown: true,
          title: route.params.peerName || "Chat",
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.headerTint, fontWeight: "700" },
        })}
      />
      <Stack.Screen
        name="ContentDetail"
        component={ContentDetailScreen}
        options={{
          headerShown: true,
          title: "Aprender",
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.headerTint, fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="GameCategory"
        component={GameCategoryScreen}
        options={{
          headerShown: true,
          title: "Categoría",
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.headerTint, fontWeight: "700" },
        }}
      />
      <Stack.Screen
        name="Quiz"
        component={QuizScreen}
        options={({ route }) => {
          const category = route.params?.category ?? "astronomy";
          const meta = QUIZ_CATEGORY_TITLE[category] ?? { label: "Quiz", icon: "🎮" };
          const title =
            category === "mixed" ? `${meta.label} ${meta.icon}` : `Quiz de ${meta.label} ${meta.icon}`;
          return {
            headerShown: true,
            title,
            headerStyle: { backgroundColor: colors.headerBg },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.headerTint, fontWeight: "700" },
          };
        }}
      />
      <Stack.Screen
        name="VisualGame"
        component={VisualGameScreen}
        options={({ route }) => {
          const category = route.params?.category ?? "astronomy";
          const meta = QUIZ_CATEGORY_TITLE[category] ?? { label: "Visual", icon: "🖼️" };
          const title = `Visual · ${meta.label} ${meta.icon}`;
          return {
            headerShown: true,
            title,
            headerStyle: { backgroundColor: colors.headerBg },
            headerTintColor: colors.primary,
            headerTitleStyle: { color: colors.headerTint, fontWeight: "700" },
          };
        }}
      />
      <Stack.Screen
        name="QuizResult"
        component={QuizResultScreen}
        options={{
          headerShown: true,
          title: "Resultado",
          headerBackVisible: false,
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.headerTint, fontWeight: "700" },
        }}
      />
    </Stack.Navigator>
  );
}
