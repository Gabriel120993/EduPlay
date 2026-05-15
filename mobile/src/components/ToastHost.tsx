import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { pingNotificationBell } from "../lib/notificationBellBus";
import { setToastListener, type ToastVariant, type ToastVisual } from "../lib/toastBus";
import { playError, playReward, playSuccess } from "../services/soundManager";

const SHOW_MS = {
  success: 2600,
  error: 4000,
  achievement: 3600,
  chat: 3200,
  parentAlert: 4200,
} as const;
const TAB_BAR_EXTRA = 52;

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const [message, setMessage] = useState("");
  const [variant, setVariant] = useState<ToastVariant>("success");
  const [visual, setVisual] = useState<ToastVisual>("default");
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const iconLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  const hide = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    animRef.current?.stop();
    iconLoopRef.current?.stop();
    animRef.current = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 14,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.96,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);
    animRef.current.start(({ finished }) => {
      if (finished) setVisible(false);
    });
  }, [opacity, scale, translateY]);

  const show = useCallback(
    (msg: string, v: ToastVariant, vis: ToastVisual) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      animRef.current?.stop();
      iconLoopRef.current?.stop();

      setMessage(msg);
      setVariant(v);
      setVisual(vis);
      setVisible(true);

      if (vis === "achievement") {
        pingNotificationBell({ silent: true });
        playReward();
      } else if (vis === "chat" || vis === "parentAlert") {
        // Sonido: los bridges llaman a `playNotification` según preferencias.
      } else if (v === "success") {
        playSuccess();
      } else {
        playError();
      }

      opacity.setValue(0);
      translateY.setValue(22);
      scale.setValue(vis === "achievement" ? 0.88 : 0.94);
      iconRotate.setValue(0);
      shakeX.setValue(0);

      animRef.current = Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          friction: 7,
          tension: 80,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 240,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 90,
          useNativeDriver: true,
        }),
      ]);
      animRef.current.start();

      if (vis === "achievement") {
        iconLoopRef.current = Animated.loop(
          Animated.sequence([
            Animated.timing(iconRotate, {
              toValue: 1,
              duration: 700,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(iconRotate, {
              toValue: 0,
              duration: 700,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
          ]),
        );
        iconLoopRef.current.start();
      } else if (v === "error") {
        Animated.sequence([
          Animated.timing(shakeX, { toValue: 7, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -7, duration: 45, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 5, duration: 40, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true }),
        ]).start();
      }

      const duration =
        vis === "achievement"
          ? SHOW_MS.achievement
          : vis === "chat"
            ? SHOW_MS.chat
            : vis === "parentAlert"
              ? SHOW_MS.parentAlert
              : SHOW_MS[v];
      hideTimer.current = setTimeout(() => {
        hideTimer.current = null;
        hide();
      }, duration);
    },
    [hide, iconRotate, opacity, scale, shakeX, translateY],
  );

  const showRef = useRef(show);
  showRef.current = show;

  useEffect(() => {
    setToastListener((msg, v, vis) => {
      showRef.current(msg, v, vis);
    });
    return () => {
      setToastListener(null);
      if (hideTimer.current) clearTimeout(hideTimer.current);
      iconLoopRef.current?.stop();
    };
  }, []);

  const bottom = insets.bottom + TAB_BAR_EXTRA;
  const isAchievement = visual === "achievement";
  const isChat = visual === "chat";
  const isParentAlert = visual === "parentAlert";
  const spin = iconRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["-8deg", "8deg"],
  });

  return (
    <View style={styles.host} pointerEvents="box-none">
      {visible ? (
        <Animated.View
          style={[
            styles.toast,
            variant === "success" ? styles.toastSuccess : styles.toastError,
            isAchievement && styles.toastAchievement,
            isChat && styles.toastChat,
            isParentAlert && styles.toastParentAlert,
            {
              bottom,
              opacity,
              transform: [{ translateY }, { scale }, { translateX: shakeX }],
            },
          ]}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
        >
          {isAchievement ? (
            <View style={styles.row}>
              <Animated.Text
                style={[styles.trophy, { transform: [{ rotate: spin }] }]}
                allowFontScaling={false}
              >
                🏆
              </Animated.Text>
              <Text style={[styles.text, styles.textMultiline, styles.textAchievement]}>
                {message}
              </Text>
            </View>
          ) : isChat ? (
            <View style={styles.row}>
              <Text style={styles.trophy} allowFontScaling={false}>
                💬
              </Text>
              <Text style={[styles.text, styles.textMultiline, styles.textChat]}>{message}</Text>
            </View>
          ) : isParentAlert ? (
            <View style={styles.row}>
              <Text style={styles.trophy} allowFontScaling={false}>
                ⚠️
              </Text>
              <Text style={[styles.text, styles.textMultiline, styles.textParentAlert]}>
                {message}
              </Text>
            </View>
          ) : (
            <Text style={styles.text}>{message}</Text>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10001,
    pointerEvents: "box-none",
  },
  toast: {
    position: "absolute",
    alignSelf: "center",
    maxWidth: "92%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: "#121212",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  toastSuccess: {
    backgroundColor: "#ecfdf5",
    borderWidth: 1,
    borderColor: "#a7f3d0",
  },
  toastError: {
    backgroundColor: "#fef2f2",
    borderWidth: 1,
    borderColor: "#fecaca",
  },
  toastAchievement: {
    backgroundColor: "#fffbeb",
    borderWidth: 1.5,
    borderColor: "#fcd34d",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  trophy: {
    fontSize: 28,
    lineHeight: 32,
  },
  text: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0f172a",
    textAlign: "center",
  },
  textMultiline: {
    textAlign: "left",
    flex: 1,
    flexShrink: 1,
  },
  textAchievement: {
    fontWeight: "700",
    lineHeight: 22,
  },
  toastChat: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#93c5fd",
  },
  toastParentAlert: {
    backgroundColor: "#fffbeb",
    borderWidth: 1,
    borderColor: "#fbbf24",
  },
  textChat: {
    fontWeight: "700",
    lineHeight: 22,
  },
  textParentAlert: {
    fontWeight: "700",
    lineHeight: 22,
  },
});
