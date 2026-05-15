import { useCallback, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "./AppIcon";
import { useTheme } from "../contexts/ThemeContext";
import { READ_ONLY_TOAST_MSG } from "../contexts/ScreenTimeContext";
import { showToast } from "../lib/toastBus";
import type { ReactionType } from "../services/api";
import type { IoniconName } from "../theme/icons";
import { playReaction } from "../services/soundManager";

const ICON_PX = 18;
const REACTION_SCALE_DURATION_MS = 150;
const REACTION_SCALE_PEAK = 1.2;

function activeColorForType(t: ReactionType): string {
  switch (t) {
    case "LIKE":
      return "#ef4444";
    case "CLAP":
      return "#f97316";
    case "STAR":
      return "#eab308";
    default:
      return "#ef4444";
  }
}

const ACTIONS: {
  type: ReactionType;
  ionOutline: IoniconName;
  ionFilled: IoniconName;
  a11y: string;
}[] = [
  { type: "LIKE", ionOutline: "heart-outline", ionFilled: "heart", a11y: "Like" },
  { type: "CLAP", ionOutline: "hand-left-outline", ionFilled: "hand-left", a11y: "Aplauso" },
  { type: "STAR", ionOutline: "star-outline", ionFilled: "star", a11y: "Estrella" },
];

export type ReactionCounts = { like: number; clap: number; star: number };

function countForType(type: ReactionType, c: ReactionCounts): number {
  switch (type) {
    case "LIKE":
      return c.like;
    case "CLAP":
      return c.clap;
    case "STAR":
      return c.star;
    default:
      return 0;
  }
}

type Props = {
  postId: string;
  counts: ReactionCounts;
  userReaction: ReactionType | null;
  pending: boolean;
  readOnly: boolean;
  onReact: (postId: string, type: ReactionType) => void;
};

export function PostReactionBar({
  postId,
  counts,
  userReaction,
  pending,
  readOnly,
  onReact,
}: Props) {
  const { colors } = useTheme();
  const inactive = colors.reactionIconMuted;
  return (
    <View style={styles.row}>
      {ACTIONS.map((a) => (
        <ReactionSlot
          key={a.type}
          postId={postId}
          type={a.type}
          ionOutline={a.ionOutline}
          ionFilled={a.ionFilled}
          a11y={a.a11y}
          count={countForType(a.type, counts)}
          isActive={userReaction === a.type}
          pending={pending}
          readOnly={readOnly}
          inactiveColor={inactive}
          onReact={onReact}
        />
      ))}
    </View>
  );
}

function ReactionSlot({
  postId,
  type,
  ionOutline,
  ionFilled,
  a11y,
  count,
  isActive,
  pending,
  readOnly,
  inactiveColor,
  onReact,
}: {
  postId: string;
  type: ReactionType;
  ionOutline: IoniconName;
  ionFilled: IoniconName;
  a11y: string;
  count: number;
  isActive: boolean;
  pending: boolean;
  readOnly: boolean;
  inactiveColor: string;
  onReact: (postId: string, type: ReactionType) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const lastPressAtRef = useRef(0);
  const accentColor = isActive ? activeColorForType(type) : inactiveColor;

  const playIconScale = useCallback(() => {
    scale.setValue(1);
    Animated.sequence([
      Animated.timing(scale, {
        toValue: REACTION_SCALE_PEAK,
        duration: REACTION_SCALE_DURATION_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: REACTION_SCALE_DURATION_MS,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale]);

  return (
    <Pressable
      disabled={pending}
      onPress={() => {
        if (pending) return;
        const now = Date.now();
        if (now - lastPressAtRef.current < 380) return;
        lastPressAtRef.current = now;
        if (readOnly) {
          showToast(READ_ONLY_TOAST_MSG, "error");
          return;
        }
        playIconScale();
        playReaction();
        onReact(postId, type);
      }}
      accessibilityLabel={`${a11y}, ${count} reacciones`}
      accessibilityRole="button"
      accessibilityState={{ disabled: pending }}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={styles.slot}
    >
      <Animated.View
        style={[styles.slotInner, { transform: [{ scale }] }, pending && { opacity: 0.55 }]}
      >
        <AppIcon name={isActive ? ionFilled : ionOutline} size={ICON_PX} color={accentColor} />
        <Text style={[styles.count, { color: accentColor }]}>{count}</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    width: "100%",
  },
  slot: {
    flex: 1,
    minWidth: 0,
  },
  slotInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  count: {
    fontSize: 11,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
    minWidth: 14,
  },
});
