import { Pressable, Text, View } from "react-native";

import { AppIcon } from "./AppIcon";
import { useTheme } from "../contexts/ThemeContext";
import type { LastContentOpened, LastGamePlayed } from "../lib/continueLearningStorage";
import { useExploreStyles } from "../screens/exploreScreenStyles";

export type ContinueLearningApiItem = {
  id: string;
  title: string;
  description?: string;
  badge?: string;
  progress?: { percentage: number; completed: boolean; lastSeenAt?: string | null } | null;
};

type Props = {
  game: LastGamePlayed | null;
  content: LastContentOpened | null;
  apiItem?: ContinueLearningApiItem | null;
  onContinue: () => void;
  /** Modo solo lectura: botón atenuado; el padre debe mostrar aviso al tocar. */
  readOnly: boolean;
};

export function ContinueLearningSection({ game, content, apiItem, onContinue, readOnly }: Props) {
  const styles = useExploreStyles();
  const { colors } = useTheme();
  if (!game && !content && !apiItem) return null;

  return (
    <View style={styles.continueSection} accessibilityRole="summary">
      <Text style={styles.continueSectionTitle}>🧠 Continuar aprendiendo</Text>
      <Text style={styles.continueSectionHint}>Retoma donde lo dejaste</Text>

      {apiItem ? (
        <View style={styles.continueInfoRow}>
          <View style={styles.continueCardIconWrap}>
            <AppIcon name="school-outline" color={colors.primary} size="md" />
          </View>
          <View style={styles.continueCardTextCol}>
            <Text style={styles.continueRowLabel}>{apiItem.badge ?? "Último contenido"}</Text>
            <Text style={styles.continueRowValue} numberOfLines={2}>
              {apiItem.title}
            </Text>
            {apiItem.progress ? (
              <Text style={styles.continueRowLabel}>{apiItem.progress.percentage}% completado</Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {!apiItem && game ? (
        <View style={styles.continueInfoRow}>
          <View style={styles.continueCardIconWrap}>
            <AppIcon name="game-controller-outline" color={colors.primary} size="md" />
          </View>
          <View style={styles.continueCardTextCol}>
            <Text style={styles.continueRowLabel}>Último juego</Text>
            <Text style={styles.continueRowValue} numberOfLines={2}>
              {game.label}
            </Text>
          </View>
        </View>
      ) : null}

      {!apiItem && content ? (
        <View style={[styles.continueInfoRow, game ? styles.continueInfoRowSecond : undefined]}>
          <View style={styles.continueCardIconWrap}>
            <AppIcon name="book-outline" color={colors.primary} size="md" />
          </View>
          <View style={styles.continueCardTextCol}>
            <Text style={styles.continueRowLabel}>Último contenido</Text>
            <Text style={styles.continueRowValue} numberOfLines={2}>
              {content.title}
            </Text>
          </View>
        </View>
      ) : null}

      <Pressable
        onPress={onContinue}
        style={({ pressed }) => [
          styles.continueMainButton,
          readOnly && styles.continueMainButtonDisabled,
          pressed && !readOnly && styles.continueMainButtonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Continuar"
      >
        <Text style={styles.continueMainButtonText}>Continuar</Text>
      </Pressable>
    </View>
  );
}
