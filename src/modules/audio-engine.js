import { getInstrument } from "../data/instrument-sounds.js";

let audioContext;

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

export function playInstrument(instrumentId, { volume = 0.55, atTime, accent = false } = {}) {
  const context = getContext();
  const instrument = getInstrument(instrumentId);
  const start = atTime ?? context.currentTime;
  const duration = instrument.tone.decay * (accent ? 1.2 : 1);
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

