/**
 * Genera WAV sintéticos (16-bit mono) en mobile/assets/sounds/ para desarrollo y builds.
 * Ejecutar desde la raíz del repo: node scripts/generate-eduplay-sounds.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "mobile", "assets", "sounds");

const SAMPLE_RATE = 44100;

function writeWav(filePath, samples) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = SAMPLE_RATE * blockAlign;
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write("WAVE", 8);
  buf.write("fmt ", 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(byteRate, 28);
  buf.writeUInt16LE(blockAlign, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(dataSize, 40);
  let o = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(s < 0 ? s * 0x8000 : s * 0x7fff, o);
    o += 2;
  }
  fs.writeFileSync(filePath, buf);
}

function fadeInOut(n, i) {
  const a = Math.min(1, (i / n) * 40);
  const b = Math.min(1, ((n - 1 - i) / n) * 50);
  return Math.min(a, b, 1);
}

function sine(freq, durationSec, amp = 0.35, envFn = fadeInOut) {
  const n = Math.max(1, Math.floor(durationSec * SAMPLE_RATE));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const e = envFn(n, i);
    out[i] = e * amp * Math.sin(2 * Math.PI * freq * t);
  }
  return out;
}

function chirp(f0, f1, durationSec, amp = 0.32) {
  const n = Math.max(1, Math.floor(durationSec * SAMPLE_RATE));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    const f = f0 + (f1 - f0) * u;
    const t = i / SAMPLE_RATE;
    const e = fadeInOut(n, i);
    out[i] = e * amp * Math.sin(2 * Math.PI * f * t);
  }
  return out;
}

function concat(...parts) {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Float32Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

// --- presets ---
const click = sine(920, 0.045, 0.45, (n, i) => Math.min(1, (n - i) / (n * 0.85)));
const correct = concat(sine(523, 0.09, 0.38), sine(659, 0.1, 0.38));
const wrong = sine(165, 0.22, 0.42);
const reward = concat(sine(392, 0.07, 0.3), sine(523, 0.07, 0.32), sine(659, 0.08, 0.34), sine(784, 0.12, 0.36));
const levelup = chirp(320, 980, 0.42, 0.38);
const notification = sine(1040, 0.11, 0.33);
const reaction = sine(720, 0.038, 0.5, (n, i) => (i < n * 0.2 ? i / (n * 0.2) : (n - i) / (n * 0.8)));
const whoosh = chirp(1400, 180, 0.11, 0.22);
const gameStart = concat(chirp(440, 660, 0.08, 0.28), sine(880, 0.14, 0.3));

/**
 * Tono corto tipo UI moderna (quinta justa suave) para notificaciones del sistema (push/locales).
 * Generado en el repo; los CDNs públicos de samples devolvieron 403 en entornos automatizados.
 */
const eduplayPushChime = (() => {
  const dur = 0.36;
  const n = Math.max(1, Math.floor(dur * SAMPLE_RATE));
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const attack = 1 - Math.exp(-t * 180);
    const decay = Math.exp(-t * 10.5);
    const env = attack * decay;
    const f1 = 587.33;
    const f2 = 880;
    const tone =
      0.52 * Math.sin(2 * Math.PI * f1 * t) +
      0.38 * Math.sin(2 * Math.PI * f2 * t) +
      0.12 * Math.sin(2 * Math.PI * f1 * 2 * t);
    out[i] = env * 0.34 * tone;
  }
  return out;
})();

fs.mkdirSync(OUT_DIR, { recursive: true });

const files = {
  click,
  correct,
  wrong,
  reward,
  levelup,
  notification,
  reaction,
  whoosh,
  gameStart,
  "eduplay-push-chime": eduplayPushChime,
};

for (const [name, samples] of Object.entries(files)) {
  writeWav(path.join(OUT_DIR, `${name}.wav`), samples);
}

console.log("Wrote", Object.keys(files).length, "wav files to", OUT_DIR);
