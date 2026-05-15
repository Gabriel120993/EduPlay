import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { loginChild, loginMinorWithCode } from "../services/api";

type LoginMode = "password" | "code";

export function MinorLoginScreen() {
  const { colors } = useTheme();
  const [username, setUsername] = useState("");
  const [secret, setSecret] = useState("");
  const [mode, setMode] = useState<LoginMode>("password");
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!username.trim() || !secret.trim() || busy) return;
    setBusy(true);
    try {
      if (mode === "password") {
        await loginChild(username.trim(), secret);
      } else {
        await loginMinorWithCode(username.trim(), secret);
      }
      Alert.alert("Bienvenido", "Inicio de sesión correcto.");
    } catch {
      Alert.alert("Oops", "No pudimos iniciar sesión.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Entrá a EduPlay</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          ¡Hola! Elegí cómo querés entrar.
        </Text>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setMode("password")}
            style={[
              styles.tab,
              { backgroundColor: mode === "password" ? colors.primary : colors.cardElevated },
            ]}
          >
            <Text style={{ color: mode === "password" ? colors.textOnPrimary : colors.text }}>
              Contraseña
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode("code")}
            style={[
              styles.tab,
              { backgroundColor: mode === "code" ? colors.primary : colors.cardElevated },
            ]}
          >
            <Text style={{ color: mode === "code" ? colors.textOnPrimary : colors.text }}>
              Código
            </Text>
          </Pressable>
        </View>

        <TextInput
          style={[styles.input, { borderColor: colors.inputBorder, color: colors.inputText }]}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="Tu usuario"
          placeholderTextColor={colors.placeholder}
        />
        <TextInput
          style={[styles.input, { borderColor: colors.inputBorder, color: colors.inputText }]}
          value={secret}
          onChangeText={setSecret}
          secureTextEntry={mode === "password"}
          keyboardType={mode === "code" ? "number-pad" : "default"}
          placeholder={mode === "password" ? "Tu contraseña" : "Código de acceso"}
          placeholderTextColor={colors.placeholder}
        />

        <Pressable onPress={onSubmit} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.btnText, { color: colors.textOnPrimary }]}>
            {busy ? "Entrando..." : "Entrar"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", padding: 16 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16, gap: 10 },
  title: { fontSize: 26, fontWeight: "800", textAlign: "center" },
  subtitle: { fontSize: 14, textAlign: "center", marginBottom: 6 },
  tabRow: { flexDirection: "row", gap: 8 },
  tab: { flex: 1, borderRadius: 999, paddingVertical: 8, alignItems: "center" },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  btn: { marginTop: 4, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  btnText: { fontSize: 16, fontWeight: "700" },
});
