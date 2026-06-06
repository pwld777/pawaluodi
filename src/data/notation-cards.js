export const notationCards = [
  {
    id: "sixteenth-run",
    beats: 1,
    pattern: "sixteenth-run",
    hits: [0, 0.25, 0.5, 0.75],
    sustainBeats: 0.12
  },
  {
    id: "eighth-pair",
    beats: 1,
    pattern: "eighth-pair",
    hits: [0, 0.5],
    sustainBeats: 0.18
  },
  {
    id: "eighth-sixteenth",
    beats: 1,
    pattern: "eighth-sixteenth",
    hits: [0, 0.5, 0.75],
    sustainBeats: 0.16
  },
  {
    id: "sixteenth-eighth",
    beats: 1,
    pattern: "sixteenth-eighth",
    hits: [0, 0.25, 0.5],
    sustainBeats: 0.16
  },
  {
    id: "quarter-note",
    beats: 1,
    pattern: "quarter-note",
    hits: [0],
    sustainBeats: 0.28
  },
  {
    id: "half-note",
    beats: 2,
    pattern: "half-note",
    hits: [0],
    sustainBeats: 1.5
  },
  {
    id: "dotted-half-note",
    beats: 3,
    pattern: "dotted-half-note",
    hits: [0],
    sustainBeats: 2.4
  },
  {
    id: "two-quarters",
    beats: 2,
    pattern: "two-quarters",
    hits: [0, 1],
    sustainBeats: 0.28
  },
  {
    id: "three-quarters",
    beats: 3,
    pattern: "three-quarters",
    hits: [0, 1, 2],
    sustainBeats: 0.28
  },
  {
    id: "quarter-rest",
    beats: 1,
    pattern: "quarter-rest",
    hits: [],
    sustainBeats: 0
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
