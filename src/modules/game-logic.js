import { getNotationCard } from "../data/notation-cards.js";

const meterCapacity = {
  "2/4": 2,
  "3/4": 3
};

export function createDefaultComposition({ meter = "2/4", bars = 4 } = {}) {
  return {
    mode: meter === "2/4" ? "欢快段" : "悠扬段",
    meter,
    instrument: "hand-drum",
    feedbackMessage: null,
    bars: Array.from({ length: bars }, (_, index) => ({
      id: `bar-${index + 1}`,
      blocks: [],
      filledBeats: 0,
      capacity: meterCapacity[meter],
      status: "empty"
    }))
  };
}

function withBarStatus(bar) {
  if (bar.filledBeats === 0) {
    return { ...bar, status: "empty" };
  }

  if (bar.filledBeats === bar.capacity) {
    return { ...bar, status: "complete" };
  }

  return { ...bar, status: "partial" };
}

export function addBlockToBar(composition, barIndex, blockId) {
  const card = getNotationCard(blockId);
  const bar = composition.bars[barIndex];

  if (!bar) {
    throw new Error("找不到这个小节");
  }

  if (bar.filledBeats + card.beats > bar.capacity) {
    throw new Error("放不下，换一个短一点的节奏。");
  }

  const nextBars = composition.bars.map((item, index) => {
    if (index !== barIndex) {
      return item;
    }

    return withBarStatus({
      ...item,
      blocks: [...item.blocks, blockId],
      filledBeats: item.filledBeats + card.beats
    });
  });

  return {
    ...composition,
    bars: nextBars
  };
}

export function resetComposition({ meter = "2/4", instrument = "hand-drum", mode } = {}) {
  return {
    ...createDefaultComposition({ meter, bars: 4 }),
    mode: mode ?? (meter === "2/4" ? "欢快段" : "悠扬段"),
    instrument
  };
}

function normalizeComposition(composition) {
  if (!composition?.bars) {
    return createDefaultComposition();
  }

  if (composition.bars.length >= 4) {
    return composition;
  }

  const fresh = createDefaultComposition({ meter: composition.meter ?? "2/4", bars: 4 });
  return {
    ...composition,
    bars: fresh.bars.map((bar, index) => composition.bars[index] ?? bar)
  };
}

export function serializeState(state) {
  return JSON.stringify(state);
}

export function restoreState(serialized) {
  if (!serialized) {
    return null;
  }

  try {
    const parsed = JSON.parse(serialized);
    return {
      ...parsed,
      composition: normalizeComposition(parsed.composition)
    };
  } catch {
    return null;
  }
}

export function createInitialState() {
  return {
    currentView: "home",
    stars: 0,
    beatGame: {
      currentStep: "intro",
      currentMeter: "2/4",
      score: 0,
      streak: 0,
      lastResult: null
    },
    rhythmGame: {
      currentQuestionIndex: 0,
      correctCount: 0,
      completedAnswers: {}
    },
    composition: createDefaultComposition({ meter: "2/4" }),
    settings: {
      soundEnabled: true,
      volume: 0.55,
      reducedMotion: false,
      classroomMode: true
    }
  };
}
