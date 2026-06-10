import { getInstrument } from "../data/instrument-sounds.js";

let audioContext;
const sampleBuffers = new Map();

function getContext() {
  if (!audioContext) {
    audioContext = new AudioContext();
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

function playSample(context, instrument, { volume, start, accent, sustainSeconds }) {
  const sampleUrl = accent ? instrument.sample?.strong : instrument.sample?.weak;
  if (!sampleUrl) {
    return false;
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
    .catch(() => {
      if (instrument.sample?.realOnly) {
        return;
      }
      playSynth(context, instrument, { volume, start, accent, sustainSeconds });
    });

  return true;
}

export function playInstrument(instrumentId, { volume = 0.55, atTime, accent = false, sustainSeconds } = {}) {
  const context = getContext();
  const instrument = getInstrument(instrumentId);
  const start = atTime ?? context.currentTime;

  if (playSample(context, instrument, { volume, start, accent, sustainSeconds })) {
    return;
  }

  playSynth(context, instrument, { volume, start, accent, sustainSeconds });
}

function playSynth(context, instrument, { volume, start, accent, sustainSeconds }) {
  const duration = Math.max(instrument.tone.decay * (accent ? 1.2 : 1), sustainSeconds ?? 0);
  const gain = context.createGain();
  const oscillator = context.createOscillator();

  oscillator.type = instrument.tone.type;
  oscillator.frequency.setValueAtTime(instrument.tone.frequency * (accent ? 0.82 : 1), start);
  gain.gain.setValueAtTime(volume * (accent ? 0.9 : 0.58), start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration);

  if (instrument.tone.noise) {
    playNoise(context, start, duration, volume * instrument.tone.noise);
  }
}

function playNoise(context, start, duration, volume) {
  const bufferSize = Math.max(1, Math.floor(context.sampleRate * duration));
  const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
  const output = buffer.getChannelData(0);

  for (let index = 0; index < bufferSize; index += 1) {
    output[index] = Math.random() * 2 - 1;
  }

  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.setValueAtTime(volume, start);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  source.connect(gain);
  gain.connect(context.destination);
  source.start(start);
  source.stop(start + duration);
}
