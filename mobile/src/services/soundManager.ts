import { Audio } from "expo-av";

import {
  loadSoundSettings,
  saveSoundEnabled,
  saveSoundVolume,
  SOUND_DEFAULTS,
} from "../lib/soundSettingsStorage";

/** Clic UI: mismo tap que reacciones (WAV fiable en web y nativo). */
const clickSrc = require("../../assets/sounds/mixkit-game-ball-tap-2073.wav");
/** Acierto en quiz/juegos y toasts de éxito. */
const correctSrc = require("../../assets/sounds/mixkit-bonus-earned-in-video-game-2058.wav");
/** Error / incorrecto / tiempo agotado. */
const wrongSrc = require("../../assets/sounds/wrong.wav");
const rewardSrc = require("../../assets/sounds/reward.wav");
const levelupSrc = require("../../assets/sounds/mixkit-unlock-game-notification-253.wav");
const notificationSrc = require("../../assets/sounds/mixkit-retro-game-notification-212.wav");
/** Reacciones en feed y Explorar (like, aplauso, estrella). */
const extraBonusSrc = require("../../assets/sounds/mixkit-extra-bonus-in-a-video-game-2045.wav");
/**
 * Al pulsar «Jugar» / «Jugar con imágenes» en categoría (Mixkit #2043, licencia Mixkit).
 * Sonido distinto al de reacciones para no confundir.
 */
const gameEnterSrc = require("../../assets/sounds/mixkit-player-jumping-in-a-video-game-2043.wav");
const whooshSrc = require("../../assets/sounds/mixkit-arrow-whoosh-1491.wav");

let audioModeReady = false;

type Prefs = { enabled: boolean; volume: number };
let cachedPrefs: Prefs = { ...SOUND_DEFAULTS };
let loadPromise: Promise<void> | null = null;

const listeners = new Set<() => void>();

function notifySoundSettings(): void {
  listeners.forEach((l) => l());
}

function ensureLoadStarted(): void {
  if (loadPromise) return;
  loadPromise = loadSoundSettings().then((s) => {
    cachedPrefs = s;
    notifySoundSettings();
  });
}

/** Suscripción para refrescar UI (p. ej. Ajustes) cuando cambian preferencias. */
export function subscribeSoundSettings(cb: () => void): () => void {
  ensureLoadStarted();
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function getSoundSettingsSnapshot(): Prefs {
  return { ...cachedPrefs };
}

export async function refreshSoundSettingsFromStorage(): Promise<Prefs> {
  ensureLoadStarted();
  await loadPromise;
  return { ...cachedPrefs };
}

export async function setSoundEnabled(enabled: boolean): Promise<void> {
  ensureLoadStarted();
  await loadPromise;
  cachedPrefs = { ...cachedPrefs, enabled };
  await saveSoundEnabled(enabled);
  notifySoundSettings();
}

export async function setSoundVolume(volume: number): Promise<void> {
  ensureLoadStarted();
  await loadPromise;
  const v = Math.min(1, Math.max(0, volume));
  cachedPrefs = { ...cachedPrefs, volume: v };
  await saveSoundVolume(v);
  notifySoundSettings();
}

async function ensureAudioMode(): Promise<void> {
  if (audioModeReady) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    audioModeReady = true;
  } catch {
    // Web o entornos sin audio.
  }
}

/** Tras el splash: prepara el motor de audio para que el primer efecto no tarde tanto. */
export async function warmUpAudio(): Promise<void> {
  ensureLoadStarted();
  await loadPromise;
  await ensureAudioMode();
}

/** Precarga modo de audio antes del primer feedback en juegos (sin pool: evita fallos en web). */
export async function preloadGameFeedbackSounds(): Promise<void> {
  await warmUpAudio();
}

async function playSourceOneShot(source: number, vol: number): Promise<void> {
  const { sound } = await Audio.Sound.createAsync(source, {
    shouldPlay: true,
    volume: vol,
    isMuted: false,
  });
  sound.setOnPlaybackStatusUpdate((status) => {
    if (status.isLoaded && status.didJustFinish) {
      void sound.unloadAsync();
    }
  });
}

async function getEffectiveVolume(volumeScale = 1): Promise<number> {
  ensureLoadStarted();
  await loadPromise;
  if (!cachedPrefs.enabled) return 0;
  return Math.min(1, Math.max(0, cachedPrefs.volume * volumeScale));
}

/**
 * Un clip nuevo por reproducción (mejor compatibilidad web que reutilizar un Sound en pool).
 * Varios sonidos seguidos (clic + acierto) no compiten por el mismo objeto.
 */
async function playSource(source: number, volumeScale = 1): Promise<void> {
  const vol = await getEffectiveVolume(volumeScale);
  if (vol <= 0) return;
  try {
    await ensureAudioMode();
    await playSourceOneShot(source, vol);
  } catch {
    // Sin altavoz / permisos / decode.
  }
}

/** Respuesta correcta, toast de éxito, etc. */
export function playSuccess(): void {
  void playSource(correctSrc);
}

/** Respuesta incorrecta, errores, tiempo agotado. */
export function playError(): void {
  void playSource(wrongSrc);
}

export function playClick(): void {
  void playSource(clickSrc);
}

/** Logro / modal de celebración tipo achievement. */
export function playReward(): void {
  void playSource(rewardSrc);
}

/** Subida de nivel (modal de celebración). */
export function playLevelUp(): void {
  void playSource(levelupSrc);
}

/** Campana / aviso in-app (sin duplicar con logros si se usa `silent` en el bus). */
export function playNotification(): void {
  void playSource(notificationSrc);
}

/** Reacción en el feed y en Explorar (like, aplauso, estrella). */
export function playReaction(): void {
  void playSource(extraBonusSrc, 0.88);
}

/** Transición de pantalla / paso (onboarding, animaciones de flujo). */
export function playWhoosh(): void {
  void playSource(whooshSrc, 0.55);
}

/** Inicio de quiz o juego visual al confirmar en categoría. */
export function playGameStart(): void {
  void playSource(gameEnterSrc);
}

/** Últimos segundos del temporizador del quiz (más suave que un clic normal). */
export function playTimerTick(): void {
  void playSource(clickSrc, 0.42);
}

ensureLoadStarted();
