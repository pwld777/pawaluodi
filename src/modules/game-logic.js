import { getNotationCard } from "../data/notation-cards.js";
import { rhythmQuestions } from "../data/rhythm-questions.js";
import { maxStars, starLevelIds } from "./feedback.js?v=tablet-safe-20";

const meterCapacity = {
  "2/4": 2,
  "3/4": 3
};

const compositionInstrumentFallbacks = {
  "hand-drum": "bass-drum",
  woodblock: "triangle"
};

function normalizeCompositionInstrument(instrument) {
  return compositionInstrumentFallbacks[instrument] ?? instrument ?? "bass-drum";
}

export function createDefaultComposition({ meter = "2/4", bars = 4 } = {}) {
  return {
    mode: meter === "2/4" ? "欢快段" : "悠扬段",
    meter,
    instrument: "bass-drum",
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

export function resetComposition({ meter = "2/4", instrument = "bass-drum", mode } = {}) {
  return {
    ...createDefaultComposition({ meter, bars: 4 }),
    mode: mode ?? (meter === "2/4" ? "欢快段" : "悠扬段"),
    instrument: normalizeCompositionInstrument(instrument)
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
    instrument: normalizeCompositionInstrument(composition.instrument),
    activeBarIndex: activeBarIndex === -1 ? bars.length - 1 : activeBarIndex,
    isComplete,
    bars
  };
}

function normalizeRhythmGame(rhythmGame) {
  const questionIds = new Set(rhythmQuestions.map((question) => question.id));
  const currentQuestionIndex = Number.isInteger(rhythmGame?.currentQuestionIndex)
    ? Math.min(Math.max(rhythmGame.currentQuestionIndex, 0), rhythmQuestions.length - 1)
    : 0;
  const correctCount = Number.isInteger(rhythmGame?.correctCount)
    ? Math.min(Math.max(rhythmGame.correctCount, 0), rhythmQuestions.length)
    : 0;
  const completedAnswers = Object.fromEntries(
    Object.entries(rhythmGame?.completedAnswers ?? {}).filter(([questionId]) => questionIds.has(questionId))
  );

  return {
    currentQuestionIndex,
    correctCount,
    completedAnswers
  };
}

function normalizeStarCount(stars) {
  return Math.min(maxStars, Math.max(0, Number.isFinite(stars) ? Math.trunc(stars) : 0));
}

function normalizeAwardedLevelStars(awardedLevelStars) {
  return Object.fromEntries(
    starLevelIds
      .filter((levelId) => awardedLevelStars?.[levelId])
      .map((levelId) => [levelId, true])
  );
}

function completedLevelStarsFromProgress({ beatGame, rhythmGame, composition }) {
  return Object.fromEntries([
    beatGame?.score >= 4 ? ["beat", true] : null,
    rhythmGame?.correctCount >= rhythmQuestions.length ? ["rhythm", true] : null,
    composition?.isComplete || composition?.bars?.every((bar) => bar.status === "complete") ? ["compose", true] : null
  ].filter(Boolean));
}

function keepOnlyCompletedLevelStars(awardedLevelStars, completedLevelStars) {
  return Object.fromEntries(
    starLevelIds
      .filter((levelId) => awardedLevelStars[levelId] && completedLevelStars[levelId])
      .map((levelId) => [levelId, true])
  );
}

export function normalizeProgressStars(state) {
  const completedLevelStars = completedLevelStarsFromProgress(state);
  const awardedLevelStars = keepOnlyCompletedLevelStars(
    normalizeAwardedLevelStars(state.awardedLevelStars),
    completedLevelStars
  );

  return {
    ...state,
    stars: normalizeStarCount(Object.keys(awardedLevelStars).length),
    awardedLevelStars
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
    const rhythmGame = normalizeRhythmGame(parsed.rhythmGame);
    const composition = normalizeComposition(parsed.composition);
    const hasAwardedLevelStars = Object.prototype.hasOwnProperty.call(parsed, "awardedLevelStars");
    const completedLevelStars = completedLevelStarsFromProgress({ beatGame: parsed.beatGame, rhythmGame, composition });
    const awardedLevelStars = hasAwardedLevelStars
      ? normalizeAwardedLevelStars(parsed.awardedLevelStars)
      : completedLevelStars;
    const completedAwardedLevelStars = keepOnlyCompletedLevelStars(awardedLevelStars, completedLevelStars);

    return {
      ...parsed,
      stars: normalizeStarCount(Object.keys(completedAwardedLevelStars).length),
      awardedLevelStars: completedAwardedLevelStars,
      rhythmGame,
      composition
    };
  } catch {
    return null;
  }
}

export function createInitialState() {
  return {
    currentView: "home",
    stars: 0,
    awardedLevelStars: {},
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
