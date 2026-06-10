import { getInstrument } from "../data/instrument-sounds.js?v=qq-safe-25";

let audioContext;
let didWarmContext = false;
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
  warmUnlockedContext(context);
}

function warmUnlockedContext(context) {
  if (didWarmContext || context.state !== "running") {
    return;
  }

  didWarmContext = true;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = context.createBuffer(1, 1, context.sampleRate);
  gain.gain.setValueAtTime(0.0001, context.currentTime);
  source.connect(gain);
  gain.connect(context.destination);
  source.start();
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

export function warmHtmlAudioFallback(instrumentId, { volume = 0.001, accent = true } = {}) {
  const instrument = getInstrument(instrumentId);
  const sampleUrl = accent ? instrument.sample?.strong : instrument.sample?.weak;
  return playHtmlAudioFallback(sampleUrl, {
    volume,
    playbackRate: instrument.sample?.playbackRate ?? 1,
    warmOnly: true
  });
}

async function loadSample(url) {
  const context = getContext();

  if (!sampleBuffers.has(url)) {
    const bufferPromise = loadSampleBytes(url)
      .then((arrayBuffer) => decodeAudioDataCompat(context, arrayBuffer))
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

function decodeAudioDataCompat(context, arrayBuffer) {
  return new Promise((resolve, reject) => {
    let isSettled = false;
    const settle = (callback, value) => {
      if (isSettled) {
        return;
      }
      isSettled = true;
      callback(value);
    };

    try {
      const decodeBuffer = arrayBuffer.slice ? arrayBuffer.slice(0) : arrayBuffer;
      const result = context.decodeAudioData(
        decodeBuffer,
        (buffer) => settle(resolve, buffer),
        (error) => settle(reject, error)
      );

      if (result && typeof result.then === "function") {
        result.then(
          (buffer) => settle(resolve, buffer),
          (error) => settle(reject, error)
        );
      }
    } catch (error) {
      settle(reject, error);
    }
  });
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
  const uniqueUrls = [...new Set(urls)];
  const errors = [];
  let loadedCount = 0;

  for (const url of uniqueUrls) {
    try {
      await loadSample(url);
      loadedCount += 1;
    } catch (error) {
      errors.push(error);
    }
  }

  if (uniqueUrls.length > 0 && loadedCount === 0) {
    throw errors[0];
  }
}

export async function primeAudio(instrumentIds) {
  await unlockAudio();
  await Promise.all(instrumentIds.map((instrumentId) => preloadInstrument(instrumentId).catch(() => {})));
}

function getSampleUrls(instrument, accent) {
  const preferred = accent ? instrument.sample?.strong : instrument.sample?.weak;
  const fallback = accent ? instrument.sample?.weak : instrument.sample?.strong;
  return [...new Set([preferred, fallback].filter(Boolean))];
}

async function loadFirstAvailableSample(urls) {
  let lastError;
  for (const url of urls) {
    try {
      return await loadSample(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("无法加载音色");
}

function playSample(context, instrument, { volume, start, accent, sustainSeconds }) {
  const sampleUrls = getSampleUrls(instrument, accent);
  if (sampleUrls.length === 0) {
    return;
  }

  loadFirstAvailableSample(sampleUrls)
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
    .catch(() => {
      playHtmlAudioFallback(sampleUrls[0], {
        volume: volume * (accent ? 0.95 : 0.62),
        playbackRate: instrument.sample.playbackRate ?? 1
      });
    });
}

export function playInstrument(instrumentId, { volume = 0.55, atTime, accent = false, sustainSeconds } = {}) {
  const context = getContext();
  const instrument = getInstrument(instrumentId);
  const start = atTime ?? context.currentTime;

  playSample(context, instrument, { volume, start, accent, sustainSeconds });
}

function playHtmlAudioFallback(url, { volume, playbackRate, warmOnly = false }) {
  const AudioConstructor = typeof window === "undefined" ? undefined : window.Audio;
  if (!AudioConstructor || !url) {
    return false;
  }

  try {
    const sampleUrl = url;
    const audio = new AudioConstructor(sampleUrl);
    audio.preload = "auto";
    audio.volume = Math.min(1, Math.max(0, volume));
    audio.playbackRate = playbackRate;
    const playResult = audio.play();
    if (playResult && typeof playResult.catch === "function") {
      playResult.catch(() => {});
    }
    if (warmOnly) {
      window.setTimeout(() => {
        try {
          audio.pause();
          audio.currentTime = 0;
        } catch {
          // Some mobile WebViews lock currentTime until metadata is ready.
        }
      }, 50);
    }
    return true;
  } catch {
    // Keep the game responsive even on strict tablet audio policies.
    return false;
  }
}
