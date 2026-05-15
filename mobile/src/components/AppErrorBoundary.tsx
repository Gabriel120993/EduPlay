import { Component, type ErrorInfo, type ReactNode } from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";

type Props = { children: ReactNode };

type State = { error: Error | null };

/**
 * Evita pantalla en blanco total en web (y nativo) si hay un error de render fuera de los límites de try/catch.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (__DEV__) {
      console.error("[AppErrorBoundary]", error, info.componentStack);
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      const msg = this.state.error.message || String(this.state.error);
      return (
        <View style={styles.box} testID="app-error-boundary">
          <Text style={styles.title}>Algo salió mal al cargar la app</Text>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <Text style={styles.mono}>{msg}</Text>
            {Platform.OS === "web" ? (
              <Text style={styles.hint}>
                Abrí las herramientas de desarrollo del navegador (F12) para más detalle.
              </Text>
            ) : null}
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 12,
  },
  scroll: { flexGrow: 0, maxHeight: 320 },
  scrollContent: { paddingBottom: 24 },
  mono: {
    fontSize: 14,
    color: "#334155",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  hint: {
    marginTop: 16,
    fontSize: 14,
    color: "#64748b",
  },
});
