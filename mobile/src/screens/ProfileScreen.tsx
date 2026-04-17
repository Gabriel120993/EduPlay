import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

import { AppIcon } from "../components/AppIcon";
import { BrandEmptyState } from "../components/BrandEmptyState";
import { ReadOnlyBanner } from "../components/ReadOnlyBanner";
import { VIEWER_USER_ID } from "../config";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useScreenTime } from "../contexts/ScreenTimeContext";
import { getRarityBadgeVisual } from "../lib/achievementRarityUi";
import { categoryDisplayLabel, getCategoryUi } from "../lib/contentCategoryUi";
import { isRemoteAvatarUrl } from "../lib/avatarDisplay";
import { formatApiError } from "../lib/apiErrors";
import { applyNotificationPreferencesFromProfile } from "../lib/notificationPreferencesStore";
import { touchChildLastActiveAt } from "../lib/activityReminders";
import { tryAlertMissionCompletions } from "../lib/missionCompletionFeedback";
import { trackEvent } from "../services/analytics";
import { getTodayDailyMissions, getUserProfile } from "../services/api";
import type {
  ProfileAchievementItem,
  ProfileInterestItem,
  TodayMissionItem,
  TodayMissionsResponse,
  UserProfileResponse,
} from "../types/api";
import type { MainTabParamList } from "../navigation/types";
import {
  hexWithAlpha,
  levelAccentColor,
  levelRingGradient,
  missionTypeStrongColors,
  profileHeroCardGradient,
  profileScreenGradient,
  sectionTitleAccent,
  sectionTints,
  xpBarFillGradient,
} from "../lib/profileKidTheme";
import type { IoniconName } from "../theme/icons";
import { avatarSize, iconSize, radius, space, typography } from "../theme/tokens";

type Props = BottomTabScreenProps<MainTabParamList, "Profile">;

/** Misma regla que el servidor (`xpLevel.ts`): 100 XP por nivel. */
const XP_PER_LEVEL = 100;

const BADGE_GRID_GAP = 10;

function useBadgeGridCellWidth(): number {
  const { width } = useWindowDimensions();
  const horizontalPadding = space.md * 2;
  const usable = Math.max(160, width - horizontalPadding);
  const cols = usable >= 328 ? 3 : 2;
  return (usable - BADGE_GRID_GAP * (cols - 1)) / cols;
}

function ProfileBadgeCell({ item, displayName }: { item: ProfileAchievementItem; displayName: string }) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const rv = getRarityBadgeVisual(item.badge.rarity, isDark);
  const iosGlowStyle =
    rv.iosShadow && Platform.OS === "ios"
      ? {
          shadowColor: rv.iosShadow.shadowColor,
          shadowOffset: rv.iosShadow.shadowOffset,
          shadowOpacity: Math.min(0.85, rv.iosShadow.shadowOpacity + 0.14),
          shadowRadius: rv.iosShadow.shadowRadius + 4,
        }
      : Platform.OS === "ios"
        ? {
            shadowColor: rv.accent,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: isDark ? 0.28 : 0.22,
            shadowRadius: 10,
          }
        : null;
  const androidElev =
    Platform.OS === "android" ? Math.min(14, rv.androidElevation + (item.badge.rarity === "LEGENDARY" ? 4 : 2)) : null;

  return (
    <View
      style={[
        styles.badgeCellCard,
        {
          backgroundColor: rv.softBg,
          borderColor: rv.border,
          borderWidth: rv.borderWidth,
        },
        iosGlowStyle,
        androidElev != null ? { elevation: androidElev } : null,
      ]}
      accessibilityRole="summary"
      accessibilityLabel={`${displayName}. Rareza ${item.badge.rarity}`}
    >
      <View
        style={[
          styles.badgeIconRing,
          {
            borderColor: rv.border,
            backgroundColor: isDark ? "rgba(0,0,0,0.22)" : "rgba(255,255,255,0.55)",
          },
        ]}
      >
        <Text style={styles.badgeIconText}>{item.badge.icon}</Text>
      </View>
      <Text style={[styles.badgeCellName, { color: colors.text }]} numberOfLines={2}>
        {displayName}
      </Text>
      <Text style={[styles.badgeCellRarity, { color: rv.accent }]} numberOfLines={1}>
        {item.badge.rarity}
      </Text>
    </View>
  );
}

function ProfileBadgeGrid({
  items,
  displayName,
}: {
  items: ProfileAchievementItem[];
  displayName: (item: ProfileAchievementItem) => string;
}) {
  const cellWidth = useBadgeGridCellWidth();
  return (
    <View style={[styles.badgeGrid, { gap: BADGE_GRID_GAP }]}>
      {items.map((item, index) => (
        <View key={`badge-${index}-${item.badge.label}`} style={{ width: cellWidth }}>
          <ProfileBadgeCell item={item} displayName={displayName(item)} />
        </View>
      ))}
    </View>
  );
}

const GAMES_MILESTONES = [10, 25, 50, 100, 200];
/** Barra de interés: referencia visual (no tope duro del servidor). */
const INTEREST_SCORE_VISUAL_CAP = 200;

function computeGamesProgress(totalGames: number): { pct: number; nextTarget: number; prevTarget: number } {
  const last = GAMES_MILESTONES[GAMES_MILESTONES.length - 1]!;
  if (totalGames >= last) {
    return { pct: 100, nextTarget: last, prevTarget: last };
  }
  const nextTarget = GAMES_MILESTONES.find((m) => m > totalGames) ?? last;
  const idx = GAMES_MILESTONES.indexOf(nextTarget);
  const prevTarget = idx > 0 ? GAMES_MILESTONES[idx - 1]! : 0;
  const pct =
    nextTarget > prevTarget ? ((totalGames - prevTarget) / (nextTarget - prevTarget)) * 100 : 100;
  return { pct: Math.min(100, Math.max(0, pct)), nextTarget, prevTarget };
}

function ProfileActivityStats({
  interests,
  totalGames,
}: {
  interests: ProfileInterestItem[];
  totalGames: number;
}) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const favorite = interests[0] ?? null;
  const favoriteUi = favorite ? getCategoryUi(favorite.category) : null;

  const interestPct = favorite
    ? Math.min(100, (favorite.score / INTEREST_SCORE_VISUAL_CAP) * 100)
    : 0;

  const gamesProg = useMemo(() => computeGamesProgress(totalGames), [totalGames]);

  const interestAnim = useRef(new Animated.Value(0)).current;
  const gamesAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(interestAnim, {
      toValue: interestPct,
      duration: 680,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [interestAnim, interestPct]);

  useEffect(() => {
    Animated.timing(gamesAnim, {
      toValue: gamesProg.pct,
      duration: 680,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [gamesAnim, gamesProg.pct]);

  const interestWidth = interestAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });
  const gamesWidth = gamesAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const gamesLabel =
    totalGames >= gamesProg.nextTarget && gamesProg.nextTarget === GAMES_MILESTONES[GAMES_MILESTONES.length - 1]
      ? `${totalGames} partidas`
      : `${totalGames} / ${gamesProg.nextTarget} hacia la próxima meta`;

  const cardBg: [string, string] = isDark
    ? [hexWithAlpha(colors.primary, 0.12), hexWithAlpha(colors.cardElevated, 0.95)]
    : [colors.primarySoft, "#ffffff"];

  const interestBarColor = favoriteUi?.accent ?? colors.primary;

  return (
    <LinearGradient
      colors={cardBg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.activityCard, { borderColor: colors.borderSubtle }]}
    >
      <View style={styles.activityRow}>
        <View style={[styles.activityIconWrap, { backgroundColor: hexWithAlpha(interestBarColor, isDark ? 0.25 : 0.18) }]}>
          <AppIcon name="heart-outline" color={interestBarColor} size="md" />
        </View>
        <View style={styles.activityTextCol}>
          <Text style={[styles.activityKicker, { color: colors.textMuted }]}>Categoría favorita</Text>
          {favorite ? (
            <>
              <View style={styles.activityTitleRow}>
                {favoriteUi ? <Text style={styles.activityEmoji}>{favoriteUi.emoji}</Text> : null}
                <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                  {favoriteUi ? categoryDisplayLabel(favoriteUi) : favorite.category}
                </Text>
              </View>
              <Text style={[styles.activityMeta, { color: colors.textMuted }]}>
                Interés {favorite.score} pts · más alto en tu perfil
              </Text>
              <View style={[styles.activityTrack, { backgroundColor: colors.borderSubtle }]}>
                <Animated.View
                  style={[
                    styles.activityFill,
                    {
                      width: interestWidth,
                      backgroundColor: interestBarColor,
                    },
                  ]}
                />
              </View>
            </>
          ) : (
            <Text style={[styles.activityEmpty, { color: colors.textMuted }]}>
              Jugá y completá contenido para ver tu categoría favorita.
            </Text>
          )}
        </View>
      </View>

      <View style={[styles.activityDivider, { backgroundColor: colors.borderSubtle }]} />

      <View style={styles.activityRow}>
        <View style={[styles.activityIconWrap, { backgroundColor: hexWithAlpha(colors.primary, isDark ? 0.22 : 0.14) }]}>
          <AppIcon name="game-controller-outline" color={colors.primaryStrong} size="md" />
        </View>
        <View style={styles.activityTextCol}>
          <Text style={[styles.activityKicker, { color: colors.textMuted }]}>Partidas jugadas</Text>
          <Text style={[styles.activityBigNumber, { color: colors.text }]}>{totalGames}</Text>
          <Text style={[styles.activityMeta, { color: colors.textMuted }]}>{gamesLabel}</Text>
          <View style={[styles.activityTrack, { backgroundColor: colors.borderSubtle }]}>
            <Animated.View
              style={[styles.activityFill, { width: gamesWidth, backgroundColor: colors.primary }]}
            />
          </View>
        </View>
      </View>

      <View style={[styles.activityDivider, { backgroundColor: colors.borderSubtle }]} />

      <View style={styles.activityRow}>
        <View style={[styles.activityIconWrap, { backgroundColor: hexWithAlpha(colors.textMuted, 0.15) }]}>
          <AppIcon name="flame-outline" color={colors.textMuted} size="md" />
        </View>
        <View style={styles.activityTextCol}>
          <Text style={[styles.activityKicker, { color: colors.textMuted }]}>Racha</Text>
          <Text style={[styles.activityStreakPlaceholder, { color: colors.textMuted }]}>
            Próximamente · seguí entrando todos los días
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
}

function SectionTitle({
  iconName,
  title,
  emoji,
  tintIndex = 0,
}: {
  iconName: IoniconName;
  title: string;
  /** Emoji opcional delante del título (tono gamificado). */
  emoji?: string;
  tintIndex?: number;
}) {
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";
  const tints = sectionTints(isDark);
  const tint = tints[tintIndex % tints.length] ?? tints[0];
  const accent = sectionTitleAccent(tintIndex);
  return (
    <LinearGradient
      colors={tint}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[
        styles.sectionTitleGradient,
        {
          borderColor: colors.borderSubtle,
          borderLeftWidth: 4,
          borderLeftColor: accent,
        },
      ]}
    >
      <View style={styles.sectionTitleRow}>
        <AppIcon name={iconName} color={accent} size="md" />
        <Text style={[styles.sectionTitleText, { color: colors.text }]}>
          {title}
          {emoji ? ` ${emoji}` : ""}
        </Text>
      </View>
    </LinearGradient>
  );
}

/** Cabecera perfil: 80–100 px (diseño). */
const HERO_AVATAR_SIZE = 90;

function ProfileAvatar({
  username,
  avatarUrl,
  size = HERO_AVATAR_SIZE,
}: {
  username: string;
  avatarUrl: string | null;
  size?: number;
}) {
  const { colors } = useTheme();
  const initial = username.trim().charAt(0).toUpperCase() || "?";
  const [imageFailed, setImageFailed] = useState(false);
  const r = size / 2;
  const remote = isRemoteAvatarUrl(avatarUrl);
  const glyph = avatarUrl && !remote ? avatarUrl.trim() : null;

  useEffect(() => {
    setImageFailed(false);
  }, [avatarUrl]);

  const showPlaceholder = !avatarUrl || (remote && imageFailed);

  return (
    <View
      style={[
        styles.profileAvatarOuter,
        { width: size, height: size, borderRadius: r, backgroundColor: colors.avatarBg },
      ]}
    >
      {glyph ? (
        <View
          style={[
            styles.profileAvatarPlaceholder,
            { width: size, height: size, borderRadius: r, backgroundColor: colors.avatarPh },
          ]}
        >
          <Text style={{ fontSize: Math.round(size * 0.45), lineHeight: Math.round(size * 0.52) }}>{glyph}</Text>
        </View>
      ) : showPlaceholder ? (
        <View
          style={[
            styles.profileAvatarPlaceholder,
            { width: size, height: size, borderRadius: r, backgroundColor: colors.avatarPh },
          ]}
        >
          <Text
            style={[
              styles.profileAvatarPlaceholderText,
              { fontSize: Math.round(size * 0.36), color: colors.avatarPhText },
            ]}
          >
            {initial}
          </Text>
        </View>
      ) : (
        <Image
          source={{ uri: avatarUrl as string }}
          style={{ width: size, height: size, borderRadius: r }}
          onError={() => setImageFailed(true)}
        />
      )}
    </View>
  );
}

function ProfileHeroCard({
  username,
  avatarUrl,
  level,
  experience,
}: {
  username: string;
  avatarUrl: string | null;
  level: number;
  experience: number;
}) {
  const xp = Math.max(0, experience);
  const pct = Math.min(100, Math.round((xp / XP_PER_LEVEL) * 100));
  const remaining = Math.max(0, XP_PER_LEVEL - xp);
  const nextLevel = level + 1;
  const barAnim = useRef(new Animated.Value(0)).current;
  const accent = levelAccentColor(level);
  const ringPad = 5;
  const ringOuter = HERO_AVATAR_SIZE + ringPad * 2;

  useEffect(() => {
    Animated.spring(barAnim, {
      toValue: pct,
      friction: 7,
      tension: 42,
      useNativeDriver: false,
    }).start();
  }, [barAnim, pct]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const { mode, colors } = useTheme();
  const isDark = mode === "dark";

  return (
    <LinearGradient
      colors={profileHeroCardGradient(isDark)}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.heroCard, { borderColor: colors.borderSubtle }]}
    >
      <LinearGradient
        colors={levelRingGradient(level)}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.heroAvatarRingGrad,
          {
            width: ringOuter,
            height: ringOuter,
            borderRadius: ringOuter / 2,
            padding: ringPad,
          },
        ]}
      >
        <View
          style={[
            styles.heroAvatarInnerClip,
            {
              width: HERO_AVATAR_SIZE,
              height: HERO_AVATAR_SIZE,
              borderRadius: HERO_AVATAR_SIZE / 2,
              backgroundColor: isDark ? colors.cardElevated : colors.card,
              borderWidth: isDark ? 0 : StyleSheet.hairlineWidth,
              borderColor: isDark ? "transparent" : colors.borderSubtle,
            },
          ]}
        >
          <ProfileAvatar username={username} avatarUrl={avatarUrl} size={HERO_AVATAR_SIZE} />
        </View>
      </LinearGradient>
      <Text style={[styles.headerUsername, { color: colors.text }]} numberOfLines={2}>
        {username}
      </Text>
      <View style={styles.profileLevelRow}>
        <AppIcon name="rocket-outline" color={accent} size="md" />
        <Text
          style={[styles.profileLevelLine, { color: colors.textBody }]}
          accessibilityRole="header"
          accessibilityLabel={`Nivel ${level}`}
        >
          Nivel {level} 🚀
        </Text>
      </View>
      <Text
        style={[styles.profileXpFraction, { color: colors.textMuted }]}
        accessibilityLabel={`${xp} de ${XP_PER_LEVEL} puntos de experiencia hacia el nivel ${nextLevel}`}
      >
        {xp} / {XP_PER_LEVEL} XP · próximo nivel {nextLevel}
      </Text>
      <View
        style={[
          styles.heroXpTrack,
          {
            borderColor: hexWithAlpha(accent, isDark ? 0.55 : 0.4),
            backgroundColor: hexWithAlpha(accent, isDark ? 0.2 : 0.12),
          },
        ]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: XP_PER_LEVEL, now: xp }}
        accessibilityLabel={`Experiencia ${xp} de ${XP_PER_LEVEL} para subir al nivel ${nextLevel}`}
      >
        <Animated.View style={[styles.heroXpFillClip, { width: barWidth }]}>
          <LinearGradient
            colors={xpBarFillGradient(level)}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={styles.heroXpFillGradient}
          />
        </Animated.View>
      </View>
      <Text style={[styles.heroXpCaption, { color: colors.textMuted }]}>
        {remaining > 0
          ? `Faltan ${remaining} XP para llegar al nivel ${nextLevel}`
          : `¡Completaste la barra! Pronto nivel ${nextLevel}`}
      </Text>
    </LinearGradient>
  );
}

function missionTypeEmoji(type: string): string {
  switch (type) {
    case "PLAY_GAMES":
      return "🎮";
    case "EARN_XP":
      return "⭐";
    case "COMPLETE_ACHIEVEMENT":
      return "🏆";
    case "READ_CONTENT":
      return "📖";
    case "CORRECT_ANSWERS":
      return "✅";
    default:
      return "🎯";
  }
}

function missionTypeAccessibilityLabel(type: string): string {
  switch (type) {
    case "PLAY_GAMES":
      return "Misión de juegos";
    case "EARN_XP":
      return "Misión de XP";
    case "COMPLETE_ACHIEVEMENT":
      return "Misión de logros";
    case "READ_CONTENT":
      return "Misión de lectura";
    case "CORRECT_ANSWERS":
      return "Misión de respuestas correctas";
    default:
      return "Misión";
  }
}

function MissionsOverallProgress({
  completedCount,
  total,
}: {
  completedCount: number;
  total: number;
}) {
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";
  const pct = total > 0 ? Math.min(100, Math.round((completedCount / total) * 100)) : 0;
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: pct,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [anim, pct]);

  const widthInterpolated = anim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const progressBg: [string, string] = isDark
    ? [colors.primarySoftBorder, colors.primarySoft]
    : [colors.primarySoft, colors.primarySoftBorder];

  return (
    <LinearGradient
      colors={progressBg}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.missionsOverallBlock, { borderColor: colors.borderSubtle }]}
    >
      <View style={styles.missionsOverallHeader}>
        <View style={styles.missionsOverallLabelRow}>
          <AppIcon name="bar-chart-outline" color={colors.text} size="sm" />
          <Text style={[styles.missionsOverallLabel, { color: colors.text }]}>Progreso del día</Text>
        </View>
        <Text style={[styles.missionsOverallCount, { color: colors.primaryStrong }]}>
          {completedCount}/{total} completadas
        </Text>
      </View>
      <View
        style={[styles.missionsOverallTrack, { backgroundColor: colors.borderSubtle }]}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: pct }}
      >
        <Animated.View style={[styles.missionsOverallFill, { width: widthInterpolated, backgroundColor: colors.primary }]} />
      </View>
    </LinearGradient>
  );
}

function MissionCard({
  item,
  rewardXpMin,
  rewardXpMax,
  justCompleted,
}: {
  item: TodayMissionItem;
  rewardXpMin: number;
  rewardXpMax: number;
  justCompleted?: boolean;
}) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const typeTint = missionTypeStrongColors(item.type, isDark);

  const shownProgress = Math.min(item.progress, item.targetValue);
  const progressFraction = `${shownProgress}/${item.targetValue}`;
  const pct =
    item.completed
      ? 100
      : item.targetValue > 0
        ? Math.min(100, Math.round((shownProgress / item.targetValue) * 100))
        : 0;

  const barAnim = useRef(new Animated.Value(0)).current;
  const celebrateScale = useRef(new Animated.Value(1)).current;
  const checkScale = useRef(new Animated.Value(item.completed ? 1 : 0)).current;
  const ranCelebrateRef = useRef(false);

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: pct,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [barAnim, pct]);

  useEffect(() => {
    if (!item.completed) {
      checkScale.setValue(0);
      return;
    }
    if (justCompleted) {
      checkScale.setValue(0.2);
      Animated.spring(checkScale, {
        toValue: 1,
        friction: 6,
        tension: 200,
        useNativeDriver: true,
      }).start();
    } else {
      checkScale.setValue(1);
    }
  }, [item.completed, justCompleted, checkScale]);

  useEffect(() => {
    if (!justCompleted || !item.completed || ranCelebrateRef.current) return;
    ranCelebrateRef.current = true;
    Animated.sequence([
      Animated.spring(celebrateScale, {
        toValue: 1.045,
        friction: 5,
        tension: 160,
        useNativeDriver: true,
      }),
      Animated.spring(celebrateScale, {
        toValue: 1,
        friction: 7,
        tension: 140,
        useNativeDriver: true,
      }),
    ]).start();
  }, [justCompleted, item.completed, celebrateScale]);

  const barWidth = barAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  let rewardLabel: string;
  if (item.completed) {
    rewardLabel =
      item.rewardXpGranted != null
        ? `+${item.rewardXpGranted} XP obtenidos`
        : "¡Completada!";
  } else {
    rewardLabel = `Recompensa: ${rewardXpMin}–${rewardXpMax} XP`;
  }

  const trackBg = item.completed
    ? isDark
      ? "rgba(16, 185, 129, 0.35)"
      : "#a7f3d0"
    : isDark
      ? "rgba(148, 163, 184, 0.35)"
      : "#dbeafe";
  const fillBg = item.completed ? (isDark ? "#34d399" : "#059669") : typeTint.accent;

  const shellCompleted = isDark
    ? {
        backgroundColor: "rgba(6, 78, 59, 0.42)",
        borderColor: "#34d399",
        borderWidth: 2,
      }
    : styles.missionCardShellCompletedLight;

  const shellActive = isDark
    ? {
        backgroundColor: colors.cardElevated,
        borderColor: colors.border,
        borderWidth: StyleSheet.hairlineWidth,
      }
    : styles.missionCardShellActiveLight;

  return (
    <Animated.View style={{ transform: [{ scale: celebrateScale }] }}>
      <View
        style={[
          styles.missionCardShell,
          item.completed ? shellCompleted : shellActive,
          !item.completed && {
            borderLeftWidth: 4,
            borderLeftColor: typeTint.border,
          },
          Boolean(justCompleted) && item.completed && styles.missionCardShellJustDone,
        ]}
        accessibilityRole="summary"
        accessibilityLabel={`${item.title}. ${progressFraction}. ${item.completed ? "Completada" : "En progreso"}`}
      >
        <View style={styles.missionCardRow}>
          <View
            style={[styles.missionEmojiCircle, { backgroundColor: typeTint.iconBg, borderColor: typeTint.border }]}
            accessible
            accessibilityRole="text"
            accessibilityLabel={missionTypeAccessibilityLabel(item.type)}
          >
            <Text style={styles.missionEmojiChar}>{missionTypeEmoji(item.type)}</Text>
          </View>
          <View style={styles.missionCardMain}>
            <View style={styles.missionTitleRow}>
              <Text
                style={[
                  styles.missionCardTitle,
                  { color: item.completed ? (isDark ? "#d1fae5" : "#064e3b") : colors.text },
                ]}
                numberOfLines={2}
              >
                {item.title}
              </Text>
              {item.completed ? (
                <Animated.View style={{ transform: [{ scale: checkScale }] }} accessibilityElementsHidden>
                  <AppIcon name="checkmark-circle" color={isDark ? "#4ade80" : "#059669"} size="lg" />
                </Animated.View>
              ) : null}
            </View>
            <Text
              style={[
                styles.missionProgressFraction,
                { color: item.completed ? (isDark ? "#a7f3d0" : "#047857") : colors.textMuted },
              ]}
            >
              {progressFraction}
            </Text>
            <View
              style={[styles.missionBarTrackCard, { backgroundColor: trackBg }]}
              accessibilityRole="progressbar"
              accessibilityValue={{
                min: 0,
                max: item.targetValue,
                now: shownProgress,
              }}
            >
              <Animated.View style={[styles.missionBarFillCard, { width: barWidth, backgroundColor: fillBg }]} />
            </View>
            <Text
              style={[
                styles.missionRewardLine,
                { color: item.completed ? (isDark ? "#6ee7b7" : "#047857") : colors.textMuted },
              ]}
            >
              {rewardLabel}
            </Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export function ProfileScreen({ route }: Props) {
  const { colors, mode } = useTheme();
  const isDark = mode === "dark";
  const { viewerUserId: authViewerId, token } = useAuth();
  const { readOnlyMode } = useScreenTime();
  const userId =
    authViewerId?.trim() ||
    route.params?.userId?.trim() ||
    (token ? "" : VIEWER_USER_ID);
  const [profile, setProfile] = useState<UserProfileResponse | null>(null);
  const [dailyMissions, setDailyMissions] = useState<TodayMissionsResponse | null>(null);
  const [highlightedMissionIds, setHighlightedMissionIds] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const missionSnapshotRef = useRef<Map<string, boolean> | null>(null);
  const missionsFetchGen = useRef(0);
  const highlightClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const applyMissionsData = useCallback((missionsData: TodayMissionsResponse) => {
    const prev = missionSnapshotRef.current;
    if (prev !== null) {
      const transitions: { userMissionId: string; xpReward: number }[] = [];
      for (const m of missionsData.missions) {
        if (prev.get(m.userMissionId) === false && m.completed) {
          transitions.push({
            userMissionId: m.userMissionId,
            xpReward: m.rewardXpGranted ?? 0,
          });
        }
      }
      const shownIds = tryAlertMissionCompletions(transitions);
      if (shownIds.length > 0) {
        if (highlightClearRef.current) clearTimeout(highlightClearRef.current);
        setHighlightedMissionIds(new Set(shownIds));
        highlightClearRef.current = setTimeout(() => {
          setHighlightedMissionIds(new Set());
          highlightClearRef.current = null;
        }, 4500);
      }
    }
    missionSnapshotRef.current = new Map(missionsData.missions.map((m) => [m.userMissionId, m.completed]));
    setDailyMissions(missionsData);
  }, [userId]);

  const refreshMissions = useCallback(async () => {
    if (!userId) return;
    const gen = ++missionsFetchGen.current;
    try {
      const missionsData = await getTodayDailyMissions(userId);
      if (gen !== missionsFetchGen.current) return;
      applyMissionsData(missionsData);
    } catch {
      if (gen !== missionsFetchGen.current) return;
      missionSnapshotRef.current = null;
      setDailyMissions(null);
    }
  }, [userId, applyMissionsData]);

  const load = useCallback(async () => {
    if (!userId) {
      setError("Falta userId.");
      setProfile(null);
      setDailyMissions(null);
      missionSnapshotRef.current = null;
      setLoading(false);
      return;
    }
    setError(null);
    try {
      const data = await getUserProfile(userId);
      void applyNotificationPreferencesFromProfile(data);
      setProfile(data);
      await refreshMissions();
    } catch (e) {
      setError(formatApiError(e, "Error al cargar el perfil"));
      setProfile(null);
      setDailyMissions(null);
      missionSnapshotRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [userId, refreshMissions]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (!userId || !profile) return;
      void refreshMissions();
    }, [userId, profile, refreshMissions])
  );

  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      trackEvent("screen_open", { screen: "Profile" });
      void touchChildLastActiveAt();
    }, [userId])
  );

  useEffect(() => {
    return () => {
      if (highlightClearRef.current) clearTimeout(highlightClearRef.current);
    };
  }, []);

  if (!userId && !loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={styles.errorText}>
          {token ? (
            <>
              Tu cuenta de tutor no tiene ningún menor vinculado. Hace falta un usuario hijo en la base de datos para
              ver el perfil y las misiones.
            </>
          ) : (
            <>
              Editá <Text style={styles.mono}>mobile/.env</Text> y definí{" "}
              <Text style={styles.mono}>EXPO_PUBLIC_USER_ID</Text> o iniciá sesión con un tutor que tenga hijos
              cargados.
            </>
          )}
        </Text>
      </View>
    );
  }

  if (loading && !profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Text style={styles.errorText}>{error}</Text>
        <Text style={styles.retry} onPress={() => void load()}>
          Reintentar
        </Text>
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  const { user, featuredBadges, achievements } = profile;
  const interests = profile.interests ?? [];
  const topInterests = interests.slice(0, 3);
  const totalGamesPlayed = profile.stats.totalGameResults;

  return (
    <LinearGradient
      colors={profileScreenGradient(isDark)}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.screenGradient}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
      {readOnlyMode ? <ReadOnlyBanner /> : null}
      <ProfileHeroCard
        username={user.username}
        avatarUrl={user.avatarUrl}
        level={user.level}
        experience={user.experience}
      />

      <SectionTitle iconName="analytics-outline" emoji="📊" title="Tu actividad" tintIndex={4} />
      <ProfileActivityStats interests={interests} totalGames={totalGamesPlayed} />

      <SectionTitle iconName="bulb-outline" emoji="🌟" title="Intereses" tintIndex={0} />
      {topInterests.length === 0 ? (
        <BrandEmptyState
          emoji="🌈"
          title="Todavía no hay intereses"
          subtitle="Jugá, completá logros o publicá y aparecerán aquí."
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.interestsScroll}
        >
          {topInterests.map((it, idx) => {
            const ui = getCategoryUi(it.category);
            if (!ui) return null;
            return (
              <View
                key={it.category}
                style={[
                  styles.interestChip,
                  idx === 0 ? styles.interestChipFavorite : undefined,
                  {
                    borderColor: ui.accent,
                    backgroundColor: ui.softBg,
                    borderLeftWidth: 4,
                    borderLeftColor: ui.highlight,
                  },
                ]}
                accessibilityRole="summary"
                accessibilityLabel={`Interés ${categoryDisplayLabel(ui)}${idx === 0 ? " · favorita" : ""}`}
              >
                {idx === 0 ? (
                  <View style={[styles.interestTopBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.interestTopBadgeText}>Favorita</Text>
                  </View>
                ) : null}
                <AppIcon name={ui.icon} color={ui.accent} size="md" />
                <View style={styles.interestChipTextCol}>
                  <Text style={[styles.interestChipLabel, { color: ui.accent }]} numberOfLines={1}>
                    {categoryDisplayLabel(ui)}
                  </Text>
                  <Text style={[styles.interestChipScore, { color: colors.textMuted }]}>{it.score} pts</Text>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      <SectionTitle iconName="flag-outline" emoji="🎯" title="Misiones" tintIndex={1} />
      {dailyMissions == null ? (
        <BrandEmptyState
          emoji="🛰️"
          title="No se pudieron cargar las misiones"
          subtitle="Reintentá más tarde."
        />
      ) : dailyMissions.missions.length === 0 ? (
        <BrandEmptyState
          emoji={false}
          title="No hay misiones hoy 🎯"
          subtitle="¡Mañana volvés con energía y nuevas misiones!"
        />
   ) : (
        <>
          <Text style={[styles.missionsDate, { color: colors.textMuted }]}>Día UTC: {dailyMissions.date}</Text>
          <MissionsOverallProgress
            completedCount={dailyMissions.missions.filter((x) => x.completed).length}
            total={dailyMissions.missions.length}
          />
          {"dailyChallengeBonus" in dailyMissions && dailyMissions.dailyChallengeBonus?.granted ? (
            <Text style={[styles.missionsDate, { color: colors.success, fontWeight: "800", marginBottom: space.sm }]}>
              Bonus reto diario: +{dailyMissions.dailyChallengeBonus.bonusXp} XP
              {dailyMissions.dailyChallengeBonus.grantedAt
                ? ` · ${new Date(dailyMissions.dailyChallengeBonus.grantedAt).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`
                : ""}{" "}
              · insignia «Campeón del día» 🏆 (la primera vez)
            </Text>
          ) : "dailyChallengeBonusXp" in dailyMissions ? (
            <Text style={[styles.missionsDate, { color: colors.textMuted, marginBottom: space.sm }]}>
              Completá las 3 misiones para +{dailyMissions.dailyChallengeBonusXp} XP extra e insignia (primera vez).
            </Text>
          ) : null}
          {dailyMissions.missions.map((m) => (
            <MissionCard
              key={m.userMissionId}
              item={m}
              rewardXpMin={dailyMissions.rewardXpRange.min}
              rewardXpMax={dailyMissions.rewardXpRange.max}
              justCompleted={highlightedMissionIds.has(m.userMissionId)}
            />
          ))}
        </>
      )}

      <SectionTitle iconName="sparkles-outline" emoji="✨" title="Insignias destacadas" tintIndex={2} />
      {featuredBadges.length === 0 ? (
        <BrandEmptyState
          emoji="✨"
          title="Aún no hay insignias destacadas"
          subtitle="Seguí jugando y desbloqueá insignias para brillar acá."
        />
      ) : (
        <ProfileBadgeGrid items={featuredBadges} displayName={(fb) => fb.badge.label} />
      )}

      <SectionTitle iconName="trophy-outline" emoji="🏆" title="Logros" tintIndex={3} />
      {achievements.length === 0 ? (
        <BrandEmptyState
          emoji={false}
          title="No hay logros todavía 🚀"
          subtitle="Completá juegos y misiones para llenar esta vitrina."
        />
      ) : (
        <ProfileBadgeGrid items={achievements} displayName={(a) => a.title} />
      )}
    </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screenGradient: {
    flex: 1,
  },
  scroll: {
    flex: 1,
    backgroundColor: "transparent",
  },
  scrollContent: {
    padding: space.md,
    paddingBottom: space.xl,
  },
  activityCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    padding: space.md,
    marginBottom: space.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm + space.xs,
  },
  activityIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  activityTextCol: {
    flex: 1,
    minWidth: 0,
  },
  activityKicker: {
    fontSize: typography.secondary - 1,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  activityTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    marginBottom: 4,
  },
  activityEmoji: {
    fontSize: 20,
  },
  activityTitle: {
    fontSize: typography.bodyLarge,
    fontWeight: "900",
    flex: 1,
  },
  activityMeta: {
    fontSize: typography.secondary,
    fontWeight: "600",
    marginBottom: space.sm,
  },
  activityBigNumber: {
    fontSize: typography.title + 4,
    fontWeight: "900",
    marginBottom: 4,
  },
  activityTrack: {
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  activityFill: {
    height: "100%",
    borderRadius: 999,
  },
  activityDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: space.md,
    alignSelf: "stretch",
  },
  activityEmpty: {
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 22,
  },
  activityStreakPlaceholder: {
    fontSize: typography.body,
    fontWeight: "600",
    lineHeight: 22,
  },
  interestChipFavorite: {
    paddingTop: space.sm + space.xs,
  },
  interestsScroll: {
    flexDirection: "row",
    alignItems: "stretch",
    paddingTop: space.sm,
    paddingBottom: space.xs,
    gap: space.sm + space.xs,
  },
  interestChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm + space.xs,
    paddingVertical: space.sm + space.xs,
    paddingHorizontal: space.md - space.xs,
    paddingRight: space.md,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 132,
    maxWidth: 200,
    position: "relative",
    overflow: "visible",
  },
  interestChipTop: {
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  interestChipTextCol: {
    flex: 1,
    minWidth: 0,
  },
  interestChipLabel: {
    fontSize: typography.bodyLarge,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  interestChipScore: {
    marginTop: space.xs,
    fontSize: typography.secondary,
    fontWeight: "700",
    color: "#64748b",
  },
  interestTopBadge: {
    position: "absolute",
    top: -6,
    right: -4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  interestTopBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: space.md + space.sm,
  },
  heroCard: {
    alignItems: "center",
    alignSelf: "stretch",
    borderRadius: radius.card,
    paddingTop: space.lg,
    paddingBottom: space.md,
    paddingHorizontal: space.lg,
    marginBottom: space.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.55)",
    ...Platform.select({
      ios: {
        shadowColor: "#7c3aed",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: { elevation: 4 },
      default: {
        shadowColor: "#6366f1",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
    }),
  },
  heroAvatarRingGrad: {
    marginBottom: space.md - space.xs,
    ...Platform.select({
      ios: {
        shadowColor: "#121212",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
      default: {},
    }),
  },
  heroAvatarInnerClip: {
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  profileAvatarOuter: {
    overflow: "hidden",
    backgroundColor: "#e2e8f0",
  },
  profileAvatarPlaceholder: {
    backgroundColor: "#c7d2fe",
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarPlaceholderText: {
    fontWeight: "800",
    color: "#3730a3",
  },
  headerUsername: {
    alignSelf: "stretch",
    width: "100%",
    fontSize: typography.title + 3,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: space.sm,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  profileLevelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs + space.xs,
    marginBottom: space.xs + space.xs,
    alignSelf: "center",
  },
  profileLevelLine: {
    fontSize: typography.bodyLarge + 1,
    fontWeight: "800",
    textAlign: "center",
  },
  profileXpFraction: {
    fontSize: typography.secondary,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: space.sm + space.xs,
    letterSpacing: 0.15,
  },
  heroXpTrack: {
    alignSelf: "stretch",
    width: "100%",
    height: 24,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: 2,
  },
  heroXpFillClip: {
    height: "100%",
    borderRadius: 999,
    overflow: "hidden",
  },
  heroXpFillGradient: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 999,
  },
  heroXpCaption: {
    marginTop: space.sm,
    fontSize: typography.secondary,
    fontWeight: "600",
    color: "#64748b",
    textAlign: "center",
  },
  sectionTitleGradient: {
    borderRadius: radius.card,
    marginBottom: space.sm + space.xs,
    marginTop: space.sm + space.xs,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.7)",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm + space.xs,
    paddingVertical: space.sm,
    paddingHorizontal: space.sm + space.xs,
  },
  sectionTitleText: {
    fontSize: typography.title,
    fontWeight: "900",
    color: "#1e1b4b",
  },
  missionsDate: {
    fontSize: typography.secondary,
    color: "#64748b",
    marginBottom: space.sm + space.xs,
    marginTop: -space.xs,
  },
  missionCardShell: {
    borderRadius: radius.card,
    marginBottom: space.sm + space.xs,
    paddingVertical: space.sm + space.xs,
    paddingHorizontal: space.sm + space.xs,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
      },
      android: { elevation: 3 },
      default: {},
    }),
  },
  missionCardShellCompletedLight: {
    backgroundColor: "#d1fae5",
    borderWidth: 2,
    borderColor: "#10b981",
  },
  missionCardShellActiveLight: {
    backgroundColor: "#ffffff",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(15, 23, 42, 0.08)",
  },
  missionCardShellJustDone: {
    ...Platform.select({
      ios: {
        shadowColor: "#10b981",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
      },
      android: { elevation: 6 },
      default: {
        shadowColor: "#10b981",
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.35,
        shadowRadius: 12,
      },
    }),
  },
  missionCardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: space.sm + space.xs,
  },
  missionEmojiCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  missionEmojiChar: {
    fontSize: 26,
    lineHeight: 30,
  },
  missionCardMain: {
    flex: 1,
    minWidth: 0,
  },
  missionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.xs,
  },
  missionCardTitle: {
    flex: 1,
    fontSize: typography.bodyLarge,
    fontWeight: "800",
    lineHeight: 22,
  },
  missionProgressFraction: {
    fontSize: typography.body,
    fontWeight: "800",
    fontVariant: ["tabular-nums"],
    marginTop: space.xs + space.xs,
  },
  missionBarTrackCard: {
    height: 12,
    borderRadius: 999,
    marginTop: space.xs + space.xs,
    overflow: "hidden",
    width: "100%",
  },
  missionBarFillCard: {
    height: "100%",
    borderRadius: 999,
  },
  missionRewardLine: {
    fontSize: typography.secondary,
    fontWeight: "600",
    marginTop: space.sm,
  },
  missionsOverallBlock: {
    marginBottom: space.md - space.xs,
    paddingVertical: space.sm + space.xs,
    paddingHorizontal: space.md - space.xs,
    borderRadius: space.sm + space.xs,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  missionsOverallHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: space.sm + space.xs,
  },
  missionsOverallLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.xs,
    flexShrink: 1,
  },
  missionsOverallLabel: {
    fontSize: typography.body,
    fontWeight: "700",
    color: "#0f172a",
  },
  missionsOverallCount: {
    fontSize: typography.body - 1,
    fontWeight: "800",
    color: "#059669",
  },
  missionsOverallTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
    width: "100%",
  },
  missionsOverallFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#10b981",
  },
  muted: {
    color: "#64748b",
    fontSize: typography.body,
    marginBottom: space.md,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    marginBottom: space.md + space.sm,
    paddingVertical: space.xs,
  },
  badgeCellCard: {
    borderRadius: radius.cardSm,
    paddingVertical: space.sm + space.xs,
    paddingHorizontal: space.xs + space.xs,
    alignItems: "center",
    minHeight: 118,
    width: "100%",
  },
  badgeIconRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.xs + space.xs,
  },
  badgeIconText: {
    fontSize: iconSize.md + space.md - space.xs,
    lineHeight: iconSize.md + space.md + space.xs,
  },
  badgeCellName: {
    fontSize: typography.secondary,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 17,
    width: "100%",
  },
  badgeCellRarity: {
    fontSize: typography.secondary - 2,
    fontWeight: "800",
    marginTop: space.xs,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  errorText: {
    color: "#b91c1c",
    textAlign: "center",
    fontSize: typography.bodyLarge,
    lineHeight: typography.bodyLarge + space.sm,
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 13,
  },
  retry: {
    marginTop: 16,
    color: "#2563eb",
    fontWeight: "600",
    fontSize: 16,
  },
});
