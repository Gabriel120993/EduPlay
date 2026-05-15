import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../contexts/ThemeContext";
import { useScreenTime } from "../contexts/ScreenTimeContext";
import { radius, space, typography } from "../theme/tokens";

const FILL_MIN_WIDTH_PX = 2;

function formatUsedLabel(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.max(0, seconds % 60);
  if (m === 0) return `${s} s`;
  if (s === 0) return `${m} min`;
  return `${m} min ${s} s`;
}

function remainingMinutesLabel(remainingSeconds: number): string {
  if (remainingSeconds <= 0) return "Sin tiempo restante hoy";
  const m = Math.ceil(remainingSeconds / 60);
  return m === 1 ? "Te queda ~1 min hoy" : `Te quedan ~${m} min hoy`;
}

/** Barra compacta de uso diario (sesión menor con tracking activo). */
export function TimeUsageBar() {
  const { colors } = useTheme();
  const { enabled, isUnlimited, metrics, readOnlyMode } = useScreenTime();

  if (!enabled || !metrics) return null;

  const used = metrics.usedTodaySeconds;
  const limitMin = metrics.dailyLimitMinutes;
  const limitSec = Math.max(1, limitMin * 60);
  const ratio = isUnlimited ? 0 : Math.min(1, used / limitSec);
  const fillColor = readOnlyMode ? colors.error : colors.primary;
  const fillMinW = used > 0 && ratio < 0.04 ? FILL_MIN_WIDTH_PX : 0;

  const a11y = isUnlimited
    ? `Tiempo de pantalla hoy: ${formatUsedLabel(used)}, sin límite diario`
    : `Tiempo de pantalla hoy: ${formatUsedLabel(used)} de ${limitMin} minutos. ${remainingMinutesLabel(metrics.remainingSeconds)}`;

  return (
    <View
      style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.borderSubtle }]}
      accessibilityRole="summary"
      accessibilityLabel={a11y}
    >
      <View style={styles.row}>
        <Text style={[styles.title, { color: colors.text }]}>Tiempo de hoy</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {isUnlimited ? (
            <>
              {formatUsedLabel(used)}
              <Text style={{ color: colors.textMuted }}> · sin límite</Text>
            </>
          ) : (
            <>
              {formatUsedLabel(used)}
              <Text style={{ color: colors.textMuted }}> / {limitMin} min</Text>
            </>
          )}
        </Text>
      </View>
      {!isUnlimited ? (
        <>
          <View style={[styles.track, { backgroundColor: colors.ghostBg }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${Math.round(ratio * 100)}%`,
                  minWidth: fillMinW,
                  backgroundColor: fillColor,
                },
              ]}
            />
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]} numberOfLines={1}>
            {readOnlyMode
              ? "Límite alcanzado · modo lectura"
              : remainingMinutesLabel(metrics.remainingSeconds)}
          </Text>
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: space.sm,
    paddingVertical: space.sm + space.xs,
    paddingHorizontal: space.md - space.xs,
    borderRadius: radius.cardSm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.sm,
    marginBottom: space.xs,
  },
  title: {
    fontSize: typography.secondary,
    fontWeight: "800",
  },
  meta: {
    flex: 1,
    fontSize: typography.secondary,
    fontWeight: "600",
    textAlign: "right",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
  hint: {
    marginTop: space.xs,
    fontSize: typography.secondary - 1,
    fontWeight: "600",
  },
});
