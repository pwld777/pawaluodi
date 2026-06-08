export const instruments = [
  {
    id: "hand-drum",
    name: "花鼓",
    symbol: "鼓",
    image: "./assets/instruments/real-instruments-sheet.png",
    imagePosition: "0% 0%",
    color: "#d9482b",
    sample: {
      strong: "./assets/audio/percussion/hand-drum-strong.wav",
      weak: "./assets/audio/percussion/hand-drum-rim.wav",
      playbackRate: 1,
      trimSeconds: 0.56
    },
    tone: { type: "sine", frequency: 148, decay: 0.16, noise: 0.06 }
  },
  {
    id: "bass-drum",
    name: "大鼓",
    symbol: "鼓",
    image: "./assets/instruments/bass-drum.svg",
    imagePosition: "50% 50%",
    color: "#d9482b",
    sample: {
      strong: "./assets/audio/percussion/bass-drum-strong.wav",
      weak: "./assets/audio/percussion/bass-drum-soft.wav",
      playbackRate: 1,
      trimSeconds: 0.56
    },
    tone: { type: "sine", frequency: 82, decay: 0.22, noise: 0.05 }
  },
  {
    id: "woodblock",
    name: "木鱼",
    symbol: "木",
    image: "./assets/instruments/real-instruments-sheet.png",
    imagePosition: "100% 0%",
    color: "#a66a2b",
    sample: {
      strong: "./assets/audio/percussion/hand-drum-rim.wav",
      weak: "./assets/audio/percussion/woodblock.wav",
      playbackRate: 1,
      trimSeconds: 0.28
    },
    tone: { type: "square", frequency: 760, decay: 0.08, noise: 0.02 }
  },
  {
    id: "triangle",
    name: "三角铁",
    symbol: "铁",
    image: "./assets/instruments/triangle.svg",
    imagePosition: "50% 50%",
    color: "#4f9bc3",
    sample: {
      strong: "./assets/audio/percussion/triangle-strong.wav",
      weak: "./assets/audio/percussion/triangle-soft.wav",
      playbackRate: 1,
      trimSeconds: 0.74
    },
    tone: { type: "triangle", frequency: 1560, decay: 0.35, noise: 0.02 }
  },
  {
    id: "tambourine",
    name: "铃鼓",
    symbol: "铃",
    image: "./assets/instruments/real-instruments-sheet.png",
    imagePosition: "0% 100%",
    color: "#e2a520",
    sample: {
      strong: "./assets/audio/percussion/tambourine.wav",
      weak: "./assets/audio/percussion/tambourine.wav",
      playbackRate: 1,
      trimSeconds: 0.33
    },
    tone: { type: "triangle", frequency: 1080, decay: 0.12, noise: 0.12 }
  },
  {
    id: "shaker",
    name: "沙锤",
    symbol: "沙",
    image: "./assets/instruments/real-instruments-sheet.png",
    imagePosition: "100% 100%",
    color: "#4f9b78",
    sample: {
      strong: "./assets/audio/percussion/maracas.wav",
      weak: "./assets/audio/percussion/shaker.wav",
      playbackRate: 1,
      trimSeconds: 0.28
    },
    tone: { type: "sawtooth", frequency: 420, decay: 0.2, noise: 0.18 }
  }
];

export const compositionInstruments = instruments.filter((instrument) => ["bass-drum", "triangle", "tambourine", "shaker"].includes(instrument.id));

export function getInstrument(instrumentId) {
  const instrument = instruments.find((item) => item.id === instrumentId);
  if (!instrument) {
    throw new Error(`未知乐器：${instrumentId}`);
  }
  return instrument;
}
