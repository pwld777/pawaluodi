export const beatGame = {
  sectionA: {
    name: "第一段 欢快段",
    meter: "2/4",
    pattern: ["strong", "weak"],
    bpm: 96,
    bars: 8
  },
  sectionB: {
    name: "第二段 悠扬段",
    meter: "3/4",
    pattern: ["strong", "weak", "weak"],
    bpm: 72,
    bars: 8
  },
  timingToleranceMs: 260,
  switchChallenge: {
    switchAtMs: 9000,
    toleranceMs: 1200
  }
};

const zoneToBeat = {
  center: "strong",
  rim: "weak"
};

export function expectedBeat(pattern, beatIndex) {
  return pattern[beatIndex % pattern.length];
}

export function evaluateBeatHit({ pattern, beatIndex, zone }) {
  const expected = expectedBeat(pattern, beatIndex);
  const actual = zoneToBeat[zone];

  if (expected !== actual) {
    if (pattern.length === 3 && beatIndex % pattern.length === 2 && actual === "strong") {
      return {
        result: "wrong-third-beat",
        message: "不对，从头再来。"
      };
    }

    return {
      result: "wrong-zone",
      message: "不对，再听一次。"
    };
  }

  return {
    result: "correct",
    message: "对了！"
  };
}

export function evaluateMeterSwitch({ elapsedMs, switchAtMs, toleranceMs }) {
  const delta = elapsedMs - switchAtMs;

  if (Math.abs(delta) <= toleranceMs) {
    return {
      result: "correct",
      message: "找到了变换拍子处"
    };
  }

  if (delta < 0) {
    return {
      result: "early",
      message: "再等等，第二段还没来"
    };
  }

  return {
    result: "late",
    message: "变拍已经过去了，再来一次"
  };
}
