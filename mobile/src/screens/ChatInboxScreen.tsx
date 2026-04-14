import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { BrandEmptyState } from "../components/BrandEmptyState";
import { useTheme } from "../contexts/ThemeContext";
import { formatApiError } from "../lib/apiErrors";
import type { RootStackParamList } from "../navigation/types";
import { getChatConversations } from "../services/api";
import type { ChatConversationItem } from "../types/api";
import { kidChatPalette } from "../theme/chatKidPalette";
import { radius, space, typography } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function peerInitial(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  return t.charAt(0).toUpperCase();
}

export function ChatInboxScreen() {
  const { colors, mode } = useTheme();
  const k = kidChatPalette(mode);
  const navigation = useNavigation<Nav>();
  const [items, setItems] = useState<ChatConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await getChatConversations();
      setItems(res.conversations);
    } catch (e) {
      setItems([]);
      setError(formatApiError(e, "No se pudieron cargar las conversaciones."));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  if (loading && items.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: k.screenBg }]}>
        <ActivityIndicator size="large" color={k.sendBg} />
        <Text style={[styles.hint, { color: k.hintText }]}>Cargando tus mensajes…</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: k.screenBg }]}>
        <BrandEmptyState emoji="💬" title="Ups" subtitle={error} />
        <Pressable
          onPress={() => void load()}
          style={[styles.retryBtn, { backgroundColor: k.sendBg }]}
          accessibilityRole="button"
          accessibilityLabel="Reintentar cargar chats"
        >
          <Text style={styles.retryBtnText}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: k.screenBg }]}>
      {items.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIconWrap, { backgroundColor: k.emptyEmojiBg }]}>
            <Text style={styles.emptyEmoji} allowFontScaling={false}>
              👋
            </Text>
          </View>
          <Text style={[styles.emptyTitle, { color: k.titleText }]}>Todavía no hay chats</Text>
          <Text style={[styles.emptySub, { color: k.hintText }]}>
            Cuando tengas amigos en EduPlay, vas a ver acá las conversaciones. ¡Chateá siempre con respeto!
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.peer.id}
          contentContainerStyle={styles.listContent}
          refreshing={loading}
          onRefresh={() => void load()}
          ListHeaderComponent={
            <View style={styles.listHeader}>
              <Text style={[styles.listTitle, { color: k.titleText }]}>Tus chats</Text>
              <Text style={[styles.listSubtitle, { color: k.metaText }]}>
                Solo con amigos aprobados. No compartas datos personales.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const label = item.peer.realName || item.peer.username;
            return (
              <Pressable
                onPress={() =>
                  navigation.navigate("ChatThread", {
                    peerId: item.peer.id,
                    peerName: label,
                  })
                }
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: pressed ? k.cardPressedBg : k.cardBg,
                    borderColor: k.cardBorder,
                  },
                  Platform.select({
                    ios: {
                      shadowColor: colors.shadow,
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: mode === "dark" ? 0.35 : 0.12,
                      shadowRadius: 8,
                    },
                    android: { elevation: 3 },
                    default: {},
                  }),
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Abrir chat con ${label}`}
              >
                <View style={[styles.avatar, { backgroundColor: k.avatarFriendBg }]}>
                  <Text style={[styles.avatarLetter, { color: k.avatarFriendText }]}>{peerInitial(label)}</Text>
                </View>
                <View style={styles.rowBody}>
                  <View style={styles.rowTitleRow}>
                    <Text style={[styles.peerName, { color: k.titleText }]} numberOfLines={1}>
                      {label}
                    </Text>
                    {item.lastMessage.moderationFlagged ? (
                      <View style={[styles.flagDot, { backgroundColor: k.accentDot }]} accessibilityLabel="Revisión del tutor" />
                    ) : null}
                  </View>
                  <Text style={[styles.preview, { color: k.previewText }]} numberOfLines={2}>
                    {item.lastMessage.preview || " "}
                  </Text>
                </View>
                <Text style={[styles.time, { color: k.timeText }]}>
                  {item.lastMessage.createdAt.slice(11, 16)}
                </Text>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: space.lg },
  hint: { marginTop: space.md, fontSize: typography.bodyLarge, fontWeight: "600" },
  retryBtn: {
    marginTop: space.lg,
    paddingVertical: space.md,
    paddingHorizontal: space.xl,
    borderRadius: radius.cardSm,
  },
  retryBtnText: { color: "#fff", fontWeight: "800", fontSize: typography.bodyLarge },
  listContent: { padding: space.lg, paddingBottom: space.xl * 2 },
  listHeader: { marginBottom: space.lg },
  listTitle: { fontSize: 22, fontWeight: "800", letterSpacing: 0.2 },
  listSubtitle: { marginTop: space.sm, fontSize: typography.body, lineHeight: 20, fontWeight: "600" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    borderRadius: radius.card,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: space.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 20, fontWeight: "800" },
  rowBody: { flex: 1, marginLeft: space.md, marginRight: space.sm, minWidth: 0 },
  rowTitleRow: { flexDirection: "row", alignItems: "center", gap: space.sm },
  peerName: { flex: 1, fontSize: typography.bodyLarge, fontWeight: "800" },
  flagDot: { width: 8, height: 8, borderRadius: 4 },
  preview: { marginTop: 4, fontSize: typography.body, lineHeight: 20, fontWeight: "500" },
  time: { fontSize: typography.secondary, fontWeight: "700" },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  emptyEmoji: { fontSize: 40 },
  emptyTitle: { fontSize: typography.title + 2, fontWeight: "800", textAlign: "center" },
  emptySub: {
    marginTop: space.md,
    fontSize: typography.bodyLarge,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 300,
    fontWeight: "600",
  },
});
