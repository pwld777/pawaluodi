export const notationCards = [
  {
    id: "sixteenth-run",
    name: "四个十六分音符",
    beats: 1,
    section: "A",
    density: "dense",
    mood: "欢快、跳动",
    glyph: "♬♬",
    staffMarks: ["note fast", "note fast", "note fast", "note fast"],
    tag: "更密"
  },
  {
    id: "eighth-pair",
    name: "两个八分音符",
    beats: 1,
    section: "A",
    density: "medium",
    mood: "流动",
    glyph: "♪♪",
    staffMarks: ["note", "note"],
    tag: "跳动"
  },
  {
    id: "quarter-note",
    name: "四分音符",
    beats: 1,
    section: "B",
    density: "open",
    mood: "平稳",
    glyph: "♩",
    staffMarks: ["note"],
    tag: "稳定"
  },
  {
    id: "half-note",
    name: "二分音符",
    beats: 2,
    section: "B",
    density: "open",
    mood: "舒展、歌唱",
    glyph: "𝅗𝅥",
    staffMarks: ["note long"],
    tag: "更舒展"
  },
  {
    id: "dotted-half-note",
    name: "附点二分音符",
    beats: 3,
    section: "B",
    density: "long",
    mood: "悠扬、停连",
    glyph: "𝅗𝅥.",
    staffMarks: ["note longer"],
    tag: "长音"
  },
  {
    id: "two-quarters",
    name: "两个四分音符",
    beats: 2,
    section: "A",
    density: "medium",
    mood: "稳稳前进",
    glyph: "♩♩",
    staffMarks: ["note", "note"],
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
    staffMarks: ["note", "note", "note"],
    tag: "三拍"
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

