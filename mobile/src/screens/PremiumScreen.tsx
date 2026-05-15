import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useMemo } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { PREMIUM_PLANS } from "../constants/premiumPlans";
import { useAuth } from "../contexts/AuthContext";
import { useParentIap } from "../contexts/ParentIapContext";
import { useTheme } from "../contexts/ThemeContext";
import type { ParentStackParamList } from "../navigation/types";
import { space, typography } from "../theme/tokens";

type Props = NativeStackScreenProps<ParentStackParamList, "Premium">;

const BENEFITS: { emoji: string; title: string; body: string }[] = [
  {
    emoji: "📊",
    title: "Analíticas por hijo",
    body: "Tiempo de pantalla, categorías que más explora, progreso y actividad semanal con gráficos.",
  },
  {
    emoji: "🛡️",
    title: "Control parental avanzado",
    body: "Ajustá límite diario de pantalla y nivel de filtro de contenido por menor.",
  },
  {
    emoji: "📈",
    title: "Resumen familiar",
    body: "Visión clara de partidas, misiones y logros para acompañar el aprendizaje.",
  },
  {
    emoji: "⭐",
    title: "Prioridad de novedades",
    body: "Acceso anticipado a funciones pensadas para familias.",
  },
];

function PremiumPlansRow() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { productsLoading, detailsByProductId, storeQueryFailed } = useParentIap();

  return (
    <>
      <View style={styles.plansSectionHeader}>
        <Text style={[styles.sectionHint, styles.sectionHintFlush]}>Planes</Text>
        {productsLoading ? <ActivityIndicator color={colors.primary} size="small" /> : null}
      </View>
      <Text style={styles.plansIntro}>Mensual o anual: elegís después de la prueba.</Text>
      <View style={styles.plansRow}>
        {PREMIUM_PLANS.map((plan) => {
          const detail = detailsByProductId.get(plan.storeProductId);
          const priceLabel = detail?.price ?? plan.priceDisplayLabel;
          return (
            <View
              key={plan.id}
              style={styles.planCard}
              accessibilityLabel={`Plan ${plan.billingPeriodLabel}, ${priceLabel}`}
            >
              <Text style={styles.planPeriod}>{plan.billingPeriodLabel}</Text>
              <Text style={styles.planPrice}>{priceLabel}</Text>
              {__DEV__ ? (
                <Text style={styles.planSku} selectable>
                  {plan.storeProductId}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>
      {storeQueryFailed ? (
        <Text style={styles.priceWarning}>
          No pudimos obtener el precio desde la tienda; mostramos valores orientativos.
        </Text>
      ) : null}
      <Text style={styles.priceNote}>
        {storeQueryFailed
          ? "En la tienda verás el importe exacto al suscribirte."
          : "Los importes corresponden a la moneda y tienda de tu dispositivo."}
      </Text>
    </>
  );
}

export function PremiumScreen(_props: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<ParentStackParamList>>();
  const { parent } = useAuth();
  const { restorePurchases, restoreBusy } = useParentIap();
  const isPremium = parent?.isPremium === true;
  const styles = useMemo(() => createStyles(colors), [colors]);

  const onTrialPress = () => {
    Alert.alert(
      "Prueba gratis 7 días",
      "Estamos terminando la activación de la prueba y el pago seguro en la app. Muy pronto podrás empezar tus 7 días gratis desde aquí.",
      [{ text: "Entendido", style: "default" }],
    );
  };

  const onRestorePress = async () => {
    const r = await restorePurchases();
    Alert.alert(r.ok ? "Listo" : "Restaurar compra", r.message, [{ text: "Entendido" }]);
  };

  if (isPremium) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>✨</Text>
          <Text style={styles.heroTitle}>Ya tenés Premium</Text>
          <Text style={styles.heroSub}>
            Disfrutá de analíticas y controles avanzados con tu cuenta.
          </Text>
        </View>
        <Text style={styles.sectionHint}>Incluido en tu plan</Text>
        <View style={styles.card}>
          {BENEFITS.map((b, i) => (
            <View
              key={b.title}
              style={[styles.benefitRow, i === BENEFITS.length - 1 ? styles.benefitRowLast : null]}
            >
              <Text style={styles.benefitEmoji}>{b.emoji}</Text>
              <View style={styles.benefitText}>
                <Text style={styles.benefitTitle}>{b.title}</Text>
                <Text style={styles.benefitBody}>{b.body}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>✨</Text>
        <Text style={styles.heroTitle}>EduPlay Premium</Text>
        <Text style={styles.heroSub}>
          Más visibilidad y tranquilidad para acompañar el aprendizaje en casa.
        </Text>
      </View>

      <Text style={styles.sectionHint}>Beneficios</Text>
      <View style={styles.card}>
        {BENEFITS.map((b, i) => (
          <View
            key={b.title}
            style={[styles.benefitRow, i === BENEFITS.length - 1 ? styles.benefitRowLast : null]}
          >
            <Text style={styles.benefitEmoji}>{b.emoji}</Text>
            <View style={styles.benefitText}>
              <Text style={styles.benefitTitle}>{b.title}</Text>
              <Text style={styles.benefitBody}>{b.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <PremiumPlansRow />

      <Pressable
        onPress={onTrialPress}
        style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
        accessibilityRole="button"
        accessibilityLabel="Probar gratis 7 días"
      >
        <Text style={styles.ctaText}>Probar gratis 7 días</Text>
      </Pressable>
      <Text style={styles.legalHint}>
        Sin cargo durante el período de prueba. Después se aplica el plan mensual o anual que elijas
        al suscribirte.
      </Text>

      {Platform.OS !== "web" ? (
        <Pressable
          onPress={() => void onRestorePress()}
          disabled={restoreBusy}
          style={({ pressed }) => [
            styles.restoreCta,
            restoreBusy && styles.restoreCtaDisabled,
            pressed && !restoreBusy && styles.restoreCtaPressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Restaurar compra"
        >
          {restoreBusy ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.restoreCtaText}>Restaurar compra</Text>
          )}
        </Pressable>
      ) : null}

      <View style={styles.legalFooter}>
        <Pressable
          onPress={() => navigation.navigate("LegalDocument", { kind: "privacy" })}
          accessibilityRole="button"
          accessibilityLabel="Política de privacidad"
        >
          <Text style={styles.legalLink}>Privacidad</Text>
        </Pressable>
        <Text style={styles.legalDot}>·</Text>
        <Pressable
          onPress={() => navigation.navigate("LegalDocument", { kind: "terms" })}
          accessibilityRole="button"
          accessibilityLabel="Términos del servicio"
        >
          <Text style={styles.legalLink}>Términos</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

function createStyles(c: import("../theme/appTheme").AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: space.md, paddingBottom: space.xl + space.lg },
    hero: {
      alignItems: "center",
      marginBottom: space.lg,
      paddingVertical: space.md,
    },
    heroEmoji: { fontSize: 40, marginBottom: space.sm },
    heroTitle: {
      fontSize: typography.title + 6,
      fontWeight: "900",
      color: c.text,
      textAlign: "center",
    },
    heroSub: {
      marginTop: space.sm,
      fontSize: typography.bodyLarge,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: space.sm,
    },
    plansSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      gap: space.sm,
      marginBottom: space.xs,
    },
    plansIntro: {
      fontSize: typography.body,
      color: c.textMuted,
      marginBottom: space.sm,
      lineHeight: 20,
    },
    sectionHint: {
      fontSize: typography.secondary,
      fontWeight: "800",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: space.sm,
    },
    sectionHintFlush: {
      marginBottom: 0,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: space.md + space.xs,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      padding: space.md,
      marginBottom: space.lg,
    },
    benefitRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      paddingVertical: space.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.borderSubtle,
    },
    benefitRowLast: {
      borderBottomWidth: 0,
    },
    benefitEmoji: { fontSize: 22, marginTop: 2, marginRight: space.md },
    benefitText: { flex: 1, minWidth: 0 },
    benefitTitle: { fontSize: typography.bodyLarge, fontWeight: "800", color: c.text },
    benefitBody: {
      marginTop: space.xs,
      fontSize: typography.body,
      color: c.textMuted,
      lineHeight: 20,
    },
    plansRow: {
      flexDirection: "row",
      gap: space.sm,
      marginBottom: space.sm,
    },
    planCard: {
      flex: 1,
      backgroundColor: c.card,
      borderRadius: space.md,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      padding: space.md,
      minWidth: 0,
    },
    planPeriod: {
      fontSize: typography.secondary,
      fontWeight: "800",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.4,
    },
    planPrice: {
      marginTop: space.sm,
      fontSize: typography.bodyLarge,
      fontWeight: "900",
      color: c.primary,
    },
    planSku: {
      marginTop: space.sm,
      fontSize: 10,
      color: c.textMuted,
      fontFamily: "monospace",
    },
    priceWarning: {
      marginBottom: space.sm,
      fontSize: typography.secondary,
      color: c.warnBannerText,
      textAlign: "center",
      lineHeight: 18,
    },
    priceNote: {
      marginBottom: space.lg,
      fontSize: typography.secondary,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 18,
    },
    cta: {
      backgroundColor: c.primary,
      paddingVertical: space.md + 2,
      paddingHorizontal: space.lg,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
    },
    ctaPressed: { opacity: 0.9 },
    ctaText: { fontSize: typography.bodyLarge, fontWeight: "900", color: "#ffffff" },
    legalHint: {
      marginTop: space.md,
      fontSize: typography.secondary,
      color: c.textMuted,
      textAlign: "center",
      lineHeight: 18,
    },
    restoreCta: {
      marginTop: space.lg,
      paddingVertical: space.md + 2,
      paddingHorizontal: space.lg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: c.primary,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 52,
      backgroundColor: c.ghostBg,
    },
    restoreCtaDisabled: { opacity: 0.5 },
    restoreCtaPressed: { opacity: 0.85 },
    restoreCtaText: {
      fontSize: typography.bodyLarge,
      fontWeight: "800",
      color: c.primary,
    },
    legalFooter: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      alignItems: "center",
      gap: space.sm,
      marginTop: space.md,
      paddingBottom: space.sm,
    },
    legalLink: {
      fontSize: typography.secondary,
      fontWeight: "700",
      color: c.link,
    },
    legalDot: {
      fontSize: typography.secondary,
      color: c.textMuted,
    },
  });
}
