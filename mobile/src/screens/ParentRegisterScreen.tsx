import { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { formatApiError } from "../lib/apiErrors";
import { registerParentFull } from "../services/api";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

export function ParentRegisterScreen() {
  const { colors } = useTheme();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [busy, setBusy] = useState(false);

  const valid = useMemo(
    () =>
      EMAIL_RE.test(email.trim()) &&
      STRONG_PASSWORD_RE.test(password) &&
      firstName.trim().length > 0 &&
      lastName.trim().length > 0 &&
      phone.trim().length >= 6 &&
      acceptedTerms,
    [acceptedTerms, email, firstName, lastName, password, phone],
  );

  const onSubmit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const cleanEmail = email.trim();
      await registerParentFull({
        email: cleanEmail,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
      });
      // Iniciar sesión automáticamente tras registro.
      await login(cleanEmail, password, true);
      Alert.alert("Cuenta creada", "Registro completado e inicio de sesión exitoso.");
    } catch (e) {
      Alert.alert("Error", formatApiError(e, "No se pudo completar el registro."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: colors.text }]}>Registro de padre/madre</Text>
      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Completá tus datos para crear la cuenta familiar.
      </Text>

      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.inputBorder,
            color: colors.inputText,
            backgroundColor: colors.card,
          },
        ]}
        value={firstName}
        onChangeText={setFirstName}
        placeholder="Nombre"
        placeholderTextColor={colors.placeholder}
      />
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.inputBorder,
            color: colors.inputText,
            backgroundColor: colors.card,
          },
        ]}
        value={lastName}
        onChangeText={setLastName}
        placeholder="Apellido"
        placeholderTextColor={colors.placeholder}
      />
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.inputBorder,
            color: colors.inputText,
            backgroundColor: colors.card,
          },
        ]}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="Email"
        placeholderTextColor={colors.placeholder}
      />
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.inputBorder,
            color: colors.inputText,
            backgroundColor: colors.card,
          },
        ]}
        value={phone}
        onChangeText={setPhone}
        keyboardType="phone-pad"
        placeholder="Teléfono"
        placeholderTextColor={colors.placeholder}
      />
      <TextInput
        style={[
          styles.input,
          {
            borderColor: colors.inputBorder,
            color: colors.inputText,
            backgroundColor: colors.card,
          },
        ]}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Contraseña fuerte"
        placeholderTextColor={colors.placeholder}
      />

      <View style={styles.termsRow}>
        <Switch value={acceptedTerms} onValueChange={setAcceptedTerms} />
        <Text style={[styles.termsText, { color: colors.textBody }]}>
          Acepto términos y condiciones.
        </Text>
      </View>

      <Pressable
        disabled={!valid || busy}
        onPress={onSubmit}
        style={[styles.btn, { backgroundColor: valid ? colors.primary : colors.border }]}
      >
        <Text style={[styles.btnText, { color: colors.textOnPrimary }]}>
          {busy ? "Registrando..." : "Crear cuenta"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
  subtitle: { fontSize: 14, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  termsRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 4 },
  termsText: { fontSize: 14, flex: 1 },
  btn: { marginTop: 8, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnText: { fontSize: 16, fontWeight: "700" },
});
