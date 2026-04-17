import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { useTheme } from "../contexts/ThemeContext";
import { formatApiError } from "../lib/apiErrors";
import { registerMinor } from "../services/api";

const AVATARS = ["🐼", "🦊", "🦄", "🐸", "🦁", "🐙"];
const INTERESTS = ["science", "math", "reading", "art"];

export function AddMinorScreen() {
  const { colors } = useTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("8");
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(["science"]);
  const [strictMode, setStrictMode] = useState(true);
  const [requireAllApprovals, setRequireAllApprovals] = useState(false);
  const [busy, setBusy] = useState(false);

  const valid = useMemo(() => username.trim().length >= 3 && password.length >= 6, [password, username]);

  const toggleInterest = (value: string) => {
    setSelectedInterests((prev) => (prev.includes(value) ? prev.filter((i) => i !== value) : [...prev, value]));
  };

  const onSubmit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      const data = await registerMinor({
        username: username.trim(),
        password,
        age: Number(age) || 8,
        avatar,
        interests: selectedInterests,
      });
      Alert.alert(
        "Menor creado",
        `Usuario: ${data.minor.username}\nCódigo de acceso: ${data.accessCode}\nRestricciones: ${
          strictMode ? "estrictas" : "flexibles"
        }${requireAllApprovals ? " + aprobación para todo" : ""}`
      );
    } catch (e) {
      Alert.alert("Error", formatApiError(e, "No se pudo crear el perfil del menor."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={[styles.root, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.text }]}>Agregar menor</Text>
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, color: colors.inputText, backgroundColor: colors.card }]}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        placeholder="username único"
        placeholderTextColor={colors.placeholder}
      />
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, color: colors.inputText, backgroundColor: colors.card }]}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="password"
        placeholderTextColor={colors.placeholder}
      />
      <TextInput
        style={[styles.input, { borderColor: colors.inputBorder, color: colors.inputText, backgroundColor: colors.card }]}
        value={age}
        onChangeText={setAge}
        keyboardType="number-pad"
        placeholder="edad"
        placeholderTextColor={colors.placeholder}
      />

      <Text style={[styles.label, { color: colors.text }]}>Avatar</Text>
      <View style={styles.row}>
        {AVATARS.map((a) => (
          <Pressable
            key={a}
            onPress={() => setAvatar(a)}
            style={[styles.avatar, { borderColor: avatar === a ? colors.primary : colors.border }]}
          >
            <Text style={styles.avatarText}>{a}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: colors.text }]}>Intereses</Text>
      <View style={styles.rowWrap}>
        {INTERESTS.map((i) => (
          <Pressable
            key={i}
            onPress={() => toggleInterest(i)}
            style={[
              styles.chip,
              { borderColor: selectedInterests.includes(i) ? colors.primary : colors.border, backgroundColor: colors.card },
            ]}
          >
            <Text style={{ color: colors.text }}>{i}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.switchRow}>
        <Text style={{ color: colors.textBody }}>Restricción alta</Text>
        <Switch value={strictMode} onValueChange={setStrictMode} />
      </View>
      <View style={styles.switchRow}>
        <Text style={{ color: colors.textBody }}>Aprobación para todo</Text>
        <Switch value={requireAllApprovals} onValueChange={setRequireAllApprovals} />
      </View>

      <Pressable
        disabled={!valid || busy}
        onPress={onSubmit}
        style={[styles.btn, { backgroundColor: valid ? colors.primary : colors.border }]}
      >
        <Text style={[styles.btnText, { color: colors.textOnPrimary }]}>
          {busy ? "Creando..." : "Crear y generar código"}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
  label: { fontSize: 15, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  row: { flexDirection: "row", gap: 8 },
  rowWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  avatar: { borderWidth: 2, borderRadius: 12, width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 20 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  btn: { marginTop: 8, paddingVertical: 12, borderRadius: 12, alignItems: "center" },
  btnText: { fontSize: 16, fontWeight: "700" },
});
