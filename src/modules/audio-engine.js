import { getInstrument } from "../data/instrument-sounds.js";

let audioContext;
const sampleBuffers = new Map();

function getContext() {
  if (!audioContext) {
    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    audioContext = new AudioContextConstructor();
  }
  return audioContext;
}

export async function unlockAudio() {
  const context = getContext();
  if (context.state === "suspended") {
    await context.resume();
  }
}

async function loadSample(url) {
  const context = getContext();

  if (!sampleBuffers.has(url)) {
    const bufferPromise = fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`无法加载音色：${url}`);
        }
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => context.decodeAudioData(arrayBuffer));
    sampleBuffers.set(url, bufferPromise);
  }

  return sampleBuffers.get(url);
}

export async function preloadInstrument(instrumentId) {
  const instrument = getInstrument(instrumentId);
  const urls = [instrument.sample?.strong, instrument.sample?.weak].filter(Boolean);
  await Promise.all([...new Set(urls)].map((url) => loadSample(url)));
}

export async function primeAudio(instrumentIds) {
  await unlockAudio();
  await Promise.all(instrumentIds.map((instrumentId) => preloadInstrument(instrumentId).catch(() => {})));
}

function playSample(context, instrument, { volume, start, accent, sustainSeconds }) {
  const sampleUrl = accent ? instrument.sample?.strong : instrument.sample?.weak;
  if (!sampleUrl) {
    return;
  }

  loadSample(sampleUrl)
    .then((buffer) => {
      const safeStart = Math.max(start, context.currentTime + 0.005);
      const source = context.createBufferSource();
      const gain = context.createGain();
      source.buffer = buffer;
      source.playbackRate.setValueAtTime(instrument.sample.playbackRate ?? 1, safeStart);
      const sampleDuration = buffer.duration / (instrument.sample.playbackRate ?? 1);
      const noteDuration = sustainSeconds ?? instrument.sample.trimSeconds ?? 0.35;
      const playDuration = Math.min(sampleDuration, noteDuration);
      const releaseSeconds = Math.min(0.22, playDuration * 0.35);
      const releaseStart = Math.max(0.03, playDuration - releaseSeconds);
      gain.gain.setValueAtTime(volume * (accent ? 0.95 : 0.62), safeStart);
      gain.gain.setValueAtTime(volume * (accent ? 0.95 : 0.62), safeStart + releaseStart);
      gain.gain.exponentialRampToValueAtTime(0.001, safeStart + playDuration);
      source.connect(gain);
      gain.connect(context.destination);
      source.start(safeStart);
      source.stop(safeStart + playDuration);
    })
    .catch(() => {});
}

export function playInstrument(instrumentId, { volume = 0.55, atTime, accent = false, sustainSeconds } = {}) {
  const context = getContext();
  const instrument = getInstrument(instrumentId);
  const start = atTime ?? context.currentTime;

  playSample(context, instrument, { volume, start, accent, sustainSeconds });
}
