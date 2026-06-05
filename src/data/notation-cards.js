export const notationCards = [
  {
    id: "sixteenth-run",
    name: "四个十六分音符",
    beats: 1,
    section: "A",
    density: "dense",
    mood: "欢快、跳动",
    glyph: "♬♬",
    syllables: "ta-ka-di-mi",
    hits: [0, 0.25, 0.5, 0.75],
    sustainBeats: 0.12,
    tag: "四下"
  },
  {
    id: "eighth-pair",
    name: "两个八分音符",
    beats: 1,
    section: "A",
    density: "medium",
    mood: "流动",
    glyph: "♪♪",
    syllables: "ta-ti",
    hits: [0, 0.5],
    sustainBeats: 0.18,
    tag: "两下"
  },
  {
    id: "quarter-note",
    name: "四分音符",
    beats: 1,
    section: "B",
    density: "open",
    mood: "平稳",
    glyph: "♩",
    syllables: "ta",
    hits: [0],
    sustainBeats: 0.28,
    tag: "一拍"
  },
  {
    id: "half-note",
    name: "二分音符",
    beats: 2,
    section: "B",
    density: "open",
    mood: "舒展、歌唱",
    glyph: "𝅗𝅥",
    syllables: "ta-a",
    hits: [0],
    sustainBeats: 1.5,
    tag: "两拍"
  },
  {
    id: "dotted-half-note",
    name: "附点二分音符",
    beats: 3,
    section: "B",
    density: "long",
    mood: "悠扬、停连",
    glyph: "𝅗𝅥.",
    syllables: "ta-a-a",
    hits: [0],
    sustainBeats: 2.4,
    tag: "三拍"
  },
  {
    id: "two-quarters",
    name: "两个四分音符",
    beats: 2,
    section: "A",
    density: "medium",
    mood: "稳稳前进",
    glyph: "♩♩",
    syllables: "ta ta",
    hits: [0, 1],
    sustainBeats: 0.28,
    tag: "整齐"
  },
  {
    id: "three-quarters",
    name: "三个四分音符",
    beats: 3,
    section: "B",
    density: "open",
    mood: "三拍舒展",
    glyph: "♩♩♩",
    syllables: "ta ta ta",
    hits: [0, 1, 2],
    sustainBeats: 0.28,
    tag: "三拍"
  },
  {
    id: "quarter-rest",
    name: "四分休止符",
    beats: 1,
    section: "B",
    density: "rest",
    mood: "留白、呼吸",
    glyph: "休",
    syllables: "休",
    hits: [],
    sustainBeats: 0,
    tag: "停一拍"
  }
];

export function getNotationCard(cardId) {
  const card = notationCards.find((item) => item.id === cardId);
  if (!card) {
    throw new Error(`未知谱例卡：${cardId}`);
  }
  return card;
}

export function getAllowedBlocksForMeter(meter) {
  const capacity = meter === "3/4" ? 3 : 2;
  return notationCards.filter((card) => card.beats <= capacity);
}

export function getPlaybackEvents(cardId, startBeat = 0) {
  const card = getNotationCard(cardId);
  return card.hits.map((hitOffset, index) => ({
    beat: startBeat + hitOffset,
    accent: index === 0
  }));
}
