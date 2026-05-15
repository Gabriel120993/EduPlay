import Slider from "@react-native-community/slider";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { useAuth } from "../contexts/AuthContext";
import { formatApiError } from "../lib/apiErrors";
import { useTheme } from "../contexts/ThemeContext";
import {
  applyNotificationPreferencesFromProfile,
  applyNotificationPreferencesLocal,
  getNotificationPreferencesSnapshot,
  refreshNotificationPreferencesFromStorage,
  subscribeNotificationPreferences,
} from "../lib/notificationPreferencesStore";
import type { RootStackParamList } from "../navigation/types";
import { deleteMyAccount, getUserProfile, patchUserPreferences } from "../services/api";
import {
  clearLocalNotificationSchedules,
  syncLocalNotifications,
} from "../services/localNotifications";
import {
  getSoundSettingsSnapshot,
  playClick,
  playNotification,
  playSuccess,
  refreshSoundSettingsFromStorage,
  setSoundEnabled,
  setSoundVolume,
  subscribeSoundSettings,
} from "../services/soundManager";
import { space, typography } from "../theme/tokens";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen(_props: Props) {
  const { mode, colors, setMode } = useTheme();
  const { sessionRole, viewerUserId, logout } = useAuth();
  const isChild = sessionRole === "child" && viewerUserId != null;
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);
  /** Evita que un GET de perfil en curso pise el estado tras cambiar el switch. */
  const notificationPrefsHydrateGen = useRef(0);
  const isDark = mode === "dark";
  const [soundOn, setSoundOn] = useState(() => getSoundSettingsSnapshot().enabled);
  const [soundVolume, setSoundVolumeLocal] = useState(() => getSoundSettingsSnapshot().volume);
  const [notifOn, setNotifOn] = useState(
    () => getNotificationPreferencesSnapshot().notificationsEnabled,
  );
  const [notifSoundsOn, setNotifSoundsOn] = useState(
    () => getNotificationPreferencesSnapshot().notificationSoundsEnabled,
  );

  useEffect(() => {
    const unsub = subscribeSoundSettings(() => {
      const s = getSoundSettingsSnapshot();
      setSoundOn(s.enabled);
      setSoundVolumeLocal(s.volume);
    });
    void refreshSoundSettingsFromStorage().then((p) => {
      setSoundOn(p.enabled);
      setSoundVolumeLocal(p.volume);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeNotificationPreferences(() => {
      const p = getNotificationPreferencesSnapshot();
      setNotifOn(p.notificationsEnabled);
      setNotifSoundsOn(p.notificationSoundsEnabled);
    });
    void refreshNotificationPreferencesFromStorage().then((p) => {
      setNotifOn(p.notificationsEnabled);
      setNotifSoundsOn(p.notificationSoundsEnabled);
    });
    return unsub;
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (!isChild || !viewerUserId) return;
      const gen = ++notificationPrefsHydrateGen.current;
      void (async () => {
        try {
          const profile = await getUserProfile(viewerUserId);
          if (notificationPrefsHydrateGen.current !== gen) return;
          await applyNotificationPreferencesFromProfile(profile);
        } catch {
          // offline: se mantienen valores en AsyncStorage
        }
      })();
      return () => {
        notificationPrefsHydrateGen.current += 1;
      };
    }, [isChild, viewerUserId]),
  );

  const onNotificationToggle = useCallback(
    async (v: boolean) => {
      if (!viewerUserId) return;
      notificationPrefsHydrateGen.current += 1;
      const prev = getNotificationPreferencesSnapshot();
      const next = { ...prev, notificationsEnabled: v };
      setNotifOn(v);
      await applyNotificationPreferencesLocal(next);
      try {
        await patchUserPreferences(viewerUserId, { notificationsEnabled: v });
      } catch {
        setNotifOn(prev.notificationsEnabled);
        await applyNotificationPreferencesLocal(prev);
        return;
      }
      try {
        if (!v) {
          await clearLocalNotificationSchedules();
        } else {
          await syncLocalNotifications(viewerUserId);
        }
      } catch {
        // El servidor ya guardó la preferencia; no revertir el switch por fallo local (permisos, etc.).
      }
    },
    [viewerUserId],
  );

  const confirmDeleteMyAccount = useCallback(() => {
    Alert.alert(
      "Eliminar mi cuenta",
      "Se borrarán de forma permanente tu perfil, publicaciones, progreso (juegos, misiones, XP) y otros datos de EduPlay. Esta acción no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "¿Seguro?",
              "Perderás el acceso con tu usuario actual. Tu tutor puede dar de alta un perfil nuevo más adelante.",
              [
                { text: "Cancelar", style: "cancel" },
                {
                  text: "Eliminar mi cuenta",
                  style: "destructive",
                  onPress: () => {
                    void (async () => {
                      setDeleteAccountBusy(true);
                      try {
                        await deleteMyAccount();
                        await logout();
                      } catch (e) {
                        Alert.alert("Error", formatApiError(e, "No se pudo eliminar la cuenta."));
                      } finally {
                        setDeleteAccountBusy(false);
                      }
                    })();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [logout]);

  const onNotificationSoundToggle = useCallback(
    async (v: boolean) => {
      if (!viewerUserId) return;
      notificationPrefsHydrateGen.current += 1;
      const prev = getNotificationPreferencesSnapshot();
      const next = { ...prev, notificationSoundsEnabled: v };
      setNotifSoundsOn(v);
      await applyNotificationPreferencesLocal(next);
      try {
        await patchUserPreferences(viewerUserId, { notificationSoundsEnabled: v });
      } catch {
        setNotifSoundsOn(prev.notificationSoundsEnabled);
        await applyNotificationPreferencesLocal(prev);
        return;
      }
      try {
        if (getNotificationPreferencesSnapshot().notificationsEnabled) {
          await syncLocalNotifications(viewerUserId);
        }
      } catch {
        // Igual que arriba: no revertir si solo falla la reprogramación local.
      }
    },
    [viewerUserId],
  );

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.screenTitle}>Ajustes</Text>
      {isChild ? (
        <>
          <Text style={styles.sectionHint}>Transparencia</Text>
          <View style={[styles.card, styles.cardSpacing, styles.transparencyCard]}>
            <Text
              style={styles.transparencyTitle}
              accessibilityRole="header"
              accessibilityLabel="How we protect your child. Cómo te protegemos en EduPlay."
            >
              How we protect your child
            </Text>
            <Text style={styles.transparencyLead}>Cómo te protegemos en EduPlay</Text>
            <Text style={styles.transparencyBody}>
              Tu tutor o tutora crea tu perfil y debe aprobar tu cuenta antes de que puedas usar la
              app: así siempre hay un adulto responsable al tanto.
            </Text>
            <Text style={styles.transparencyBody}>
              Los datos se envían de forma segura entre tu dispositivo y los servidores. En la app
              hay reglas de comunidad, moderación de contenido y controles familiares (por ejemplo
              amigos, tiempo de pantalla y publicaciones).
            </Text>
            <Text style={styles.transparencyBody}>
              Si algo te incomoda o ves algo raro, contale a tu tutor o a un adulto de confianza.
              Podés leer más en Privacidad y Términos desde la pantalla de acceso.
            </Text>
          </View>
          <Text style={styles.sectionHint}>Notificaciones</Text>
          <View style={[styles.card, styles.cardSpacing]}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.label}>🔔 Notificaciones</Text>
                <Text style={styles.sub}>
                  Recordatorios locales y avisos en el dispositivo (según permisos del sistema).
                </Text>
              </View>
              <Switch
                value={notifOn}
                onValueChange={(v) => void onNotificationToggle(v)}
                trackColor={{ false: colors.border, true: colors.primarySoft }}
                thumbColor={notifOn ? colors.primary : "#f4f4f5"}
                ios_backgroundColor={colors.border}
                accessibilityLabel={
                  notifOn ? "Desactivar notificaciones" : "Activar notificaciones"
                }
              />
            </View>
            <View style={[styles.row, styles.rowDivider]}>
              <View style={styles.rowText}>
                <Text style={styles.label}>🔉 Sonido de notificaciones</Text>
                <Text style={styles.sub}>
                  Tono al recibir un aviso del sistema (no afecta a los sonidos de juego arriba).
                </Text>
              </View>
              <Switch
                value={notifSoundsOn}
                onValueChange={(v) => void onNotificationSoundToggle(v)}
                disabled={!notifOn}
                trackColor={{ false: colors.border, true: colors.primarySoft }}
                thumbColor={notifSoundsOn ? colors.primary : "#f4f4f5"}
                ios_backgroundColor={colors.border}
                accessibilityLabel={
                  notifSoundsOn
                    ? "Desactivar sonido de notificaciones"
                    : "Activar sonido de notificaciones"
                }
              />
            </View>
          </View>
        </>
      ) : null}
      <Text style={styles.sectionHint}>Sonido</Text>
      <View style={[styles.card, styles.cardSpacing]}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>🔊 Sonidos</Text>
            <Text style={styles.sub}>
              Juegos, reacciones, toasts, campana, onboarding y navegación (tabs y categorías).
            </Text>
          </View>
          <Switch
            value={soundOn}
            onValueChange={(v) => {
              setSoundOn(v);
              void setSoundEnabled(v);
            }}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={soundOn ? colors.primary : "#f4f4f5"}
            ios_backgroundColor={colors.border}
            accessibilityLabel={soundOn ? "Desactivar sonidos" : "Activar sonidos"}
          />
        </View>
        {soundOn ? (
          <View style={styles.volumeBlock}>
            <View style={styles.volumeHeader}>
              <Text style={styles.volumeLabel}>Volumen</Text>
              <Text style={styles.volumePct}>{Math.round(soundVolume * 100)}%</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={1}
              step={0.05}
              value={soundVolume}
              onValueChange={setSoundVolumeLocal}
              onSlidingComplete={(v) => void setSoundVolume(v)}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
              accessibilityLabel="Volumen de sonidos"
            />
            <Pressable
              onPress={() => {
                playClick();
                setTimeout(() => playSuccess(), 200);
                setTimeout(() => playNotification(), 450);
              }}
              style={({ pressed }) => [styles.previewBtn, pressed && styles.previewBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Probar sonidos"
            >
              <Text style={styles.previewBtnText}>Probar sonido</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
      {isChild ? (
        <>
          <Text style={styles.sectionHint}>Cuenta</Text>
          <View style={[styles.card, styles.cardSpacing, styles.dangerCard]}>
            <Text style={styles.label}>Eliminar cuenta</Text>
            <Text style={styles.sub}>
              Borrá tu perfil y todo el progreso en EduPlay. Si cambiás de idea, no podremos
              recuperar los datos.
            </Text>
            <Pressable
              onPress={confirmDeleteMyAccount}
              disabled={deleteAccountBusy}
              style={({ pressed }) => [
                styles.dangerBtn,
                (deleteAccountBusy || pressed) && styles.dangerBtnPressed,
                deleteAccountBusy && styles.dangerBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Eliminar mi cuenta de EduPlay"
            >
              <Text style={styles.dangerBtnText}>
                {deleteAccountBusy ? "Eliminando…" : "Eliminar mi cuenta"}
              </Text>
            </Pressable>
          </View>
        </>
      ) : null}
      <Text style={styles.sectionHint}>Apariencia</Text>
      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.rowText}>
            <Text style={styles.label}>{isDark ? "🌙 Modo oscuro" : "☀️ Modo claro"}</Text>
            <Text style={styles.sub}>
              {isDark
                ? "Activa una interfaz oscura para descansar la vista."
                : "Usa una interfaz clara y luminosa."}
            </Text>
            <View style={styles.modeRow}>
              <Text style={[styles.modeChip, isDark ? styles.modeChipActive : styles.modeChipIdle]}>
                🌙 Modo oscuro
              </Text>
              <Text
                style={[styles.modeChip, !isDark ? styles.modeChipActive : styles.modeChipIdle]}
              >
                ☀️ Modo claro
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={(v) => void setMode(v ? "dark" : "light")}
            trackColor={{ false: colors.border, true: colors.primarySoft }}
            thumbColor={isDark ? colors.primary : "#f4f4f5"}
            ios_backgroundColor={colors.border}
            accessibilityLabel={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          />
        </View>
      </View>
    </ScrollView>
  );
}

function createStyles(c: import("../theme/appTheme").AppColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: c.background,
    },
    content: {
      padding: space.md,
      paddingBottom: space.xl,
    },
    screenTitle: {
      fontSize: typography.title + 4,
      fontWeight: "900",
      color: c.text,
      marginBottom: space.md + space.sm,
    },
    sectionHint: {
      fontSize: typography.secondary,
      fontWeight: "800",
      color: c.textMuted,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginBottom: space.sm,
    },
    transparencyCard: {
      borderLeftWidth: 4,
      borderLeftColor: c.primary,
    },
    transparencyTitle: {
      fontSize: typography.bodyLarge + 1,
      fontWeight: "800",
      color: c.text,
      letterSpacing: 0.2,
    },
    transparencyLead: {
      marginTop: space.xs + space.xs - 2,
      fontSize: typography.body,
      fontWeight: "700",
      color: c.primaryStrong,
    },
    transparencyBody: {
      marginTop: space.sm + space.xs,
      fontSize: typography.secondary + 1,
      fontWeight: "500",
      color: c.textBody,
      lineHeight: typography.body + space.sm,
    },
    card: {
      backgroundColor: c.card,
      borderRadius: space.sm + space.xs,
      borderWidth: 1,
      borderColor: c.borderSubtle,
      padding: space.md,
    },
    cardSpacing: {
      marginBottom: space.lg,
    },
    volumeBlock: {
      marginTop: space.md,
      paddingTop: space.md,
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
    },
    volumeHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: space.sm,
    },
    volumeLabel: {
      fontSize: typography.body,
      fontWeight: "700",
      color: c.text,
    },
    volumePct: {
      fontSize: typography.secondary,
      fontWeight: "800",
      color: c.textMuted,
    },
    slider: {
      width: "100%",
      height: 40,
    },
    previewBtn: {
      marginTop: space.md,
      alignSelf: "flex-start",
      paddingVertical: space.sm,
      paddingHorizontal: space.md,
      borderRadius: 10,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoftBorder,
    },
    previewBtnPressed: {
      opacity: 0.88,
    },
    previewBtnText: {
      fontSize: typography.body,
      fontWeight: "800",
      color: c.primary,
    },
    rowDivider: {
      marginTop: space.md,
      paddingTop: space.md,
      borderTopWidth: 1,
      borderTopColor: c.borderSubtle,
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: space.sm,
    },
    rowText: {
      flex: 1,
      minWidth: 0,
    },
    label: {
      fontSize: typography.bodyLarge,
      fontWeight: "700",
      color: c.text,
    },
    sub: {
      marginTop: space.xs,
      fontSize: typography.secondary,
      color: c.textMuted,
    },
    modeRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: space.xs,
      marginTop: space.sm,
    },
    modeChip: {
      paddingHorizontal: space.sm + space.xs,
      paddingVertical: space.xs,
      borderRadius: 999,
      fontSize: typography.secondary,
      fontWeight: "700",
    },
    modeChipActive: {
      color: c.text,
      backgroundColor: c.primarySoft,
      borderWidth: 1,
      borderColor: c.primarySoftBorder,
    },
    modeChipIdle: {
      color: c.textMuted,
      backgroundColor: c.ghostBg,
      borderWidth: 1,
      borderColor: c.borderSubtle,
    },
    dangerCard: {
      borderColor: c.errorBorder,
      backgroundColor: c.errorSoft,
    },
    dangerBtn: {
      marginTop: space.md,
      alignSelf: "flex-start",
      paddingVertical: space.sm + space.xs,
      paddingHorizontal: space.md,
      borderRadius: 10,
      backgroundColor: c.error,
    },
    dangerBtnPressed: {
      opacity: 0.9,
    },
    dangerBtnDisabled: {
      opacity: 0.55,
    },
    dangerBtnText: {
      fontSize: typography.body,
      fontWeight: "800",
      color: c.textOnPrimary,
    },
  });
}
