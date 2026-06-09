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

export function warmAudioWithRecordedSample(instrumentId, { volume = 0.04, accent = true } = {}) {
  const context = getContext();
  const instrument = getInstrument(instrumentId);
  const sampleUrl = accent ? instrument.sample?.strong : instrument.sample?.weak;
  const buffer = sampleBuffers.get(sampleUrl);
  if (!sampleUrl || !buffer || typeof buffer.then === "function") {
    return false;
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  const start = context.currentTime + 0.005;
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + 0.045);
  source.connect(gain);
  gain.connect(context.destination);
  source.start(start);
  source.stop(start + 0.05);
  return true;
}

async function loadSample(url) {
  const context = getContext();

  if (!sampleBuffers.has(url)) {
    const bufferPromise = loadSampleBytes(url)
      .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
      .then((buffer) => {
        sampleBuffers.set(url, buffer);
        return buffer;
      });
    sampleBuffers.set(url, bufferPromise);
  }

  try {
    return await sampleBuffers.get(url);
  } catch (error) {
    sampleBuffers.delete(url);
    throw error;
  }
}

function dataUrlToArrayBuffer(url) {
  const base64Marker = ";base64,";
  const markerIndex = url.indexOf(base64Marker);
  if (!url.startsWith("data:") || markerIndex === -1) {
    throw new Error(`无法加载音色：${url}`);
  }

  const base64 = url.slice(markerIndex + base64Marker.length);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

async function loadSampleBytes(url) {
  if (url.startsWith("data:")) {
    return dataUrlToArrayBuffer(url);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`无法加载音色：${url}`);
  }
  return response.arrayBuffer();
}

export const __testOnlyLoadSample = loadSample;

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
