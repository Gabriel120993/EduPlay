import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BrandLogo } from "../../components/BrandLogo";
import { useAuth } from "../../contexts/AuthContext";
import { useTheme } from "../../contexts/ThemeContext";
import { formatApiError } from "../../lib/apiErrors";
import { showToast } from "../../lib/toastBus";
import type { ParentOnboardingOnlyParamList } from "../../navigation/types";
import { getParentMinors, postParentOnboardingComplete } from "../../services/api";
import { playClick, playWhoosh } from "../../services/soundManager";
import { screenEdge, space, typography } from "../../theme/tokens";

type Step = 0 | 1 | 2;

const FEATURES: { emoji: string; text: string }[] = [
  { emoji: "🎮", text: "Juegos educativos divertidos" },
  { emoji: "🏆", text: "Gana logros y sube de nivel" },
  { emoji: "👨‍👩‍👧", text: "Controlá el progreso de tu hijo" },
  { emoji: "🧠", text: "Aprende jugando cada día" },
];

export function ParentOnboardingFlow() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { parent, parentUserId, logout } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<ParentOnboardingOnlyParamList>>();
  const [step, setStep] = useState<Step>(0);
  const [minorCount, setMinorCount] = useState(0);
  const [loadingMinors, setLoadingMinors] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refreshMinors = useCallback(async () => {
    if (!parent?.id) return;
    setLoadingMinors(true);
    try {
      const list = await getParentMinors(parent.id);
      setMinorCount(list.length);
    } catch {
      setMinorCount(0);
    } finally {
      setLoadingMinors(false);
    }
  }, [parent?.id]);

  useFocusEffect(
    useCallback(() => {
      void refreshMinors();
    }, [refreshMinors]),
  );

  const goAddMinor = () => {
    playWhoosh();
    navigation.navigate("AddMinor");
  };

  const goDashboard = async () => {
    if (!parentUserId) {
      showToast("No se encontró el perfil de tutor. Volvé a iniciar sesión.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await postParentOnboardingComplete(parentUserId);
      playWhoosh();
      navigation.navigate("ParentOnboardingComplete");
    } catch (e) {
      showToast(formatApiError(e, "No se pudo completar la configuración."), "error");
    } finally {
      setSubmitting(false);
    }
  };

  const hasMinors = minorCount > 0;

  return (
    <View
      style={[
        styles.root,
        {
          paddingTop: insets.top + space.sm,
          paddingBottom: insets.bottom + space.md,
          backgroundColor: colors.background,
        },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View
          style={styles.onboardingHeader}
          accessibilityRole="image"
          accessibilityLabel="Logo de EduPlay"
        >
          <BrandLogo width={120} height={120} />
        </View>

        {step === 0 ? (
          <View style={styles.block}>
            <Text style={[styles.title, { color: colors.text }]}>¡Bienvenido a EduPlay!</Text>
            <Text style={[styles.subtitle, { color: colors.primary }]}>
              Configuremos todo para que tu hijo aprenda jugando
            </Text>
            <View style={styles.featureList}>
              {FEATURES.map((f) => (
                <View key={f.text} style={[styles.featureRow, { borderColor: colors.border }]}>
                  <Text style={styles.featureEmoji} accessibilityElementsHidden>
                    {f.emoji}
                  </Text>
                  <Text style={[styles.featureText, { color: colors.text }]}>{f.text}</Text>
                </View>
              ))}
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary },
                pressed && styles.pressed,
              ]}
              onPress={() => {
                playWhoosh();
                setStep(1);
              }}
              accessibilityRole="button"
              accessibilityLabel="Comenzar configuración"
            >
              <Text style={styles.primaryBtnText}>Comenzar configuración →</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.logoutLink, pressed && styles.pressed]}
              onPress={() => void logout()}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Text style={[styles.logoutLinkText, { color: colors.link }]}>Cerrar sesión</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.block}>
            <Text style={[styles.title, { color: colors.text }]}>Agregá a tu hijo</Text>
            <Text style={[styles.lead, { color: colors.textMuted }]}>
              Creá un perfil para que empiece a aprender
            </Text>
            <Pressable
              style={({ pressed }) => [
                styles.addBigBtn,
                { borderColor: colors.primary, backgroundColor: colors.card },
                pressed && styles.pressed,
              ]}
              onPress={goAddMinor}
              accessibilityRole="button"
              accessibilityLabel="Agregar perfil de hijo"
            >
              <Text style={[styles.addBigBtnText, { color: colors.primary }]}>
                + Agregar perfil de hijo
              </Text>
            </Pressable>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Podés agregar más hijos después desde el dashboard
            </Text>
            {loadingMinors ? (
              <View style={styles.loaderRow}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary },
                (!hasMinors || loadingMinors) && styles.btnDisabled,
                pressed && styles.pressed,
              ]}
              onPress={() => {
                if (!hasMinors || loadingMinors) return;
                playWhoosh();
                setStep(2);
              }}
              disabled={!hasMinors || loadingMinors}
              accessibilityRole="button"
              accessibilityLabel="Ya agregué a mi hijo"
              accessibilityState={{ disabled: !hasMinors || loadingMinors }}
            >
              <Text style={styles.primaryBtnText}>Ya agregué a mi hijo →</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
              onPress={() => {
                playClick();
                setStep(0);
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.ghostBtnText, { color: colors.link }]}>Atrás</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.logoutLink, pressed && styles.pressed]}
              onPress={() => void logout()}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Text style={[styles.logoutLinkText, { color: colors.link }]}>Cerrar sesión</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.block}>
            <Text style={[styles.title, { color: colors.text }]}>¡Todo configurado!</Text>
            <View style={styles.checkList}>
              <Text style={[styles.checkItem, { color: colors.text }]}>
                ✅ Perfil de padre creado
              </Text>
              <Text style={[styles.checkItem, { color: colors.text }]}>
                ✅ Perfil de hijo agregado
              </Text>
              <Text style={[styles.checkItem, { color: colors.text }]}>✅ Listo para empezar</Text>
            </View>
            <Pressable
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary },
                submitting && styles.btnDisabled,
                pressed && styles.pressed,
              ]}
              onPress={() => void goDashboard()}
              disabled={submitting}
              accessibilityRole="button"
              accessibilityLabel="Ir al dashboard"
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Ir al Dashboard 🚀</Text>
              )}
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
              onPress={() => {
                playClick();
                setStep(1);
              }}
              accessibilityRole="button"
            >
              <Text style={[styles.ghostBtnText, { color: colors.link }]}>Atrás</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.logoutLink, pressed && styles.pressed]}
              onPress={() => void logout()}
              accessibilityRole="button"
              accessibilityLabel="Cerrar sesión"
            >
              <Text style={[styles.logoutLinkText, { color: colors.link }]}>Cerrar sesión</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: screenEdge.horizontal + space.xs,
    justifyContent: "center",
  },
  onboardingHeader: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.lg,
  },
  block: {
    maxWidth: 440,
    alignSelf: "center",
    width: "100%",
  },
  title: {
    fontSize: typography.title,
    fontWeight: "800",
    marginBottom: space.xs,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: typography.bodyLarge,
    fontWeight: "700",
    marginBottom: space.md,
    lineHeight: typography.bodyLarge + space.sm,
  },
  lead: {
    fontSize: typography.bodyLarge,
    lineHeight: typography.bodyLarge + space.sm,
    marginBottom: space.md,
  },
  featureList: {
    gap: space.sm,
    marginBottom: space.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm + space.xs,
    paddingHorizontal: space.md,
    borderRadius: space.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  featureEmoji: {
    fontSize: 22,
  },
  featureText: {
    flex: 1,
    fontSize: typography.bodyLarge,
    fontWeight: "600",
  },
  checkList: {
    gap: space.sm,
    marginBottom: space.lg,
  },
  checkItem: {
    fontSize: typography.bodyLarge,
    fontWeight: "600",
    lineHeight: typography.bodyLarge + space.sm,
  },
  addBigBtn: {
    borderWidth: 2,
    borderRadius: space.md,
    paddingVertical: space.md + space.xs,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: space.md,
    minHeight: space.md * 3,
  },
  addBigBtnText: {
    fontSize: typography.bodyLarge,
    fontWeight: "800",
  },
  hint: {
    fontSize: typography.body,
    textAlign: "center",
    marginBottom: space.md,
  },
  loaderRow: {
    alignItems: "center",
    marginBottom: space.sm,
  },
  primaryBtn: {
    borderRadius: space.sm + space.xs,
    paddingVertical: space.md - space.xs,
    alignItems: "center",
    minHeight: space.md * 2 + space.sm + space.xs,
    justifyContent: "center",
    marginTop: space.sm,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: typography.bodyLarge,
    fontWeight: "800",
  },
  ghostBtn: {
    paddingVertical: space.md - space.xs,
    paddingHorizontal: space.sm,
    alignItems: "center",
    marginTop: space.sm,
  },
  ghostBtnText: {
    fontSize: typography.bodyLarge,
    fontWeight: "700",
  },
  logoutLink: {
    marginTop: space.md,
    paddingVertical: space.sm,
    alignItems: "center",
  },
  logoutLinkText: {
    fontSize: typography.body,
    fontWeight: "600",
  },
  btnDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
  },
});
