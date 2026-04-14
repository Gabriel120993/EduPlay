import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import {
  PRIVACY_POLICY_META,
  PRIVACY_POLICY_SECTIONS,
  TERMS_OF_SERVICE_META,
  TERMS_OF_SERVICE_SECTIONS,
  type LegalSection,
} from "../content/legalDocuments";
import { useTheme } from "../contexts/ThemeContext";
import type { LegalDocumentKind } from "../navigation/types";
import { space, typography } from "../theme/tokens";

function pickDocument(kind: LegalDocumentKind): {
  meta: { title: string; updated: string };
  sections: LegalSection[];
} {
  if (kind === "terms") {
    return { meta: TERMS_OF_SERVICE_META, sections: TERMS_OF_SERVICE_SECTIONS };
  }
  return { meta: PRIVACY_POLICY_META, sections: PRIVACY_POLICY_SECTIONS };
}

type Props = { route: { params: { kind: LegalDocumentKind } } };

export function LegalDocumentScreen({ route }: Props) {
  const { colors } = useTheme();
  const { kind } = route.params;
  const { meta, sections } = pickDocument(kind);
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.docTitle}>{meta.title}</Text>
      <Text style={styles.updated}>Vigente: {meta.updated}</Text>
      {sections.map((s) => (
        <View key={s.title} style={styles.block}>
          <Text style={styles.sectionTitle}>{s.title}</Text>
          <Text style={styles.sectionBody}>{s.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

function createStyles(c: import("../theme/appTheme").AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background },
    content: { padding: space.md, paddingBottom: space.xl * 2 },
    docTitle: {
      fontSize: typography.title + 4,
      fontWeight: "900",
      color: c.text,
      marginBottom: space.xs,
    },
    updated: {
      fontSize: typography.secondary,
      color: c.textMuted,
      marginBottom: space.lg,
    },
    block: { marginBottom: space.lg },
    sectionTitle: {
      fontSize: typography.bodyLarge,
      fontWeight: "800",
      color: c.text,
      marginBottom: space.sm,
    },
    sectionBody: {
      fontSize: typography.body,
      color: c.textMuted,
      lineHeight: 22,
    },
  });
}
