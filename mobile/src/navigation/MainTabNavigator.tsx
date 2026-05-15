import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { CompositeNavigationProp, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Pressable, Text, View } from "react-native";
import { Easing } from "react-native";

import { AppHeaderBrandTitle } from "../components/AppHeaderBrandTitle";
import { AppIcon } from "../components/AppIcon";
import { NotificationBellButton } from "../components/NotificationBellButton";
import { VIEWER_USER_ID } from "../config";
import { useTheme } from "../contexts/ThemeContext";
import { ExploreScreen } from "../screens/ExploreScreen";
import { FeedScreen } from "../screens/FeedScreen";
import { LibraryScreen } from "../screens/LibraryScreen";
import { ProfileScreen } from "../screens/ProfileScreen";
import { playClick } from "../services/soundManager";
import { space } from "../theme/tokens";
import type { MainTabParamList, RootStackParamList } from "./types";

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList>,
  NativeStackNavigationProp<RootStackParamList>
>;

function TabHeaderRight({
  navigation,
  route,
  onLogout,
}: {
  navigation: TabNavigation;
  route: RouteProp<MainTabParamList, keyof MainTabParamList>;
  onLogout: () => void;
}) {
  const { colors } = useTheme();
  const showChat = route.name === "Profile" || route.name === "Feed";
  const openSettings = () => {
    navigation.getParent()?.navigate("Settings");
  };
  const openChat = () => {
    navigation.getParent()?.navigate("ChatInbox");
  };
  return (
    <View
      style={{ flexDirection: "row", alignItems: "center", marginRight: space.sm, gap: space.xs }}
    >
      {showChat ? (
        <Pressable
          onPress={openChat}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Mensajes con amigos"
          style={{ padding: space.sm }}
        >
          <AppIcon name="chatbubbles-outline" size="md" color={colors.link} />
        </Pressable>
      ) : null}
      <NotificationBellButton />
      <Pressable
        onPress={openSettings}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Ajustes"
        style={{ padding: space.sm }}
      >
        <AppIcon name="settings-outline" size="md" color={colors.link} />
      </Pressable>
      <Pressable
        onPress={onLogout}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingVertical: 8,
          paddingHorizontal: 4,
        }}
        accessibilityRole="button"
        accessibilityLabel="Cerrar sesión"
      >
        <AppIcon name="log-out-outline" color={colors.link} size="sm" />
        <Text style={{ color: colors.link, fontWeight: "700" }}>Salir</Text>
      </Pressable>
    </View>
  );
}

export function MainTabNavigator({
  onLogout,
  viewerUserId,
}: {
  onLogout: () => void;
  /** Menor para feed / explorar / perfil; prioridad sobre EXPO_PUBLIC_USER_ID. */
  viewerUserId?: string;
}) {
  const sharedInitialParams = {
    userId: viewerUserId?.trim() || VIEWER_USER_ID || undefined,
  };

  const { colors } = useTheme();

  return (
    <Tab.Navigator
      initialRouteName="Feed"
      screenListeners={{
        tabPress: () => {
          playClick();
        },
      }}
      screenOptions={({ route, navigation }) => ({
        headerShown: true,
        headerTitleAlign: "center",
        headerTitle: () => <AppHeaderBrandTitle />,
        headerStyle: { backgroundColor: colors.headerBg },
        headerTintColor: colors.headerTint,
        headerTitleStyle: { color: colors.headerTint },
        headerRight: () => (
          <TabHeaderRight
            navigation={navigation as TabNavigation}
            route={route}
            onLogout={onLogout}
          />
        ),
        animation: "shift",
        transitionSpec: {
          animation: "timing",
          config: {
            duration: 320,
            easing: Easing.inOut(Easing.ease),
          },
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarActiveBackgroundColor: colors.primarySoft,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor: colors.tabBarBorder,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          marginTop: -2,
        },
        tabBarIconStyle: {
          marginTop: 2,
        },
        tabBarItemStyle: {
          borderRadius: 10,
          marginHorizontal: 3,
          marginVertical: 4,
        },
        tabBarShowLabel: true,
        tabBarHideOnKeyboard: true,
        tabBarIcon: ({ color, focused }) => {
          const iconName =
            route.name === "Feed"
              ? focused
                ? ("newspaper" as const)
                : ("newspaper-outline" as const)
              : route.name === "Explore"
                ? focused
                  ? ("compass" as const)
                  : ("compass-outline" as const)
                : route.name === "Library"
                  ? focused
                    ? ("library" as const)
                    : ("library-outline" as const)
                  : focused
                    ? ("person-circle" as const)
                    : ("person-circle-outline" as const);
          return <AppIcon name={iconName} size="lg" color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          title: "Feed",
          tabBarLabel: "Feed",
        }}
        initialParams={sharedInitialParams}
      />
      <Tab.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          title: "Explore",
          tabBarLabel: "Explore",
          headerShown: false,
        }}
        initialParams={sharedInitialParams}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          title: "Biblioteca",
          tabBarLabel: "Biblioteca",
          headerShown: false,
        }}
        initialParams={sharedInitialParams}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: "Profile",
          tabBarLabel: "Profile",
        }}
        initialParams={sharedInitialParams}
      />
    </Tab.Navigator>
  );
}
