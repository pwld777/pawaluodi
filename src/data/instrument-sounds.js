export const instruments = [
  {
    id: "hand-drum",
    name: "花鼓",
    symbol: "鼓",
    image: "./assets/instruments/real-instruments-sheet.png",
    imagePosition: "0% 0%",
    color: "#d9482b",
    tone: { type: "sine", frequency: 148, decay: 0.16, noise: 0.06 }
  },
  {
    id: "woodblock",
    name: "木鱼",
    symbol: "木",
    image: "./assets/instruments/real-instruments-sheet.png",
    imagePosition: "100% 0%",
    color: "#a66a2b",
    tone: { type: "square", frequency: 760, decay: 0.08, noise: 0.02 }
  },
  {
    id: "tambourine",
    name: "铃鼓",
    symbol: "铃",
    image: "./assets/instruments/real-instruments-sheet.png",
    imagePosition: "0% 100%",
    color: "#e2a520",
    tone: { type: "triangle", frequency: 1080, decay: 0.12, noise: 0.12 }
  },
  {
    id: "shaker",
    name: "沙锤",
    symbol: "沙",
    image: "./assets/instruments/real-instruments-sheet.png",
    imagePosition: "100% 100%",
    color: "#4f9b78",
    tone: { type: "sawtooth", frequency: 420, decay: 0.2, noise: 0.18 }
  }
];

export function getInstrument(instrumentId) {
  const instrument = instruments.find((item) => item.id === instrumentId);
  if (!instrument) {
    throw new Error(`未知乐器：${instrumentId}`);
  }
  return instrument;
}
