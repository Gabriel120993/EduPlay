import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useTheme } from "../contexts/ThemeContext";

type Props = {
  age?: number;
  pendingApprovals?: number;
};

export function MinorHomeScreen({ age = 9, pendingApprovals = 0 }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const ageBucket = useMemo(() => {
    if (age <= 7) return "kids";
    if (age <= 10) return "junior";
    return "teen";
  }, [age]);

  const recommended = useMemo(() => {
    if (ageBucket === "kids") return ["Cuentos cortos", "Números básicos", "Juegos de colores"];
    if (ageBucket === "junior") return ["Ciencia divertida", "Matemáticas", "Lectura guiada"];
    return ["Proyectos STEM", "Historia interactiva", "Desafíos de lógica"];
  }, [ageBucket]);

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text
        style={[styles.title, { color: colors.text }]}
        allowFontScaling
        maxFontSizeMultiplier={1.5}
      >
        {t("home.title")}
      </Text>
      <Text style={{ color: colors.textMuted }} allowFontScaling maxFontSizeMultiplier={1.5}>
        {t("home.ageSubtitle", { age })}
      </Text>

      {pendingApprovals > 0 ? (
        <View
          style={[
            styles.banner,
            { backgroundColor: colors.warnBannerBg, borderColor: colors.warnBannerBorder },
          ]}
          accessibilityRole="alert"
        >
          <Text style={{ color: colors.warnBannerText, fontWeight: "700" }} allowFontScaling>
            {t("home.pendingBanner", { count: pendingApprovals })}
          </Text>
        </View>
      ) : null}

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.cardTitle, { color: colors.text }]} allowFontScaling>
          {t("home.recommendedTitle")}
        </Text>
        {recommended.map((item) => (
          <Text key={item} style={{ color: colors.textBody }}>
            • {item}
          </Text>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
  banner: { borderWidth: 1, borderRadius: 12, padding: 10 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 8 },
  cardTitle: { fontSize: 18, fontWeight: "700" },
});
