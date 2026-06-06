import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";

import { beatGame, evaluateBeatHit, evaluateMeterSwitch } from "../src/data/beat-patterns.js";
import { instruments } from "../src/data/instrument-sounds.js";
import { getAllowedBlocksForMeter, getPlaybackEvents } from "../src/data/notation-cards.js";
import { rhythmQuestions, evaluateRhythmAnswer } from "../src/data/rhythm-questions.js";
import { createDefaultComposition, createInitialState, addBlockToBar, serializeState, restoreState } from "../src/modules/game-logic.js";
import { renderCompositionWorkshop } from "../src/modules/composition-workshop.js";

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

test("3/4 beat evaluation treats the third beat as weak", () => {
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak", "weak"], beatIndex: 2, zone: "rim", offsetMs: 40 }).result, "correct");
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak", "weak"], beatIndex: 2, zone: "center", offsetMs: 40 }).result, "wrong-third-beat");
});

test("meter switch window reports early, correct, and late clicks", () => {
  assert.equal(evaluateMeterSwitch({ elapsedMs: 7200, switchAtMs: 9000, toleranceMs: 1200 }).result, "early");
  assert.equal(evaluateMeterSwitch({ elapsedMs: 9400, switchAtMs: 9000, toleranceMs: 1200 }).result, "correct");
  assert.equal(evaluateMeterSwitch({ elapsedMs: 10800, switchAtMs: 9000, toleranceMs: 1200 }).result, "late");
});

test("rhythm question answers cover meter, density, and style prompts", () => {
  assert.equal(rhythmQuestions.length, 6);
  assert.equal(evaluateRhythmAnswer("meter-two-four", ["strong-weak"]).correct, true);
  assert.equal(evaluateRhythmAnswer("meter-three-four", ["strong-weak-weak"]).correct, true);
  assert.equal(evaluateRhythmAnswer("section-a-main", ["sixteenth-run"]).correct, true);
  assert.equal(evaluateRhythmAnswer("section-b-main", ["half-note"]).correct, true);
  assert.equal(evaluateRhythmAnswer("density-compare", ["dense-a", "open-b"]).correct, true);
  assert.equal(evaluateRhythmAnswer("style-match", ["joyful-a", "lyrical-b"]).correct, true);
});

test("composition defaults to a four-bar student phrase", () => {
  const composition = createDefaultComposition({ meter: "2/4" });
  assert.equal(composition.bars.length, 4);
  assert.equal(composition.bars.every((bar) => bar.capacity === 2), true);
  assert.equal(createInitialState().composition.bars.length, 4);
});

test("composition bars reject overfilled rhythm blocks", () => {
  const composition = createDefaultComposition({ meter: "2/4", bars: 4 });
  const afterHalf = addBlockToBar(composition, 0, "half-note");
  assert.equal(afterHalf.bars[0].filledBeats, 2);
  assert.throws(() => addBlockToBar(afterHalf, 0, "quarter-note"), /放不下/);
});

test("composition allows 3/4 completion with a dotted half note", () => {
  const composition = createDefaultComposition({ meter: "3/4", bars: 4 });
  const next = addBlockToBar(composition, 0, "dotted-half-note");
  assert.equal(next.bars[0].status, "complete");
});

test("rhythm block playback expands internal hits", () => {
  assert.deepEqual(getPlaybackEvents("eighth-pair", 0), [
    { beat: 0, accent: true },
    { beat: 0.5, accent: false }
  ]);
  assert.deepEqual(getPlaybackEvents("sixteenth-run", 1), [
    { beat: 1, accent: true },
    { beat: 1.25, accent: false },
    { beat: 1.5, accent: false },
    { beat: 1.75, accent: false }
  ]);
});

test("composition block filtering keeps oversized 3-beat blocks out of 2/4", () => {
  assert.equal(getAllowedBlocksForMeter("2/4").some((card) => card.id === "dotted-half-note"), false);
  assert.equal(getAllowedBlocksForMeter("3/4").some((card) => card.id === "dotted-half-note"), true);
});

test("composition workshop renders clear beat pits and rhythm-only cards", () => {
  const state = createInitialState();
  const html = renderCompositionWorkshop({ state });

  assert.match(html, /class="beat-pit"/);
  assert.equal((html.match(/class="beat-pit"/g) ?? []).length, 8);
  assert.match(html, /data-piece-beats="2"/);
  assert.match(html, /style="--tray-beats:2"/);
  const blockTray = html.match(/<div class="block-tray">[\s\S]*?<\/div>\s*<\/div>\s*<aside/)?.[0] ?? "";
  assert.match(blockTray, /2 格/);
  assert.doesNotMatch(blockTray, /2 拍/);
  assert.doesNotMatch(blockTray, /ta-ka-di-mi|ta-ti|欢快|舒展|四分音符|二分音符|八分音符|十六分音符/);
});

test("composition workshop exposes four classroom percussion instruments", () => {
  assert.deepEqual(instruments.map((instrument) => instrument.id), ["hand-drum", "woodblock", "tambourine", "shaker"]);
});

test("instrument sample files exist for classroom playback", () => {
  for (const instrument of instruments) {
    assert.equal(existsSync(instrument.sample.strong.replace("./", "")), true, `${instrument.id} strong sample missing`);
    assert.equal(existsSync(instrument.sample.weak.replace("./", "")), true, `${instrument.id} weak sample missing`);
  }
});

test("flower drum uses separate center and surface hit samples", () => {
  const handDrum = instruments.find((instrument) => instrument.id === "hand-drum");
  assert.equal(handDrum.sample.strong, "./assets/audio/percussion/hand-drum-strong.wav");
  assert.equal(handDrum.sample.weak, "./assets/audio/percussion/hand-drum-rim.wav");
  assert.notEqual(handDrum.sample.strong, handDrum.sample.weak);
});

test("state serialization round-trips current view and composition", () => {
  const composition = addBlockToBar(createDefaultComposition({ meter: "2/4", bars: 2 }), 0, "half-note");
  const saved = serializeState({ currentView: "compose", composition });
  const restored = restoreState(saved);
  assert.equal(restored.currentView, "compose");
  assert.equal(restored.composition.bars[0].status, "complete");
});
