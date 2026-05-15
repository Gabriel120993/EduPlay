import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppIcon } from "../../components/AppIcon";
import { BrandLogo } from "../../components/BrandLogo";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CONTENT_CATEGORIES_UI } from "../../lib/contentCategoryUi";
import { showToast } from "../../lib/toastBus";
import { postOnboardingPreferences, type FirstActionChoice } from "../../services/api";
import { playClick, playWhoosh } from "../../services/soundManager";
import { APP_TAGLINE } from "../../constants/brand";
import { iconSize, screenEdge, space, typography } from "../../theme/tokens";

const MIN_INTERESTS = 3;

/** Baraja in-place (Fisher–Yates) y devuelve el mismo array. */
function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = items[i]!;
    items[i] = items[j]!;
    items[j] = t;
  }
  return items;
}

const ACTION_OPTIONS: { id: FirstActionChoice; title: string; subtitle: string }[] = [
  {
    id: "PLAY_GAME",
    title: "Jugar un juego",
    subtitle: "Empezá con juegos educativos y sumá puntos.",
  },
  {
    id: "FOLLOW_USERS",
    title: "Seguir usuarios",
    subtitle: "Conectá con amigos y descubrí más contenido.",
  },
];

type Step = 0 | 1 | 2;

type Props = {
  userId: string;
  onComplete: () => void;
};

export function OnboardingFlow({ userId, onComplete }: Props) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>(0);
  const [interests, setInterests] = useState<Set<string>>(() => new Set());
  const [firstAction, setFirstAction] = useState<FirstActionChoice | null>(null);
  const [saving, setSaving] = useState(false);

  const toggleInterest = useCallback((id: string) => {
    setInterests((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAllInterests = useCallback(() => {
    setInterests(new Set(CONTENT_CATEGORIES_UI.map((c) => c.id)));
  }, []);

  const surpriseRandomInterests = useCallback(() => {
    const ids = CONTENT_CATEGORIES_UI.map((c) => c.id);
    shuffleInPlace(ids);
    const count =
      MIN_INTERESTS +
      Math.floor(Math.random() * (CONTENT_CATEGORIES_UI.length - MIN_INTERESTS + 1));
    setInterests(new Set(ids.slice(0, count)));
  }, []);

  const save = useCallback(async () => {
    if (interests.size < MIN_INTERESTS || !firstAction) return;
    setSaving(true);
    try {
      await postOnboardingPreferences(userId, {
        interests: Array.from(interests),
        firstAction,
      });
      showToast("Preferencias guardadas", "success");
      onComplete();
    } catch {
      showToast("No se pudieron guardar las preferencias. Intentalo de nuevo.", "error");
    } finally {
      setSaving(false);
    }
  }, [userId, interests, firstAction, onComplete]);

  const canNextFromInterests = interests.size >= MIN_INTERESTS;
  const canFinish = canNextFromInterests && firstAction !== null;

  return (
    <View
      style={[
        styles.root,
        { paddingTop: insets.top + space.sm, paddingBottom: insets.bottom + space.md },
      ]}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View
          style={styles.onboardingHeader}
          accessibilityRole="image"
          accessibilityLabel="Logo de EduPlay"
        >
          <BrandLogo width={144} height={144} />
        </View>
        {step === 0 ? (
          <View style={styles.block}>
            <Text style={styles.title}>Bienvenido a EduPlay</Text>
            <Text style={styles.tagline}>{APP_TAGLINE}</Text>
            <Text style={styles.lead}>
              En unos pasos vamos a personalizar tu experiencia: intereses y qué te gustaría hacer
              primero.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={() => {
                playWhoosh();
                setStep(1);
              }}
              accessibilityRole="button"
              accessibilityLabel="Continuar"
            >
              <Text style={styles.primaryBtnText}>Continuar</Text>
            </Pressable>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={styles.block}>
            <Text style={styles.stepLabel}>Paso 1 de 2</Text>
            <Text style={styles.title}>¿Qué te gustaría aprender?</Text>
            <Text style={styles.lead}>Elegí tus intereses para personalizar tu experiencia</Text>
            <Text
              style={[styles.interestHint, canNextFromInterests && styles.interestHintOk]}
              accessibilityLiveRegion="polite"
            >
              {canNextFromInterests
                ? `Listo: ${interests.size} categorías seleccionadas`
                : `Seleccioná al menos ${MIN_INTERESTS} categorías (${interests.size}/${MIN_INTERESTS})`}
            </Text>
            <View style={styles.quickActionsRow}>
              <Pressable
                onPress={selectAllInterests}
                style={({ pressed }) => [
                  styles.quickActionBtn,
                  styles.quickActionBtnOutline,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Seleccionar todas las categorías"
              >
                <Text style={styles.quickActionBtnTextOutline}>Seleccionar todas</Text>
              </Pressable>
              <Pressable
                onPress={surpriseRandomInterests}
                style={({ pressed }) => [
                  styles.quickActionBtn,
                  styles.quickActionBtnSurprise,
                  pressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel="Sorpréndeme: elegir categorías al azar"
              >
                <View style={styles.quickActionSurpriseInner}>
                  <AppIcon name="dice-outline" color="#5b21b6" size="sm" />
                  <Text style={styles.quickActionBtnTextSurprise}>Sorpréndeme</Text>
                </View>
              </Pressable>
            </View>
            <View style={styles.interestGrid}>
              {CONTENT_CATEGORIES_UI.map((cat) => {
                const on = interests.has(cat.id);
                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => toggleInterest(cat.id)}
                    style={({ pressed }) => [
                      styles.interestCard,
                      {
                        borderColor: on ? cat.highlight : "#e2e8f0",
                        borderLeftWidth: on ? 4 : StyleSheet.hairlineWidth,
                        borderLeftColor: on ? cat.highlight : "#e2e8f0",
                        backgroundColor: on ? cat.softBg : "#fff",
                      },
                      on && styles.interestCardSelected,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={`${cat.label}${on ? ", seleccionado" : ""}`}
                  >
                    {on ? (
                      <View style={[styles.interestCheck, { backgroundColor: cat.accent }]}>
                        <AppIcon name="checkmark" color="#ffffff" size="sm" />
                      </View>
                    ) : null}
                    <View style={styles.interestCardIconWrap} accessibilityElementsHidden>
                      <AppIcon name={cat.icon} color={on ? cat.accent : "#475569"} size="lg" />
                    </View>
                    <Text
                      style={[styles.interestCardLabel, on && { color: cat.accent }]}
                      numberOfLines={2}
                    >
                      {cat.emoji} {cat.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.rowBtns}>
              <Pressable
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                onPress={() => {
                  playClick();
                  setStep(0);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.ghostBtnText}>Atrás</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  styles.primaryBtnInline,
                  !canNextFromInterests && styles.btnDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  if (!canNextFromInterests) return;
                  playWhoosh();
                  setStep(2);
                }}
                disabled={!canNextFromInterests}
                accessibilityRole="button"
                accessibilityState={{ disabled: !canNextFromInterests }}
              >
                <Text style={styles.primaryBtnText}>Siguiente</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.block}>
            <Text style={styles.stepLabel}>Paso 2 de 2</Text>
            <Text style={styles.title}>Tu primera acción</Text>
            <Text style={styles.lead}>Elegí con qué querés arrancar.</Text>
            {ACTION_OPTIONS.map((opt) => {
              const on = firstAction === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => setFirstAction(opt.id)}
                  style={({ pressed }) => [
                    styles.actionCard,
                    on && styles.actionCardOn,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <Text style={[styles.actionTitle, on && styles.actionTitleOn]}>{opt.title}</Text>
                  <Text style={styles.actionSub}>{opt.subtitle}</Text>
                </Pressable>
              );
            })}
            <View style={styles.rowBtns}>
              <Pressable
                style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
                onPress={() => {
                  playClick();
                  setStep(1);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.ghostBtnText}>Atrás</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [
                  styles.primaryBtn,
                  styles.primaryBtnInline,
                  (!canFinish || saving) && styles.btnDisabled,
                  pressed && styles.pressed,
                ]}
                onPress={() => {
                  playWhoosh();
                  void save();
                }}
                disabled={!canFinish || saving}
                accessibilityRole="button"
                accessibilityLabel="Guardar preferencias"
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>Guardar preferencias</Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#f0f9ff",
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
  heroIconWrap: {
    alignItems: "center",
    marginBottom: space.sm + space.xs,
  },
  stepLabel: {
    fontSize: typography.body - 1,
    fontWeight: "700",
    color: "#0369a1",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: space.sm,
  },
  title: {
    fontSize: typography.title,
    fontWeight: "800",
    color: "#0c4a6e",
    marginBottom: space.xs,
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: typography.bodyLarge,
    fontWeight: "700",
    color: "#0284c7",
    textAlign: "center",
    marginBottom: space.sm + space.xs,
  },
  lead: {
    fontSize: typography.bodyLarge,
    lineHeight: typography.bodyLarge + space.sm,
    color: "#475569",
    marginBottom: space.sm,
  },
  interestHint: {
    fontSize: typography.body,
    fontWeight: "700",
    color: "#b45309",
    marginBottom: space.md,
  },
  interestHintOk: {
    color: "#047857",
  },
  quickActionsRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: space.sm + space.xs,
    marginBottom: space.md,
  },
  quickActionBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: space.md * 2 + space.sm + space.xs,
    paddingVertical: space.sm + space.xs,
    paddingHorizontal: space.sm + space.xs,
    borderRadius: space.md - space.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionBtnOutline: {
    borderWidth: 2,
    borderColor: "#0284c7",
    backgroundColor: "#fff",
  },
  quickActionBtnTextOutline: {
    fontSize: typography.body,
    fontWeight: "800",
    color: "#0369a1",
    textAlign: "center",
  },
  quickActionBtnSurprise: {
    borderWidth: 2,
    borderColor: "#7c3aed",
    backgroundColor: "#f5f3ff",
  },
  quickActionSurpriseInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: space.xs,
  },
  quickActionBtnTextSurprise: {
    fontSize: typography.body,
    fontWeight: "800",
    color: "#5b21b6",
    textAlign: "center",
  },
  interestGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: space.sm,
    marginBottom: space.lg,
  },
  interestCard: {
    width: "48%",
    minHeight: space.md * 7,
    paddingVertical: space.md,
    paddingHorizontal: space.md - space.xs,
    paddingTop: space.md + space.xs,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  interestCardSelected: {
    borderWidth: 2,
  },
  interestCheck: {
    position: "absolute",
    top: space.sm,
    right: space.sm,
    width: iconSize.md + space.xs,
    height: iconSize.md + space.xs,
    borderRadius: (iconSize.md + space.xs) / 2,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.35)",
  },
  interestCardIconWrap: {
    marginBottom: space.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  interestCardLabel: {
    fontSize: typography.bodyLarge,
    fontWeight: "800",
    color: "#475569",
    textAlign: "center",
    letterSpacing: -0.2,
  },
  actionCard: {
    padding: space.md,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    backgroundColor: "#fff",
    marginBottom: space.sm + space.xs,
  },
  actionCardOn: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },
  actionTitle: {
    fontSize: typography.bodyLarge,
    fontWeight: "800",
    color: "#0f172a",
    marginBottom: space.xs,
  },
  actionTitleOn: {
    color: "#1d4ed8",
  },
  actionSub: {
    fontSize: typography.body,
    color: "#64748b",
    lineHeight: typography.body + space.sm,
  },
  rowBtns: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm + space.xs,
    marginTop: space.sm,
  },
  primaryBtn: {
    backgroundColor: "#0284c7",
    borderRadius: space.sm + space.xs,
    paddingVertical: space.md - space.xs,
    alignItems: "center",
    minHeight: space.md * 2 + space.sm + space.xs,
    justifyContent: "center",
  },
  primaryBtnInline: {
    flex: 1,
    minWidth: 0,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: typography.bodyLarge,
    fontWeight: "800",
  },
  ghostBtn: {
    paddingVertical: space.md - space.xs,
    paddingHorizontal: space.sm,
  },
  ghostBtnText: {
    color: "#0369a1",
    fontSize: typography.bodyLarge,
    fontWeight: "700",
  },
  btnDisabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.88,
  },
});
