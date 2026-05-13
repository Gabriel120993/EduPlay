import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { BrandEmptyState } from "../components/BrandEmptyState";
import { PostCategoryTag } from "../components/PostCategoryTag";
import { PARENT_USER_ID } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { getCategoryUi } from "../lib/contentCategoryUi";
import { formatApiError } from "../lib/apiErrors";
import { showToast } from "../lib/toastBus";
import type { ParentStackParamList } from "../navigation/types";
import {
  deleteChildAccountAsParent,
  deleteParentChildBlockUser,
  getParentChildBlockedUsers,
  getParentChildChatMessages,
  getParentChildFriends,
  getParentDashboard,
  patchChildParentSettings,
  postApproveChildAccount,
  postParentApproveFriend,
  postParentChildBlockUser,
  postParentRejectFriendAwaiting,
} from "../services/api";
import { useParentStyles } from "./parentScreenStyles";
import type {
  ParentChildBlockedEntry,
  ParentChildChatMessageRow,
  ParentChildFriendEntry,
  ParentDashboardChildRow,
  ParentDashboardResponse,
  ParentPendingFriendApproval,
} from "../types/api";

type Props = NativeStackScreenProps<ParentStackParamList, "Parent">;

function formatUsedTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m === 0) return `${s} s`;
  if (m < 60) return `${m} min ${s} s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h} h ${rm} min`;
}

function rarityColor(rarity: string): string {
  switch (rarity) {
    case "LEGENDARY":
      return "#d97706";
    case "EPIC":
      return "#7c3aed";
    case "RARE":
      return "#2563eb";
    default:
      return "#64748b";
  }
}

function postTypeLabel(type: string): string {
  switch (type) {
    case "POST":
      return "Publicación";
    case "GAME_RESULT":
      return "Partida";
    case "ACHIEVEMENT":
      return "Logro";
    default:
      return type;
  }
}

function ChildPanel({
  row,
  parentId,
  onSettingsChange,
  onRefreshQuiet,
  busyKey,
  setBusyKey,
}: {
  row: ParentDashboardChildRow;
  parentId: string;
  onSettingsChange: (childId: string, patch: Partial<ParentDashboardChildRow["settings"]>) => void;
  onRefreshQuiet: () => Promise<void>;
  busyKey: string | null;
  setBusyKey: (k: string | null) => void;
}) {
  const styles = useParentStyles();
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const limitMin = row.dailyScreenLimitMinutes;
  const unlimited = limitMin === 0;
  const limitSec = unlimited ? 1 : Math.max(1, limitMin * 60);
  const pct = unlimited ? 0 : Math.min(100, Math.round((row.timeSpentTodaySeconds / limitSec) * 100));
  const [chatLog, setChatLog] = useState<ParentChildChatMessageRow[] | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [childFriends, setChildFriends] = useState<ParentChildFriendEntry[] | null>(null);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<ParentChildBlockedEntry[] | null>(null);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [blockUsername, setBlockUsername] = useState("");
  const [blockingBusy, setBlockingBusy] = useState(false);
  const patchInFlightRef = useRef(false);
  const blockSubmitLockRef = useRef(false);

  const saveScreenTimeLimit = async (next: number) => {
    if (patchInFlightRef.current) return;
    patchInFlightRef.current = true;
    const key = `${row.child.id}:screenTime`;
    setBusyKey(key);
    try {
      const res = await patchChildParentSettings(parentId, row.child.id, { dailyScreenTimeLimit: next });
      onSettingsChange(row.child.id, { dailyScreenTimeLimit: res.dailyScreenTimeLimit });
      await onRefreshQuiet();
      showToast("Tiempo de pantalla actualizado.", "success");
    } catch (e) {
      showToast(formatApiError(e, "No se pudo guardar el límite."), "error");
    } finally {
      patchInFlightRef.current = false;
      setBusyKey(null);
    }
  };

  const pendingFriends = row.pendingFriendApprovals ?? [];
  const accountPending = row.child.parentAccountApprovedAt == null;
  const chatSupervisionOn = row.settings.parentChatSupervisionEnabled ?? true;
  const notifyNewContactOn = row.settings.notifyParentNewContact ?? true;
  const notifySuspiciousChatOn = row.settings.notifyParentSuspiciousChat ?? true;

  const approveChildAccount = async () => {
    const key = `${row.child.id}:approveAccount`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      await postApproveChildAccount(parentId, row.child.id);
      showToast("Cuenta del menor aprobada. Ya puede entrar a la app.", "success");
      await onRefreshQuiet();
    } catch (e) {
      showToast(formatApiError(e, "No se pudo aprobar la cuenta."), "error");
    } finally {
      setBusyKey(null);
    }
  };

  const confirmDeleteChildAccount = () => {
    if (Platform.OS === "web" && typeof window !== "undefined" && typeof window.confirm === "function") {
      const ok1 = window.confirm(
        `¿Eliminar cuenta del menor?\n\nSe borrarán de forma permanente la cuenta de ${row.child.realName} (@${row.child.username}), publicaciones, progreso y datos asociados.`
      );
      if (!ok1) return;
      const ok2 = window.confirm(
        "Confirmación final\n\nEsta acción no se puede deshacer. ¿Eliminar la cuenta ahora?"
      );
      if (!ok2) return;
      void runDeleteChildAccount();
      return;
    }
    if (Platform.OS === "web") {
      showToast("No se pudo abrir el diálogo de confirmación del navegador.", "error");
      return;
    }

    Alert.alert(
      "Eliminar cuenta del menor",
      `Se borrarán de forma permanente la cuenta de ${row.child.realName} (@${row.child.username}), publicaciones, progreso y datos asociados.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Confirmación final",
              "Esta acción no se puede deshacer. ¿Eliminar la cuenta ahora?",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Eliminar",
                  style: "destructive",
                  onPress: () => void runDeleteChildAccount(),
                },
              ]
            );
          },
        },
      ]
    );
  };

  const runDeleteChildAccount = async () => {
    const key = `${row.child.id}:deleteAccount`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      await deleteChildAccountAsParent(row.child.id);
      showToast("Cuenta del menor eliminada.", "success");
      await onRefreshQuiet();
    } catch (e) {
      showToast(formatApiError(e, "No se pudo eliminar la cuenta."), "error");
    } finally {
      setBusyKey(null);
    }
  };

  const approvePendingFriend = async (p: ParentPendingFriendApproval) => {
    const key = `${row.child.id}:friend:${p.friendshipId}`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      await postParentApproveFriend({
        userId: p.senderUserId,
        friendId: row.child.id,
        parentId,
      });
      showToast(`Amistad aprobada con ${p.senderRealName || p.senderUsername}.`, "success");
      await onRefreshQuiet();
    } catch (e) {
      showToast(formatApiError(e, "No se pudo aprobar la amistad."), "error");
    } finally {
      setBusyKey(null);
    }
  };

  const rejectPendingFriend = async (p: ParentPendingFriendApproval) => {
    const key = `${row.child.id}:friendReject:${p.friendshipId}`;
    if (busyKey) return;
    setBusyKey(key);
    try {
      await postParentRejectFriendAwaiting({
        userId: p.senderUserId,
        friendId: row.child.id,
        parentId,
      });
      showToast("Solicitud rechazada.", "success");
      await onRefreshQuiet();
    } catch (e) {
      showToast(formatApiError(e, "No se pudo rechazar la solicitud."), "error");
    } finally {
      setBusyKey(null);
    }
  };

  type ParentToggleKey = keyof Pick<
    ParentDashboardChildRow["settings"],
    | "allowPosting"
    | "allowFriends"
    | "chatEnabled"
    | "parentChatSupervisionEnabled"
    | "notifyParentNewContact"
    | "notifyParentSuspiciousChat"
  >;

  const patch = async (field: ParentToggleKey, value: boolean) => {
    if (patchInFlightRef.current) return;
    patchInFlightRef.current = true;
    const key = `${row.child.id}:${field}`;
    setBusyKey(key);
    const prev = { ...row.settings };
    onSettingsChange(row.child.id, { [field]: value });
    try {
      const res = await patchChildParentSettings(parentId, row.child.id, { [field]: value });
      onSettingsChange(row.child.id, {
        allowPosting: res.allowPosting,
        allowFriends: res.allowFriends,
        chatEnabled: res.chatEnabled,
        parentChatSupervisionEnabled: res.parentChatSupervisionEnabled,
        notifyParentNewContact: res.notifyParentNewContact,
        notifyParentSuspiciousChat: res.notifyParentSuspiciousChat,
        dailyScreenTimeLimit: res.dailyScreenTimeLimit,
      });
      if (field === "parentChatSupervisionEnabled" && !value) {
        setChatLog(null);
      }
    } catch (e) {
      onSettingsChange(row.child.id, prev);
      showToast(formatApiError(e, "No se pudo guardar la configuración."), "error");
    } finally {
      patchInFlightRef.current = false;
      setBusyKey(null);
    }
  };

  const loadChatSupervision = async () => {
    setChatLoading(true);
    try {
      const res = await getParentChildChatMessages(parentId, row.child.id, 80);
      setChatLog(res.messages);
    } catch (e) {
      showToast(formatApiError(e, "No se pudieron cargar los mensajes."), "error");
    } finally {
      setChatLoading(false);
    }
  };

  const loadFriends = async () => {
    setFriendsLoading(true);
    try {
      const res = await getParentChildFriends(parentId, row.child.id);
      setChildFriends(res.friends);
    } catch (e) {
      showToast(formatApiError(e, "No se pudieron cargar los amigos."), "error");
    } finally {
      setFriendsLoading(false);
    }
  };

  const loadBlocked = async () => {
    setBlockedLoading(true);
    try {
      const res = await getParentChildBlockedUsers(parentId, row.child.id);
      setBlockedUsers(res.blocked);
    } catch (e) {
      showToast(formatApiError(e, "No se pudo cargar la lista de bloqueados."), "error");
    } finally {
      setBlockedLoading(false);
    }
  };

  const submitBlock = async () => {
    const u = blockUsername.trim();
    if (!u) {
      showToast("Escribí el nombre de usuario a bloquear.", "error");
      return;
    }
    if (blockSubmitLockRef.current || blockingBusy) return;
    blockSubmitLockRef.current = true;
    setBlockingBusy(true);
    try {
      await postParentChildBlockUser(parentId, row.child.id, { username: u });
      setBlockUsername("");
      showToast("Usuario bloqueado. Se quitó la amistad si existía.", "success");
      await loadBlocked();
      setChildFriends(null);
    } catch (e) {
      showToast(formatApiError(e, "No se pudo bloquear."), "error");
    } finally {
      blockSubmitLockRef.current = false;
      setBlockingBusy(false);
    }
  };

  const removeBlock = async (blockedUserId: string) => {
    try {
      await deleteParentChildBlockUser(parentId, row.child.id, blockedUserId);
      showToast("Bloqueo quitado.", "success");
      await loadBlocked();
    } catch (e) {
      showToast(formatApiError(e, "No se pudo quitar el bloqueo."), "error");
    }
  };

  return (
    <View style={styles.childCard}>
      <View style={styles.childHeader}>
        <Text style={styles.childName}>{row.child.realName}</Text>
        <Text style={styles.childMeta}>
          @{row.child.username} · Nivel {row.child.level}
        </Text>
      </View>

      {accountPending ? (
        <View style={[styles.activityRow, { borderLeftWidth: 4, borderLeftColor: "#ca8a04" }]}>
          <Text style={styles.activityBadge}>Cuenta pendiente</Text>
          <Text style={styles.subHint}>
            El menor no puede usar la app hasta que apruebes su cuenta. Cuando esté listo, pulsá el botón.
          </Text>
          <Pressable
            onPress={() => void approveChildAccount()}
            disabled={busyKey != null}
            style={[styles.analyticsCta, { marginTop: 10 }]}
            accessibilityRole="button"
            accessibilityLabel="Aprobar cuenta del menor"
          >
            <Text style={styles.analyticsCtaText}>
              {busyKey === `${row.child.id}:approveAccount` ? "…" : "Aprobar cuenta"}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {pendingFriends.length > 0 ? (
        <>
          <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Amistades pendientes de tu OK</Text>
          <Text style={styles.subHint}>
            El menor aceptó la solicitud; falta que vos confirmes como tutor.
          </Text>
          {pendingFriends.map((p) => (
            <View key={p.friendshipId} style={styles.activityRow}>
              <Text style={styles.activityText}>
                {p.senderRealName || p.senderUsername}{" "}
                <Text style={styles.activityDate}>@{p.senderUsername}</Text>
              </Text>
              <Text style={styles.activityDate}>{p.createdAt.slice(0, 16).replace("T", " ")}</Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                <Pressable
                  onPress={() => void approvePendingFriend(p)}
                  disabled={busyKey != null}
                  accessibilityRole="button"
                  accessibilityLabel={`Aprobar amistad con ${p.senderUsername}`}
                >
                  <Text style={{ color: colors.link, fontWeight: "700" }}>Aprobar</Text>
                </Pressable>
                <Pressable
                  onPress={() => void rejectPendingFriend(p)}
                  disabled={busyKey != null}
                  accessibilityRole="button"
                  accessibilityLabel={`Rechazar amistad con ${p.senderUsername}`}
                >
                  <Text style={{ color: colors.textMuted, fontWeight: "700" }}>Rechazar</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </>
      ) : null}

      <Text style={styles.sectionLabel}>Tiempo de pantalla hoy</Text>
      {unlimited ? (
        <Text style={[styles.subHint, { marginBottom: 8 }]}>Sin límite · el uso de hoy es solo informativo</Text>
      ) : null}
      <View style={styles.timeRow}>
        <Text style={styles.timeUsed}>{formatUsedTime(row.timeSpentTodaySeconds)}</Text>
        <Text style={styles.timeLimit}>{unlimited ? "sin tope" : `de ${row.dailyScreenLimitMinutes} min`}</Text>
      </View>
      {!unlimited ? (
        <>
          <View style={styles.progressTrack} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <Text style={styles.progressHint}>{pct}% del límite diario (UTC)</Text>
        </>
      ) : null}

      <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Límite diario (UTC)</Text>
      <Text style={styles.subHint}>Activá ilimitado o elegí un tope rápido (15–1440 min también desde la API).</Text>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLabels}>
          <Text style={styles.toggleTitle}>Uso ilimitado</Text>
          <Text style={styles.toggleSub}>Sin modo lectura por tiempo de pantalla</Text>
        </View>
        <Switch
          value={unlimited}
          onValueChange={(v) => {
            void saveScreenTimeLimit(v ? 0 : Math.max(15, row.settings.dailyScreenTimeLimit || 60));
          }}
          disabled={busyKey != null}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={Platform.OS === "android" ? (unlimited ? colors.primary : colors.card) : undefined}
        />
      </View>
      {!unlimited ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
          {([30, 60, 90, 120] as const).map((m) => (
            <Pressable
              key={m}
              onPress={() => void saveScreenTimeLimit(m)}
              disabled={busyKey != null}
              style={[
                {
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 20,
                  borderWidth: 1,
                },
                { borderColor: colors.borderSubtle, backgroundColor: colors.card },
                limitMin === m && { borderColor: colors.primary, backgroundColor: colors.primarySoft },
              ]}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>{m} min</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Actividad</Text>
      <Text style={styles.subHint}>Misiones hechas hoy: {row.missionsCompletedToday}</Text>

      <Text style={styles.activitySubtitle}>Publicaciones recientes</Text>
      {row.recentPosts.length === 0 ? (
        <Text style={styles.emptyLine}>Sin publicaciones recientes.</Text>
      ) : (
        row.recentPosts.map((p) => {
          const cat = getCategoryUi(p.category);
          return (
            <View
              key={p.id}
              style={[styles.activityRow, cat && { borderLeftWidth: 4, borderLeftColor: cat.highlight }]}
            >
              <View style={styles.activityRowHeader}>
                <Text style={styles.activityBadge}>{postTypeLabel(p.type)}</Text>
                {p.category ? <PostCategoryTag category={p.category} compact /> : null}
              </View>
              <Text style={styles.activityText} numberOfLines={2}>
                {p.content?.trim() || "(sin texto)"}
              </Text>
              <Text style={styles.activityDate}>{p.createdAt.slice(0, 16).replace("T", " ")}</Text>
            </View>
          );
        })
      )}

      <Text style={styles.activitySubtitle}>Logros recientes</Text>
      {row.recentAchievements.length === 0 ? (
        <Text style={styles.emptyLine}>Sin logros recientes.</Text>
      ) : (
        row.recentAchievements.map((a) => (
          <View key={a.id} style={styles.achievementRow}>
            <Text style={styles.achievementIcon}>{a.badgeIcon}</Text>
            <View style={styles.achievementBody}>
              <Text style={styles.achievementTitle}>{a.title}</Text>
              <Text style={[styles.achievementRarity, { color: rarityColor(a.rarity) }]}>{a.rarity}</Text>
            </View>
          </View>
        ))
      )}

      <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Controles parentales</Text>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLabels}>
          <Text style={styles.toggleTitle}>Permitir publicar</Text>
          <Text style={styles.toggleSub}>Posts manuales en el feed</Text>
        </View>
        <Switch
          value={row.settings.allowPosting}
          onValueChange={(v) => void patch("allowPosting", v)}
          disabled={busyKey?.startsWith(row.child.id) ?? false}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={
            Platform.OS === "android"
              ? row.settings.allowPosting
                ? colors.primary
                : colors.card
              : undefined
          }
        />
      </View>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLabels}>
          <Text style={styles.toggleTitle}>Permitir amigos</Text>
          <Text style={styles.toggleSub}>Solicitudes y amistades</Text>
        </View>
        <Switch
          value={row.settings.allowFriends}
          onValueChange={(v) => void patch("allowFriends", v)}
          disabled={busyKey?.startsWith(row.child.id) ?? false}
          trackColor={{
            false: colors.border,
            true: isDark ? "#14532d" : "#86efac",
          }}
          thumbColor={
            Platform.OS === "android"
              ? row.settings.allowFriends
                ? "#047857"
                : colors.card
              : undefined
          }
        />
      </View>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLabels}>
          <Text style={styles.toggleTitle}>Permitir chat con amigos</Text>
          <Text style={styles.toggleSub}>Mensajes solo entre amigos aceptados</Text>
        </View>
        <Switch
          value={row.settings.chatEnabled}
          onValueChange={(v) => void patch("chatEnabled", v)}
          disabled={busyKey?.startsWith(row.child.id) ?? false}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={
            Platform.OS === "android"
              ? row.settings.chatEnabled
                ? colors.primary
                : colors.card
              : undefined
          }
        />
      </View>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLabels}>
          <Text style={styles.toggleTitle}>Ver historial de chat en el panel</Text>
          <Text style={styles.toggleSub}>Opcional: supervisión de mensajes (solo lectura)</Text>
        </View>
        <Switch
          value={chatSupervisionOn}
          onValueChange={(v) => void patch("parentChatSupervisionEnabled", v)}
          disabled={busyKey?.startsWith(row.child.id) ?? false}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={
            Platform.OS === "android" ? (chatSupervisionOn ? colors.primary : colors.card) : undefined
          }
        />
      </View>

      <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Avisos al tutor</Text>
      <Text style={styles.subHint}>
        Requieren token de notificaciones en la cuenta del tutor. También aparecen en «Novedades» del panel.
      </Text>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLabels}>
          <Text style={styles.toggleTitle}>Nuevo contacto</Text>
          <Text style={styles.toggleSub}>Cuando se acepta una amistad (amigo nuevo)</Text>
        </View>
        <Switch
          value={notifyNewContactOn}
          onValueChange={(v) => void patch("notifyParentNewContact", v)}
          disabled={busyKey?.startsWith(row.child.id) ?? false}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={
            Platform.OS === "android" ? (notifyNewContactOn ? colors.primary : colors.card) : undefined
          }
        />
      </View>
      <View style={styles.toggleRow}>
        <View style={styles.toggleLabels}>
          <Text style={styles.toggleTitle}>Mensaje sospechoso</Text>
          <Text style={styles.toggleSub}>Filtro bloqueó o marcó un mensaje de chat</Text>
        </View>
        <Switch
          value={notifySuspiciousChatOn}
          onValueChange={(v) => void patch("notifyParentSuspiciousChat", v)}
          disabled={busyKey?.startsWith(row.child.id) ?? false}
          trackColor={{ false: colors.border, true: colors.primarySoft }}
          thumbColor={
            Platform.OS === "android" ? (notifySuspiciousChatOn ? colors.primary : colors.card) : undefined
          }
        />
      </View>

      <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Amigos del menor</Text>
      <Text style={styles.subHint}>Lista de amigos aceptados en la app.</Text>
      <Pressable
        onPress={() => void loadFriends()}
        disabled={friendsLoading}
        style={styles.analyticsCta}
        accessibilityRole="button"
        accessibilityLabel="Ver amigos del menor"
      >
        <Text style={styles.analyticsCtaText}>
          {friendsLoading ? "Cargando…" : childFriends ? "Actualizar amigos" : "Cargar amigos"}
        </Text>
      </Pressable>
      {childFriends && childFriends.length === 0 ? (
        <Text style={styles.emptyLine}>Sin amigos aceptados por ahora.</Text>
      ) : null}
      {childFriends && childFriends.length > 0
        ? childFriends.map((f) => (
            <View key={f.friendshipId} style={styles.activityRow}>
              <Text style={styles.activityText}>
                {f.friend.realName} <Text style={styles.activityDate}>@{f.friend.username}</Text>
              </Text>
              <Text style={styles.activityDate}>Desde {f.since.slice(0, 10)}</Text>
            </View>
          ))
        : null}

      <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Bloquear usuario</Text>
      <Text style={styles.subHint}>
        El menor no podrá ser amigo ni chatear con esa cuenta. Podés usar el nombre de usuario exacto.
      </Text>
      <TextInput
        value={blockUsername}
        onChangeText={setBlockUsername}
        placeholder="usuario (sin @)"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!blockingBusy}
        style={[
          localStyles.blockInput,
          { color: colors.text, borderColor: colors.borderSubtle, backgroundColor: colors.card },
        ]}
      />
      <Pressable
        onPress={() => void submitBlock()}
        disabled={blockingBusy}
        style={[styles.analyticsCta, { marginTop: 8 }]}
        accessibilityRole="button"
        accessibilityLabel="Bloquear usuario para este menor"
      >
        <Text style={styles.analyticsCtaText}>{blockingBusy ? "…" : "Bloquear"}</Text>
      </Pressable>

      <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Usuarios bloqueados</Text>
      <Pressable
        onPress={() => void loadBlocked()}
        disabled={blockedLoading}
        style={styles.analyticsCta}
        accessibilityRole="button"
      >
        <Text style={styles.analyticsCtaText}>
          {blockedLoading ? "Cargando…" : blockedUsers ? "Actualizar lista" : "Cargar bloqueados"}
        </Text>
      </Pressable>
      {blockedUsers && blockedUsers.length === 0 ? (
        <Text style={styles.emptyLine}>Nadie bloqueado para este menor.</Text>
      ) : null}
      {blockedUsers && blockedUsers.length > 0
        ? blockedUsers.map((b) => (
            <View key={b.id} style={styles.activityRow}>
              <View style={styles.activityRowHeader}>
                <Text style={styles.activityText}>
                  {b.user.realName} <Text style={styles.activityDate}>@{b.user.username}</Text>
                </Text>
                <Pressable
                  onPress={() => void removeBlock(b.blockedUserId)}
                  accessibilityRole="button"
                  accessibilityLabel={`Quitar bloqueo de ${b.user.username}`}
                >
                  <Text style={{ color: colors.link, fontWeight: "700" }}>Quitar</Text>
                </Pressable>
              </View>
              <Text style={styles.activityDate}>Bloqueado el {b.createdAt.slice(0, 10)}</Text>
            </View>
          ))
        : null}

      <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Supervisión de chat</Text>
      {!chatSupervisionOn ? (
        <Text style={styles.subHint}>
          Activá «Ver historial de chat en el panel» en controles parentales para cargar mensajes aquí.
        </Text>
      ) : (
        <>
          <Text style={styles.subHint}>Solo lectura: mensajes del menor (incluye intentos bloqueados por filtro).</Text>
          <Pressable
            onPress={() => void loadChatSupervision()}
            disabled={chatLoading}
            style={styles.analyticsCta}
            accessibilityRole="button"
            accessibilityLabel="Cargar mensajes de chat del menor"
          >
            <Text style={styles.analyticsCtaText}>
              {chatLoading ? "Cargando…" : chatLog ? "Actualizar mensajes" : "Cargar mensajes del menor"}
            </Text>
          </Pressable>
        </>
      )}
      {chatSupervisionOn && chatLog && chatLog.length === 0 ? (
        <Text style={styles.emptyLine}>Sin mensajes registrados.</Text>
      ) : null}
      {chatSupervisionOn && chatLog && chatLog.length > 0
        ? chatLog.map((m) => {
            const outbound = m.senderId === row.child.id;
            const peerU = outbound ? m.recipientUsername : m.senderUsername;
            const shown =
              m.blocked && m.auditPlain != null && m.auditPlain.trim() !== ""
                ? m.auditPlain
                : m.deliveredBody.trim() || (m.blocked ? "(bloqueado)" : "");
            return (
              <View key={m.id} style={styles.activityRow}>
                <View style={styles.activityRowHeader}>
                  <Text style={styles.activityBadge}>{outbound ? "Envió" : "Recibió"}</Text>
                  {peerU ? <Text style={styles.activityDate}>@{peerU}</Text> : null}
                </View>
                <Text style={styles.activityText} numberOfLines={6}>
                  {shown}
                </Text>
                {m.blocked ? (
                  <Text style={styles.toggleSub}>Estado: bloqueado{m.blockReason ? ` · ${m.blockReason}` : ""}</Text>
                ) : null}
                {m.moderationFlagged && !m.blocked ? (
                  <Text style={styles.toggleSub}>Marcado para revisión (p. ej. enlace)</Text>
                ) : null}
                <Text style={styles.activityDate}>{m.createdAt.slice(0, 16).replace("T", " ")}</Text>
              </View>
            );
          })
        : null}

      <Text style={[styles.sectionLabel, styles.sectionSpaced]}>Eliminar cuenta del menor</Text>
      <Text style={styles.subHint}>
        Borrá de forma permanente esta cuenta, publicaciones, progreso y datos. Podés dar de alta un perfil nuevo más
        adelante si lo necesitás.
      </Text>
      <Pressable
        onPress={confirmDeleteChildAccount}
        disabled={busyKey != null}
        style={({ pressed }) => [
          styles.dangerDeleteBtn,
          pressed && styles.dangerDeleteBtnPressed,
          busyKey != null && styles.dangerDeleteBtnDisabled,
        ]}
        accessibilityRole="button"
        accessibilityLabel={`Eliminar cuenta de ${row.child.realName}`}
      >
        <Text style={styles.dangerDeleteBtnText}>
          {busyKey === `${row.child.id}:deleteAccount` ? "Eliminando…" : `Eliminar cuenta de ${row.child.realName}`}
        </Text>
      </Pressable>
    </View>
  );
}

export function ParentScreen({ route }: Props) {
  const styles = useParentStyles();
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ParentStackParamList>>();
  const { parent } = useAuth();
  const parentId =
    parent?.id?.trim() || route.params?.parentId?.trim() || PARENT_USER_ID;
  const [data, setData] = useState<ParentDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!parentId) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const d = await getParentDashboard(parentId);
      setData(d);
    } catch (e) {
      setData(null);
      setError(formatApiError(e, "No se pudo cargar el panel."));
    } finally {
      setLoading(false);
    }
  }, [parentId]);

  const refreshDashboardQuiet = useCallback(async () => {
    if (!parentId) return;
    try {
      const d = await getParentDashboard(parentId);
      setData(d);
    } catch (e) {
      showToast(formatApiError(e, "No se pudo actualizar el panel."), "error");
    }
  }, [parentId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onSettingsChange = useCallback((childId: string, patch: Partial<ParentDashboardChildRow["settings"]>) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        children: prev.children.map((c) =>
          c.child.id === childId ? { ...c, settings: { ...c.settings, ...patch } } : c
        ),
      };
    });
  }, []);

  if (!parentId) {
    return (
      <View style={styles.centered}>
        <BrandEmptyState
          emoji="👨‍👩‍👧"
          title="No hay cuenta de tutor vinculada"
          subtitle="Volvé a iniciar sesión o configurá EXPO_PUBLIC_PARENT_ID."
        />
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingHint}>Cargando panel familiar…</Text>
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={styles.centered}>
        <BrandEmptyState
          emoji="⚠️"
          title="No se pudo cargar el panel familiar"
          subtitle={error}
        />
        <Text style={styles.retry} onPress={() => void load()}>
          Reintentar
        </Text>
      </View>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      <View style={styles.parentBanner}>
        <Text style={styles.parentEmail}>{data.parent.email}</Text>
        <Text style={styles.dateLine}>Datos del día UTC: {data.dateUtc}</Text>
        <Pressable
          onPress={() => navigation.navigate("AddMinor")}
          style={{
            marginTop: 10,
            alignSelf: "flex-start",
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            backgroundColor: colors.primary,
          }}
          accessibilityRole="button"
          accessibilityLabel="Agregar menor"
        >
          <Text style={{ color: colors.textOnPrimary, fontWeight: "700" }}>➕ Agregar hijo</Text>
        </Pressable>
        {parent?.isPremium ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Pressable
              onPress={() => navigation.navigate("ParentAnalytics", { parentId })}
              style={styles.analyticsCta}
              accessibilityRole="button"
              accessibilityLabel="Ver analíticas familiares"
            >
              <Text style={styles.analyticsCtaText}>📊 Ver analíticas</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("ParentCoach", { parentId })}
              style={styles.analyticsCta}
              accessibilityRole="button"
              accessibilityLabel="Abrir guía para padres"
            >
              <Text style={styles.analyticsCtaText}>💡 Guía para padres</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Pressable
              onPress={() => navigation.navigate("Premium")}
              style={styles.premiumCta}
              accessibilityRole="button"
              accessibilityLabel="Conocer EduPlay Premium"
            >
              <Text style={styles.premiumCtaText}>✨ Conocer Premium</Text>
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate("ParentCoach", { parentId })}
              style={styles.analyticsCta}
              accessibilityRole="button"
              accessibilityLabel="Abrir guía para padres"
            >
              <Text style={styles.analyticsCtaText}>💡 Guía para padres</Text>
            </Pressable>
          </View>
        )}
      </View>

      {data.familyEvents && data.familyEvents.length > 0 ? (
        <View style={styles.childCard}>
          <Text style={styles.sectionLabel}>Novedades</Text>
          <Text style={styles.subHint}>Avisos recientes: amistades, mensajes revisables por filtro, etc.</Text>
          {data.familyEvents.slice(0, 15).map((ev) => (
            <View key={ev.id} style={styles.activityRow}>
              <Text style={styles.activityBadge}>{ev.title}</Text>
              <Text style={styles.activityText}>{ev.body}</Text>
              <Text style={styles.activityDate}>{ev.createdAt.slice(0, 16).replace("T", " ")}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {data.children.length === 0 ? (
        <BrandEmptyState
          emoji="🧒"
          title="No hay menores vinculados"
          subtitle="Vinculá un menor para ver su actividad y controles."
        />
      ) : (
        data.children.map((row) => (
          <ChildPanel
            key={row.child.id}
            row={row}
            parentId={parentId}
            onSettingsChange={onSettingsChange}
            onRefreshQuiet={refreshDashboardQuiet}
            busyKey={busyKey}
            setBusyKey={setBusyKey}
          />
        ))
      )}

      <View style={styles.legalFooter}>
        <Pressable
          onPress={() => navigation.navigate("LegalDocument", { kind: "privacy" })}
          accessibilityRole="button"
          accessibilityLabel="Política de privacidad"
        >
          <Text style={styles.legalFooterLink}>Política de privacidad</Text>
        </Pressable>
        <Text style={styles.legalFooterMuted}>·</Text>
        <Pressable
          onPress={() => navigation.navigate("LegalDocument", { kind: "terms" })}
          accessibilityRole="button"
          accessibilityLabel="Términos del servicio"
        >
          <Text style={styles.legalFooterLink}>Términos del servicio</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const localStyles = StyleSheet.create({
  blockInput: {
    marginTop: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
  },
});
