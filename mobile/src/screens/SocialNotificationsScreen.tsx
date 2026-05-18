import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from "../contexts/ThemeContext";
import { fetchSocialFeedNotifications } from "../services/api";
import { space } from "../theme/tokens";

export function SocialNotificationsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<{ id: string; message: string; read: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchSocialFeedNotifications().then((r) => {
      setItems(r.notifications);
      setLoading(false);
    });
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <Text style={{ padding: space.md, fontWeight: "900", fontSize: 20, color: colors.text }}>
        Notificaciones sociales
      </Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <ScrollView>
          {items.map((n) => (
            <View key={n.id} style={{ padding: space.md, borderBottomWidth: 1, borderBottomColor: colors.borderSubtle, opacity: n.read ? 0.6 : 1 }}>
              <Text style={{ color: colors.text }}>{n.message}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
