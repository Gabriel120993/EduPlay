import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { AppIcon } from "../components/AppIcon";
import { API_BASE_URL } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { getRarityBadgeVisual } from "../lib/achievementRarityUi";
import { formatApiError } from "../lib/apiErrors";
import type { RootStackParamList } from "../navigation/types";
import {
  getAchievementSystemCompare,
  getAchievementSystemOverview,
  patchAchievementProfileVisibility,
} from "../services/api";
import type { AchievementSystemItemApi, AchievementSystemKindApi } from "../types/api";
import { radius, screenEdge, space, typography } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList, "AchievementSystem">;

const KIND_LABEL: Record<AchievementSystemKindApi, string> = {
  PROGRESS: "Progreso",
  SKILL: "Habilidad",
  SOCIAL: "Social",
  SPECIAL: "Especiales",
  COLLECTIBLE: "Coleccionables",
};

function fullUrl(path: string): string {
  if (path.startsWith("http")) return path;
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}

export function AchievementSystemScreen() {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { viewerUserId } = useAuth();
  const userId = viewerUserId?.trim() ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<Awaited<ReturnType<typeof getAchievementSystemOverview>> | null>(null);
  const [tab, setTab] = useState<AchievementSystemKindApi | "ALL">("ALL");
  const [peerId, setPeerId] = useState("");
  const [compareText, setCompareText] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) {
      setError("Falta usuario.");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const o = await getAchievementSystemOverview(userId);
      setData(o);
    } catch (e) {
      setError(formatApiError(e, "No se pudieron cargar los logros."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    if (tab === "ALL") return data.items;
    return data.items.filter((i) => i.systemKind === tab);
  }, [data, tab]);

  const onTogglePublic = async (v: boolean) => {
    if (!userId) return;
    try {
      const r = await patchAchievementProfileVisibility(userId, v);
      setData((prev) => (prev ? { ...prev, achievementsPublicOnProfile: r.achievementsPublicOnProfile } : prev));
    } catch {
      /* toast opcional */
    }
  };

  const runCompare = async () => {
    const pid = peerId.trim();
    if (!userId || !pid) return;
    try {
      const r = await getAchievementSystemCompare(userId, pid);
      setCompareText(
        `vs ${r.peer.username} (nv.${r.peer.level}): vos ${r.you.unlocked} · ${r.peer.username} ${r.peer.unlocked} · Δ ${r.delta >= 0 ? "+" : ""}${r.delta}`
      );
    } catch (e) {
      setCompareText(formatApiError(e, "No se pudo comparar."));
    }
  };

  const openCert = (path: string) => {
    void Linking.openURL(fullUrl(path));
  };

  const renderTile = (item: AchievementSystemItemApi) => {
    const isDark = mode === "dark";
    const rv = getRarityBadgeVisual(item.badge.rarity, isDark);
    const locked = !item.unlocked;
    return (
      <View
        key={item.id}
        style={{
          width: "31%",
          minWidth: 100,
          marginBottom: space.md,
          padding: space.sm,
          borderRadius: radius.cardSm,
          backgroundColor: locked ? colors.ghostBg : rv.softBg,
          borderWidth: 1,
          borderColor: locked ? colors.borderSubtle : rv.border,
        }}
      >
        <Text style={{ fontSize: 22, textAlign: "center" }}>{item.badge.icon}</Text>
        <Text style={{ color: colors.text, fontWeight: "800", fontSize: 11, marginTop: 4, textAlign: "center" }} numberOfLines={3}>
          {item.displayTitle}
        </Text>
        {item.hidden ? (
          <Text style={{ color: colors.textMuted, fontSize: 9, textAlign: "center", marginTop: 2 }}>Oculto</Text>
        ) : null}
      </View>
    );
  };

  if (!userId) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, justifyContent: "center", alignItems: "center", padding: space.lg }}>
        <Text style={{ color: colors.text }}>Iniciá sesión como menor para ver logros.</Text>
      </View>
    );
  }

  if (loading && !data) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, justifyContent: "center", alignItems: "center", backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error && !data) {
    return (
      <View style={{ flex: 1, paddingTop: insets.top, padding: space.lg, backgroundColor: colors.background }}>
        <Text style={{ color: colors.error }}>{error}</Text>
        <Pressable onPress={() => void load()} style={{ marginTop: space.md }}>
          <Text style={{ color: colors.link, fontWeight: "800" }}>Reintentar</Text>
        </Pressable>
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: screenEdge.horizontal,
          paddingBottom: space.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderSubtle,
        }}
      >
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={{ color: colors.link, fontWeight: "900", fontSize: 16 }}>‹ Volver</Text>
        </Pressable>
        <Text style={{ flex: 1, marginLeft: space.sm, color: colors.text, fontWeight: "900", fontSize: 18 }} numberOfLines={1}>
          Mural de logros
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: screenEdge.horizontal, paddingBottom: insets.bottom + space.xl }}>
        <Text style={{ color: colors.textMuted, fontWeight: "600", marginBottom: space.md }}>
          Nivel {data.level} · {data.levelTier.tierName} ({data.levelTier.tierBand}) · insignias {data.levelTier.badgeStyle}
        </Text>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: space.md,
            padding: space.md,
            borderRadius: radius.cardSm,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
          }}
        >
          <View style={{ flex: 1, paddingRight: space.md }}>
            <Text style={{ color: colors.text, fontWeight: "800" }}>Mostrar logros en perfil público</Text>
            <Text style={{ color: colors.textMuted, fontSize: typography.secondary, marginTop: 4 }}>
              Opcional: amigos pueden ver tu mural cuando la app lo habilite.
            </Text>
          </View>
          <Switch value={data.achievementsPublicOnProfile} onValueChange={(v) => void onTogglePublic(v)} />
        </View>

        <Text style={{ color: colors.text, fontWeight: "900", marginBottom: space.sm }}>
          Progreso: {data.stats.unlockedTotal} / {data.stats.catalogTotal}
        </Text>

        {data.collections.length > 0 ? (
          <>
            <Text style={{ color: colors.text, fontWeight: "900", marginTop: space.md, marginBottom: space.sm }}>Colecciones</Text>
            {data.collections.map((c) => (
              <View key={c.key} style={{ marginBottom: space.sm }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: colors.textSecondary, fontWeight: "700" }}>
                    {c.label} ({c.unlocked}/{c.total})
                  </Text>
                  {c.complete ? (
                    <Pressable onPress={() => openCert(c.certificateUrl)}>
                      <Text style={{ color: colors.link, fontWeight: "800" }}>Certificado</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={{ height: 8, backgroundColor: colors.ghostBg, borderRadius: 4, marginTop: 4 }}>
                  <View
                    style={{
                      width: `${c.total > 0 ? Math.min(100, (c.unlocked / c.total) * 100) : 0}%`,
                      height: "100%",
                      borderRadius: 4,
                      backgroundColor: colors.primary,
                    }}
                  />
                </View>
              </View>
            ))}
          </>
        ) : null}

        <Text style={{ color: colors.text, fontWeight: "900", marginTop: space.lg, marginBottom: space.sm }}>Comparar con amigo</Text>
        <TextInput
          value={peerId}
          onChangeText={setPeerId}
          placeholder="UUID del amigo (aceptado)"
          placeholderTextColor={colors.placeholder}
          style={{
            borderWidth: 1,
            borderColor: colors.inputBorder,
            borderRadius: radius.cardSm,
            padding: space.sm,
            color: colors.inputText,
            marginBottom: space.sm,
          }}
        />
        <Pressable
          onPress={() => void runCompare()}
          style={{
            alignSelf: "flex-start",
            paddingVertical: space.sm,
            paddingHorizontal: space.md,
            borderRadius: radius.cardSm,
            backgroundColor: colors.primary,
          }}
        >
          <Text style={{ color: colors.textOnPrimary, fontWeight: "900" }}>Comparar</Text>
        </Pressable>
        {compareText ? (
          <Text style={{ color: colors.textSecondary, marginTop: space.sm, fontWeight: "600" }}>{compareText}</Text>
        ) : null}

        <Text style={{ color: colors.text, fontWeight: "900", marginTop: space.lg, marginBottom: space.sm }}>Filtro</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.sm, marginBottom: space.md }}>
          <Pressable
            onPress={() => setTab("ALL")}
            style={{
              paddingHorizontal: space.md,
              paddingVertical: space.sm,
              borderRadius: 999,
              backgroundColor: tab === "ALL" ? colors.chipActiveBg : colors.chipBg,
              borderWidth: 1,
              borderColor: tab === "ALL" ? colors.chipActiveBorder : colors.chipBorder,
            }}
          >
            <Text style={{ color: tab === "ALL" ? colors.chipTextActive : colors.chipText, fontWeight: "800" }}>Todos</Text>
          </Pressable>
          {(Object.keys(KIND_LABEL) as AchievementSystemKindApi[]).map((k) => (
            <Pressable
              key={k}
              onPress={() => setTab(k)}
              style={{
                paddingHorizontal: space.md,
                paddingVertical: space.sm,
                borderRadius: 999,
                backgroundColor: tab === k ? colors.chipActiveBg : colors.chipBg,
                borderWidth: 1,
                borderColor: tab === k ? colors.chipActiveBorder : colors.chipBorder,
              }}
            >
              <Text style={{ color: tab === k ? colors.chipTextActive : colors.chipText, fontWeight: "800" }}>{KIND_LABEL[k]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={{ color: colors.textMuted, fontSize: typography.secondary, marginBottom: space.sm }}>
          Trofeos y coleccionables 3D (vista mural)
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>{filteredItems.map(renderTile)}</View>
      </ScrollView>
    </View>
  );
}
