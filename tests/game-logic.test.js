import test from "node:test";
import assert from "node:assert/strict";

import { beatGame, evaluateBeatHit, evaluateMeterSwitch } from "../src/data/beat-patterns.js";
import { instruments } from "../src/data/instrument-sounds.js";
import { getAllowedBlocksForMeter } from "../src/data/notation-cards.js";
import { rhythmQuestions, evaluateRhythmAnswer } from "../src/data/rhythm-questions.js";
import { createDefaultComposition, addBlockToBar, serializeState, restoreState } from "../src/modules/game-logic.js";

test("beat patterns map 2/4 to strong-weak and 3/4 to strong-weak-weak", () => {
  assert.deepEqual(beatGame.sectionA.pattern, ["strong", "weak"]);
  assert.deepEqual(beatGame.sectionB.pattern, ["strong", "weak", "weak"]);
});

test("beat hit evaluation accepts correct zone inside timing window", () => {
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 0, zone: "center", offsetMs: 80 }).result, "correct");
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 1, zone: "rim", offsetMs: -120 }).result, "correct");
});

test("beat hit evaluation distinguishes reversed zones from missed timing", () => {
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 0, zone: "rim", offsetMs: 40 }).result, "wrong-zone");
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 1, zone: "rim", offsetMs: 420 }).result, "missed");
});

test("meter switch window reports early, correct, and late clicks", () => {
  assert.equal(evaluateMeterSwitch({ elapsedMs: 7200, switchAtMs: 9000, toleranceMs: 1200 }).result, "early");
  assert.equal(evaluateMeterSwitch({ elapsedMs: 9400, switchAtMs: 9000, toleranceMs: 1200 }).result, "correct");
  assert.equal(evaluateMeterSwitch({ elapsedMs: 10800, switchAtMs: 9000, toleranceMs: 1200 }).result, "late");
});

test("rhythm question answers cover the four planned classroom prompts", () => {
  assert.equal(rhythmQuestions.length, 4);
  assert.equal(evaluateRhythmAnswer(rhythmQuestions[0].id, ["sixteenth-run"]).correct, true);
  assert.equal(evaluateRhythmAnswer(rhythmQuestions[1].id, ["half-note"]).correct, true);
  assert.equal(evaluateRhythmAnswer(rhythmQuestions[2].id, ["dense-a", "open-b"]).correct, true);
  assert.equal(evaluateRhythmAnswer(rhythmQuestions[3].id, ["joyful-a", "lyrical-b"]).correct, true);
});

test("composition bars reject overfilled note blocks", () => {
  const composition = createDefaultComposition({ meter: "2/4", bars: 2 });
  const afterHalf = addBlockToBar(composition, 0, "half-note");
  assert.equal(afterHalf.bars[0].filledBeats, 2);
  assert.throws(() => addBlockToBar(afterHalf, 0, "quarter-note"), /放不下/);
});

test("composition allows 3/4 completion with a dotted half note", () => {
  const composition = createDefaultComposition({ meter: "3/4", bars: 2 });
  const next = addBlockToBar(composition, 0, "dotted-half-note");
  assert.equal(next.bars[0].status, "complete");
});

test("composition block filtering keeps oversized 3-beat blocks out of 2/4", () => {
  assert.equal(getAllowedBlocksForMeter("2/4").some((card) => card.id === "dotted-half-note"), false);
  assert.equal(getAllowedBlocksForMeter("3/4").some((card) => card.id === "dotted-half-note"), true);
});

test("composition workshop exposes four classroom percussion instruments", () => {
  assert.deepEqual(instruments.map((instrument) => instrument.id), ["hand-drum", "woodblock", "tambourine", "shaker"]);
});

test("state serialization round-trips current view and composition", () => {
  const composition = addBlockToBar(createDefaultComposition({ meter: "2/4", bars: 2 }), 0, "half-note");
  const saved = serializeState({ currentView: "compose", composition });
  const restored = restoreState(saved);
  assert.equal(restored.currentView, "compose");
  assert.equal(restored.composition.bars[0].status, "complete");
});
