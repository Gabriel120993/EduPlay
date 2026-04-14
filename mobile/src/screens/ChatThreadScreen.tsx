import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AppIcon } from "../components/AppIcon";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useGuardedAsync } from "../hooks/useGuardedAsync";
import { formatApiError } from "../lib/apiErrors";
import { showToast } from "../lib/toastBus";
import type { RootStackParamList } from "../navigation/types";
import { getChatThread, postChatMessage, postContentReport } from "../services/api";
import type { ChatThreadMessage } from "../types/api";
import { kidChatPalette } from "../theme/chatKidPalette";
import { radius, space, typography } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "ChatThread">;

function formatClock(iso: string): string {
  if (iso.length >= 16) return iso.slice(11, 16);
  return "";
}

export function ChatThreadScreen({ route }: Props) {
  const { peerId } = route.params;
  const { mode } = useTheme();
  const k = kidChatPalette(mode);
  const { viewerUserId } = useAuth();
  const listRef = useRef<FlatList<ChatThreadMessage>>(null);

  const [messages, setMessages] = useState<ChatThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);
  const { run: runSend, busy: sending } = useGuardedAsync({ cooldownMs: 400 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getChatThread(peerId);
      setMessages(res.messages);
    } catch (e) {
      showToast(formatApiError(e, "No se pudo cargar el chat."), "error");
    } finally {
      setLoading(false);
    }
  }, [peerId]);

  useEffect(() => {
    void load();
  }, [load]);

  const send = () => {
    const text = draft.trim();
    if (!text || !viewerUserId || sending) return;
    void runSend(async () => {
      try {
        const res = await postChatMessage(peerId, text);
        setDraft("");
        setMessages((prev) => [
          ...prev,
          {
            id: res.id,
            senderId: viewerUserId,
            recipientId: peerId,
            body: res.body,
            blocked: res.blocked,
            moderationFlagged: res.moderationFlagged,
            createdAt: res.createdAt,
          },
        ]);
        if (res.blocked) {
          const hint =
            res.blockReason === "PERSONAL_DATA"
              ? "No compartas correos ni teléfonos en el chat."
              : res.blockReason === "BAD_WORDS"
                ? "Ese mensaje no está permitido."
                : "El mensaje no se entregó por el filtro parental o está vacío.";
          showToast(hint, "error");
        }
        requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
      } catch (e) {
        showToast(formatApiError(e, "No se pudo enviar."), "error");
      }
    });
  };

  if (loading && messages.length === 0) {
    return (
      <View style={[styles.center, { backgroundColor: k.screenBg }]}>
        <ActivityIndicator size="large" color={k.sendBg} />
        <Text style={[styles.loadHint, { color: k.hintText }]}>Cargando mensajes…</Text>
      </View>
    );
  }

  const canSend = draft.trim().length > 0 && !sending;

  const submitReport = useCallback(
    async (chatMessageId: string) => {
      setReportingId(chatMessageId);
      try {
        await postContentReport({ targetType: "CHAT_MESSAGE", chatMessageId });
        showToast("Gracias. Tu reporte fue enviado.", "success");
      } catch (e) {
        showToast(formatApiError(e, "No se pudo enviar el reporte."), "error");
      } finally {
        setReportingId(null);
      }
    },
    []
  );

  const confirmReport = useCallback(
    (item: ChatThreadMessage) => {
      Alert.alert(
        "Reportar mensaje",
        "Se avisará a un adulto responsable para que lo revise. ¿Querés continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Sí, reportar",
            style: "destructive",
            onPress: () => void submitReport(item.id),
          },
        ]
      );
    },
    [submitReport]
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: k.screenBg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.listPad}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji} allowFontScaling={false}>
              ✨
            </Text>
            <Text style={[styles.emptyTitle, { color: k.titleText }]}>¡Empezá la charla!</Text>
            <Text style={[styles.emptySub, { color: k.hintText }]}>
              Escribí abajo. Recordá ser amable y no compartir datos personales.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const mine = viewerUserId != null && item.senderId === viewerUserId;
          const blockedMine = mine && item.blocked;
          const bodyText =
            mine && item.blocked
              ? "Este mensaje no se envió (filtro de seguridad)"
              : item.body || (item.blocked ? "" : "");

          const bubbleBg = blockedMine ? k.blockedMineBg : mine ? k.mineBubbleBg : k.peerBubbleBg;
          const bubbleBorder = blockedMine ? k.blockedMineBorder : mine ? k.mineBubbleBorder : k.peerBubbleBorder;
          const textColor = blockedMine ? k.blockedMineText : mine ? k.mineText : k.peerText;

          const bubbleInner = (
            <View
              style={[
                styles.bubble,
                {
                  backgroundColor: bubbleBg,
                  borderColor: bubbleBorder,
                },
                mine ? styles.bubbleMineShape : styles.bubbleTheirsShape,
              ]}
            >
              <Text style={[styles.bubbleText, { color: textColor }]}>{bodyText}</Text>
              <Text style={[styles.timeInBubble, { color: mine ? k.metaText : k.timeText }]}>
                {formatClock(item.createdAt)}
              </Text>
              {item.moderationFlagged && !item.blocked ? (
                <View
                  style={[
                    styles.flaggedPill,
                    {
                      backgroundColor: k.flaggedBannerBg,
                      borderColor: k.flaggedBannerBorder,
                    },
                  ]}
                >
                  <Text style={[styles.flaggedPillText, { color: k.flaggedBannerText }]}>
                    Tu tutor puede revisar este mensaje
                  </Text>
                </View>
              ) : null}
            </View>
          );

          const showReport =
            !mine && item.body.trim().length > 0 && !item.blocked && viewerUserId != null;

          return (
            <View style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleColTheirs]}>
              {bubbleInner}
              {showReport ? (
                <Pressable
                  onPress={() => confirmReport(item)}
                  disabled={reportingId === item.id}
                  style={styles.reportRow}
                  accessibilityRole="button"
                  accessibilityLabel="Reportar este mensaje a un adulto"
                >
                  {reportingId === item.id ? (
                    <ActivityIndicator size="small" color={k.metaText} />
                  ) : (
                    <AppIcon name="flag-outline" color={k.metaText} size={16} />
                  )}
                  <Text style={[styles.reportLabel, { color: k.metaText }]}>
                    {reportingId === item.id ? "Enviando…" : "Reportar"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        }}
      />

      <View
        style={[
          styles.composer,
          {
            backgroundColor: k.composerBg,
            borderTopColor: k.composerTopBorder,
          },
        ]}
      >
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Escribí algo simpático…"
          placeholderTextColor={k.placeholder}
          style={[
            styles.input,
            {
              color: k.inputText,
              backgroundColor: k.inputBg,
              borderColor: k.inputBorder,
            },
          ]}
          multiline
          maxLength={2000}
          editable={!sending}
          accessibilityLabel="Mensaje de chat"
        />
        <Pressable
          onPress={send}
          disabled={!canSend}
          style={[
            styles.sendFab,
            { backgroundColor: canSend ? k.sendBg : k.sendBgDisabled },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensaje"
          accessibilityState={{ disabled: !canSend }}
        >
          <AppIcon
            name="send"
            color={canSend ? k.sendIcon : k.sendIconDisabled}
            size={22}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadHint: { marginTop: space.md, fontSize: typography.bodyLarge, fontWeight: "600" },
  listPad: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xl },
  emptyWrap: { alignItems: "center", paddingVertical: space.xl * 2, paddingHorizontal: space.lg },
  emptyEmoji: { fontSize: 44, marginBottom: space.md },
  emptyTitle: { fontSize: typography.title + 2, fontWeight: "800", textAlign: "center" },
  emptySub: {
    marginTop: space.sm,
    fontSize: typography.bodyLarge,
    lineHeight: 22,
    textAlign: "center",
    fontWeight: "600",
    maxWidth: 280,
  },
  bubbleRow: { marginBottom: space.md, maxWidth: "86%" },
  bubbleRowMine: { alignSelf: "flex-end" },
  /** Columna: burbuja del amigo + enlace reportar */
  bubbleColTheirs: { alignSelf: "flex-start", alignItems: "flex-start" },
  reportRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: space.xs,
    paddingVertical: space.xs,
    paddingHorizontal: space.xs,
  },
  reportLabel: { fontSize: typography.secondary, fontWeight: "800" },
  bubble: {
    borderWidth: 2,
    paddingVertical: space.md,
    paddingHorizontal: space.md,
  },
  /** Burbuja propia: esquina inferior derecha más “redondeada tipo chat”. */
  bubbleMineShape: {
    borderTopLeftRadius: radius.cardSm,
    borderTopRightRadius: radius.cardSm,
    borderBottomLeftRadius: radius.cardSm,
    borderBottomRightRadius: 6,
  },
  bubbleTheirsShape: {
    borderTopLeftRadius: radius.cardSm,
    borderTopRightRadius: radius.cardSm,
    borderBottomRightRadius: radius.cardSm,
    borderBottomLeftRadius: 6,
  },
  bubbleText: { fontSize: typography.bodyLarge, lineHeight: 22, fontWeight: "600" },
  timeInBubble: { marginTop: space.xs, fontSize: typography.secondary, fontWeight: "700" },
  flaggedPill: {
    marginTop: space.sm,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.cardSm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  flaggedPillText: { fontSize: typography.secondary, fontWeight: "800" },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    borderWidth: 2,
    borderRadius: radius.cardSm,
    paddingHorizontal: space.md,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: typography.bodyLarge,
    fontWeight: "600",
  },
  sendFab: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
