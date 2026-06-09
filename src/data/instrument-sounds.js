const assetVersion = "tablet-touch-15";

function versionedAsset(path) {
  return `${path}?v=${assetVersion}`;
}

export const instruments = [
  {
    id: "hand-drum",
    name: "花鼓",
    symbol: "鼓",
    image: "./assets/instruments/real-instruments-sheet.jpg?v=tablet-touch-15",
    imagePosition: "0% 0%",
    color: "#d9482b",
    sample: {
      strong: versionedAsset("./assets/audio/percussion/hand-drum-strong.wav"),
      weak: versionedAsset("./assets/audio/percussion/hand-drum-rim.wav"),
      playbackRate: 1,
      trimSeconds: 0.56
    }
  },
  {
    id: "bass-drum",
    name: "大鼓",
    symbol: "鼓",
    image: "./assets/instruments/bass-drum.svg",
    imagePosition: "50% 50%",
    color: "#d9482b",
    sample: {
      strong: versionedAsset("./assets/audio/percussion/bass-drum-strong.wav"),
      weak: versionedAsset("./assets/audio/percussion/bass-drum-soft.wav"),
      playbackRate: 1,
      trimSeconds: 1.15
    }
  },
  {
    id: "woodblock",
    name: "木鱼",
    symbol: "木",
    image: "./assets/instruments/real-instruments-sheet.jpg?v=tablet-touch-15",
    imagePosition: "100% 0%",
    color: "#a66a2b",
    sample: {
      strong: versionedAsset("./assets/audio/percussion/hand-drum-rim.wav"),
      weak: versionedAsset("./assets/audio/percussion/woodblock.wav"),
      playbackRate: 1,
      trimSeconds: 0.28
    }
  },
  {
    id: "triangle",
    name: "三角铁",
    symbol: "铁",
    image: "./assets/instruments/triangle.svg",
    imagePosition: "50% 50%",
    color: "#4f9bc3",
    sample: {
      strong: versionedAsset("./assets/audio/percussion/triangle-strong.wav"),
      weak: versionedAsset("./assets/audio/percussion/triangle-soft.wav"),
      playbackRate: 1,
      trimSeconds: 1.4
    }
  },
  {
    id: "tambourine",
    name: "铃鼓",
    symbol: "铃",
    image: "./assets/instruments/real-instruments-sheet.jpg?v=tablet-touch-15",
    imagePosition: "0% 100%",
    color: "#e2a520",
    sample: {
      strong: versionedAsset("./assets/audio/percussion/tambourine.wav"),
      weak: versionedAsset("./assets/audio/percussion/tambourine.wav"),
      playbackRate: 1,
      trimSeconds: 0.33
    }
  },
  {
    id: "shaker",
    name: "沙锤",
    symbol: "沙",
    image: "./assets/instruments/real-instruments-sheet.jpg?v=tablet-touch-15",
    imagePosition: "100% 100%",
    color: "#4f9b78",
    sample: {
      strong: versionedAsset("./assets/audio/percussion/maracas.wav"),
      weak: versionedAsset("./assets/audio/percussion/shaker.wav"),
      playbackRate: 1,
      trimSeconds: 0.28
    }
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
