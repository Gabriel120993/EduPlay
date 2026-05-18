import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { ContentDetailScreen } from "../screens/ContentDetailScreen";
import { GameCategoryScreen } from "../screens/GameCategoryScreen";
import { QuizAreasScreen } from "../screens/QuizAreasScreen";
import { QuizResultScreen } from "../screens/QuizResultScreen";
import { QuizScreen } from "../screens/QuizScreen";
import { VisualGameScreen } from "../screens/VisualGameScreen";
import { AchievementSystemScreen } from "../screens/AchievementSystemScreen";
import { MiniGamePlayerScreen } from "../screens/MiniGamePlayerScreen";
import { MiniGamesHubScreen } from "../screens/MiniGamesHubScreen";
import { GamesHubScreen } from "../screens/GamesHubScreen";
import { GameDetailScreen } from "../screens/GameDetailScreen";
import { PlayGameScreen } from "../screens/PlayGameScreen";
import { MemoryGameScreen } from "../screens/MemoryGameScreen";
import { GameResultScreen } from "../screens/GameResultScreen";
import { PlayGameLeaderboardScreen } from "../screens/PlayGameLeaderboardScreen";
import { PlayGameChallengesScreen } from "../screens/PlayGameChallengesScreen";
import { CreatePostScreen } from "../screens/CreatePostScreen";
import { PostDetailScreen } from "../screens/PostDetailScreen";
import { ChallengeCreateScreen } from "../screens/ChallengeCreateScreen";
import { ChallengeDetailScreen } from "../screens/ChallengeDetailScreen";
import { StreaksScreen } from "../screens/StreaksScreen";
import { SocialNotificationsScreen } from "../screens/SocialNotificationsScreen";
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
        {() => <MainTabNavigator onLogout={onLogout} viewerUserId={viewerUserId ?? undefined} />}
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
        name="QuizAreas"
        component={QuizAreasScreen}
        options={{
          headerShown: true,
          title: "Quizzes por área",
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
            category === "mixed"
              ? `${meta.label} ${meta.icon}`
              : `Quiz de ${meta.label} ${meta.icon}`;
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
      <Stack.Screen
        name="MiniGamesHub"
        component={MiniGamesHubScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="MiniGamePlayer"
        component={MiniGamePlayerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="AchievementSystem"
        component={AchievementSystemScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="GamesHub" component={GamesHubScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GameDetail" component={GameDetailScreen} options={{ headerShown: false }} />
      <Stack.Screen name="PlayGame" component={PlayGameScreen} options={{ headerShown: false }} />
      <Stack.Screen name="MemoryGame" component={MemoryGameScreen} options={{ headerShown: false }} />
      <Stack.Screen name="GameResult" component={GameResultScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="PlayGameLeaderboard"
        component={PlayGameLeaderboardScreen}
        options={{ headerShown: true, title: "Ranking" }}
      />
      <Stack.Screen
        name="PlayGameChallenges"
        component={PlayGameChallengesScreen}
        options={{ headerShown: true, title: "Desafíos" }}
      />
      <Stack.Screen name="CreatePost" component={CreatePostScreen} options={{ headerShown: true, title: "Publicar" }} />
      <Stack.Screen name="PostDetail" component={PostDetailScreen} options={{ headerShown: true, title: "Post" }} />
      <Stack.Screen name="ChallengeCreate" component={ChallengeCreateScreen} options={{ headerShown: true, title: "Nuevo desafío" }} />
      <Stack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} options={{ headerShown: true, title: "Desafíos" }} />
      <Stack.Screen name="Streaks" component={StreaksScreen} options={{ headerShown: true, title: "Rachas" }} />
      <Stack.Screen name="SocialNotifications" component={SocialNotificationsScreen} options={{ headerShown: true, title: "Notificaciones" }} />
    </Stack.Navigator>
  );
}
