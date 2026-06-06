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
    activeBarIndex: 0,
    isComplete: false,
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

function refreshCompositionProgress(composition, bars, fallbackBarIndex = 0, preferFallback = false) {
  const isComplete = bars.every((item) => item.status === "complete");
  const nextOpenBarIndex = bars.findIndex((item) => item.status !== "complete");

  return {
    ...composition,
    activeBarIndex: preferFallback || isComplete ? fallbackBarIndex : (nextOpenBarIndex === -1 ? fallbackBarIndex : nextOpenBarIndex),
    isComplete,
    bars
  };
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

  return refreshCompositionProgress(composition, nextBars, barIndex);
}

export function placeBlockInBar(composition, barIndex, blockId) {
  const card = getNotationCard(blockId);
  const bar = composition.bars[barIndex];

  if (!bar) {
    throw new Error("找不到这个小节");
  }

  if (card.beats > bar.capacity) {
    throw new Error("放不下，换一个短一点的节奏。");
  }

  const shouldReplace = bar.filledBeats + card.beats > bar.capacity || bar.status === "complete";
  const nextBars = composition.bars.map((item, index) => {
    if (index !== barIndex) {
      return item;
    }

    return withBarStatus({
      ...item,
      blocks: shouldReplace ? [blockId] : [...item.blocks, blockId],
      filledBeats: shouldReplace ? card.beats : item.filledBeats + card.beats
    });
  });

  return refreshCompositionProgress(composition, nextBars, barIndex, true);
}

export function clearCompositionBar(composition, barIndex) {
  const bar = composition.bars[barIndex];

  if (!bar) {
    throw new Error("找不到这个小节");
  }

  const nextBars = composition.bars.map((item, index) => {
    if (index !== barIndex) {
      return item;
    }

    return withBarStatus({
      ...item,
      blocks: [],
      filledBeats: 0
    });
  });

  return refreshCompositionProgress(composition, nextBars, barIndex, true);
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

  const fresh = createDefaultComposition({ meter: composition.meter ?? "2/4", bars: 4 });
  const bars = composition.bars.length >= 4
    ? composition.bars
    : fresh.bars.map((bar, index) => composition.bars[index] ?? bar);
  const isComplete = bars.every((bar) => bar.status === "complete");
  const activeBarIndex = Number.isInteger(composition.activeBarIndex)
    ? Math.min(Math.max(composition.activeBarIndex, 0), bars.length - 1)
    : Math.max(0, bars.findIndex((bar) => bar.status !== "complete"));

  return {
    ...composition,
    activeBarIndex: activeBarIndex === -1 ? bars.length - 1 : activeBarIndex,
    isComplete,
    bars
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
      lastResult: null,
      sequenceIndex: 0
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
