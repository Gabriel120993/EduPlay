import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useGuardedAsync } from "../hooks/useGuardedAsync";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { formatApiError } from "../lib/apiErrors";
import { AppIcon } from "../components/AppIcon";
import { BrandLogo } from "../components/BrandLogo";
import { LOGIN_HINTS_STORAGE_KEY, useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import type { AuthStackParamList } from "../navigation/types";
import { appTaglineSubtitle } from "../constants/brand";
import { useAuthScreenStyles } from "./authScreenStyles";

type Mode = "login" | "register";
type AccountKind = "tutor" | "child";

type AuthScreenProps = NativeStackScreenProps<AuthStackParamList, "AuthHome">;

export function AuthScreen({ navigation }: AuthScreenProps) {
  const { t } = useTranslation();
  const styles = useAuthScreenStyles();
  const { colors, mode: themeMode, setMode: setThemeMode } = useTheme();
  const { login, loginAsChild, register } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [accountKind, setAccountKind] = useState<AccountKind>("tutor");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { run: runAuthSubmit, busy: authSubmitBusy } = useGuardedAsync({ cooldownMs: 900 });
  /** Sesión y datos de acceso (email/usuario) en el dispositivo; la contraseña no se guarda. */
  const [rememberMe, setRememberMe] = useState(true);
  /** Obligatorio solo al crear cuenta de tutor (registro). */
  const [acceptedTermsAndPrivacy, setAcceptedTermsAndPrivacy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(LOGIN_HINTS_STORAGE_KEY);
        if (!raw || cancelled) return;
        const hints = JSON.parse(raw) as { tutorEmail?: string; childUsername?: string };
        if (hints.tutorEmail?.trim()) setEmail(hints.tutorEmail.trim());
        if (hints.childUsername?.trim()) setUsername(hints.childUsername.trim());
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (accountKind !== "tutor" || mode !== "register") {
      setAcceptedTermsAndPrivacy(false);
    }
  }, [accountKind, mode]);

  const submitLabel =
    mode === "login"
      ? t("login.submitLogin")
      : accountKind === "tutor"
        ? t("login.submitRegister")
        : t("login.submitLogin");

  const canSubmit = useMemo(() => {
    if (password.length < 6) return false;
    if (accountKind === "tutor") {
      if (email.trim().length <= 3) return false;
      if (mode === "register" && !acceptedTermsAndPrivacy) return false;
      return true;
    }
    return username.trim().length >= 2;
  }, [accountKind, email, password.length, username, mode, acceptedTermsAndPrivacy]);

  const onSubmit = () => {
    if (!canSubmit || authSubmitBusy) return;
    void runAuthSubmit(async () => {
      setError(null);
      try {
        if (accountKind === "tutor") {
          const e = email.trim();
          if (mode === "login") {
            await login(e, password, rememberMe);
          } else {
            await register(e, password, rememberMe);
          }
        } else {
          await loginAsChild(username.trim(), password, rememberMe);
        }
      } catch (e) {
        setError(formatApiError(e, "No se pudo autenticar. Intentalo de nuevo."));
      }
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.root}
    >
      <View style={styles.card}>
        <View style={styles.brandHeader}>
          <BrandLogo width={220} height={86} />
          <View
            style={styles.taglineBlock}
            accessibilityRole="text"
            accessibilityLabel="EduPlay. Mi primera red social"
          >
            <Text style={styles.taglineMark}>EduPlay</Text>
            <Text style={styles.taglineSub}>{appTaglineSubtitle()}</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>
          {accountKind === "tutor"
            ? mode === "login"
              ? "Ingresá con email y contraseña de tutor."
              : "Creá tu cuenta de tutor con email y contraseña."
            : "Ingresá con el usuario y la contraseña que te dieron en casa."}
        </Text>
        {accountKind === "child" ? (
          <Text style={styles.childConsentNote}>
            Tu tutor o tutora debe crear su cuenta, vincular tu perfil y pulsar «Aprobar cuenta» en
            el panel familiar antes de que puedas entrar.
          </Text>
        ) : null}

        <Text style={styles.choiceSectionLabel}>¿Quién está usando la app?</Text>
        <View style={styles.choiceList}>
          <Pressable
            style={[styles.choiceCard, accountKind === "tutor" && styles.choiceCardOn]}
            onPress={() => {
              setAccountKind("tutor");
              setError(null);
            }}
            disabled={authSubmitBusy}
            accessibilityRole="radio"
            accessibilityState={{ selected: accountKind === "tutor" }}
          >
            <View style={styles.choiceCardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <AppIcon
                  name="people-outline"
                  color={accountKind === "tutor" ? colors.primary : colors.textMuted}
                  size="md"
                />
                <Text style={[styles.choiceTitle, accountKind === "tutor" && styles.choiceTitleOn]}>
                  Soy padre / tutor
                </Text>
              </View>
              {accountKind === "tutor" ? <Text style={styles.choiceCheck}>✓</Text> : null}
            </View>
            <Text style={styles.choiceDesc}>
              Ver panel familiar, límites de pantalla y permisos de tus hijos.
            </Text>
          </Pressable>
          <Pressable
            style={[styles.choiceCard, accountKind === "child" && styles.choiceCardOn]}
            onPress={() => {
              setAccountKind("child");
              setMode("login");
              setError(null);
            }}
            disabled={authSubmitBusy}
            accessibilityRole="radio"
            accessibilityState={{ selected: accountKind === "child" }}
          >
            <View style={styles.choiceCardHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <AppIcon
                  name="happy-outline"
                  color={accountKind === "child" ? colors.primary : colors.textMuted}
                  size="md"
                />
                <Text style={[styles.choiceTitle, accountKind === "child" && styles.choiceTitleOn]}>
                  Soy menor
                </Text>
              </View>
              {accountKind === "child" ? <Text style={styles.choiceCheck}>✓</Text> : null}
            </View>
            <Text style={styles.choiceDesc}>
              Usar el feed, explorar contenido y tu perfil como estudiante.
            </Text>
          </Pressable>
        </View>

        {accountKind === "tutor" ? (
          <TextInput
            style={styles.input}
            value={email}
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder={t("login.email")}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel={t("login.email")}
            allowFontScaling
          />
        ) : (
          <TextInput
            style={styles.input}
            value={username}
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setUsername}
            placeholder={t("login.username")}
            placeholderTextColor={colors.placeholder}
            accessibilityLabel={t("login.username")}
            allowFontScaling
          />
        )}
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t("login.password")}
          placeholderTextColor={colors.placeholder}
          accessibilityLabel={t("login.password")}
          allowFontScaling
        />

        {accountKind === "tutor" && mode === "register" ? (
          <View style={styles.legalAcceptRow}>
            <Pressable
              onPress={() => setAcceptedTermsAndPrivacy((v) => !v)}
              disabled={authSubmitBusy}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: acceptedTermsAndPrivacy }}
              accessibilityLabel="Acepto los Términos del servicio y la Política de privacidad"
            >
              <View
                style={[
                  styles.legalCheckboxOuter,
                  {
                    borderColor: acceptedTermsAndPrivacy ? colors.primary : colors.border,
                    backgroundColor: acceptedTermsAndPrivacy ? colors.primarySoft : "transparent",
                  },
                ]}
              >
                {acceptedTermsAndPrivacy ? (
                  <AppIcon name="checkmark" color={colors.primaryStrong} size="sm" />
                ) : null}
              </View>
            </Pressable>
            <Text style={styles.legalAcceptText}>
              Acepto los{" "}
              <Text
                style={styles.legalInlineLink}
                onPress={() => navigation.navigate("LegalDocument", { kind: "terms" })}
                accessibilityRole="link"
              >
                Términos del servicio
              </Text>{" "}
              y la{" "}
              <Text
                style={styles.legalInlineLink}
                onPress={() => navigation.navigate("LegalDocument", { kind: "privacy" })}
                accessibilityRole="link"
              >
                Política de privacidad
              </Text>
              .
            </Text>
          </View>
        ) : null}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.rememberRow}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.rememberTitle}>Recordarme en este dispositivo</Text>
            <Text style={styles.rememberDesc}>
              Mantiene la sesión al volver a abrir la app. La contraseña no se guarda; el servidor
              reconoce tu cuenta con un token seguro.
            </Text>
          </View>
          <Switch
            value={rememberMe}
            onValueChange={setRememberMe}
            disabled={authSubmitBusy}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={
              Platform.OS === "android" ? (rememberMe ? colors.primary : colors.card) : undefined
            }
            ios_backgroundColor={colors.border}
            accessibilityLabel="Recordarme en este dispositivo"
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            (!canSubmit || authSubmitBusy) && styles.submitBtnDisabled,
            pressed && styles.pressed,
          ]}
          onPress={onSubmit}
          disabled={!canSubmit || authSubmitBusy}
          accessibilityRole="button"
          accessibilityLabel={submitLabel}
          accessibilityState={{ disabled: !canSubmit || authSubmitBusy, busy: authSubmitBusy }}
        >
          {authSubmitBusy ? (
            <ActivityIndicator color={colors.textOnPrimary} />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <AppIcon name="log-in-outline" color={colors.textOnPrimary} size="md" />
              <Text style={styles.submitText}>{submitLabel}</Text>
            </View>
          )}
        </Pressable>

        {accountKind === "tutor" ? (
          <>
            <Pressable
              style={styles.switchBtn}
              onPress={() => {
                setMode((prev) => (prev === "login" ? "register" : "login"));
                setError(null);
              }}
              disabled={authSubmitBusy}
            >
              <Text style={styles.switchText}>
                {mode === "login" ? "No tengo cuenta" : "Ya tengo cuenta"}
              </Text>
            </Pressable>

            {mode === "login" ? (
              <Pressable
                style={styles.switchBtn}
                onPress={() => navigation.navigate("ParentRegister")}
                disabled={authSubmitBusy}
              >
                <Text style={styles.switchText}>Crear nueva cuenta</Text>
              </Pressable>
            ) : null}
          </>
        ) : (
          <Pressable
            style={styles.switchBtn}
            onPress={() => {
              Alert.alert(
                "Crear cuenta de menor",
                "La cuenta de menor debe crearla un padre/tutor desde su panel familiar. Te llevamos al registro de tutor para empezar.",
                [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Ir a registro", onPress: () => navigation.navigate("ParentRegister") },
                ],
              );
            }}
            disabled={authSubmitBusy}
          >
            <Text style={styles.switchText}>Crear cuenta de menor</Text>
          </Pressable>
        )}

        <View style={styles.themeHint}>
          <Text style={styles.themeHintLabel}>Apariencia</Text>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: colors.text }}>
              Modo oscuro
            </Text>
            <Switch
              value={themeMode === "dark"}
              onValueChange={(v) => void setThemeMode(v ? "dark" : "light")}
              disabled={authSubmitBusy}
              trackColor={{ false: colors.border, true: colors.primarySoft }}
              thumbColor={
                Platform.OS === "android"
                  ? themeMode === "dark"
                    ? colors.primary
                    : colors.card
                  : undefined
              }
              ios_backgroundColor={colors.border}
              accessibilityLabel="Activar modo oscuro"
            />
          </View>
        </View>

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
      </View>
    </KeyboardAvoidingView>
  );
}
