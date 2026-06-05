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

export function evaluateBeatHit({ pattern, beatIndex, zone, offsetMs, toleranceMs = beatGame.timingToleranceMs }) {
  if (Math.abs(offsetMs) > toleranceMs) {
    return {
      result: "missed",
      message: "漏了一拍，再跟紧光点"
    };
  }

  const expected = expectedBeat(pattern, beatIndex);
  const actual = zoneToBeat[zone];

  if (expected !== actual) {
    return {
      result: "wrong-zone",
      message: expected === "strong" ? "强拍在鼓心" : "弱拍在鼓边"
    };
  }

  return {
    result: "correct",
    message: expected === "strong" ? "准！强拍真稳" : "准！弱拍轻轻走"
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

