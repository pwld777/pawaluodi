import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

import { beatGame, evaluateBeatHit } from "../src/data/beat-patterns.js";
import { compositionInstruments, instruments } from "../src/data/instrument-sounds.js";
import { getAllowedBlocksForMeter, getPlaybackEvents } from "../src/data/notation-cards.js";
import { rhythmQuestions, evaluateRhythmAnswer } from "../src/data/rhythm-questions.js";
import { addBlockToBar, clearCompositionBar, createDefaultComposition, createInitialState, placeBlockInBar, serializeState, restoreState } from "../src/modules/game-logic.js";
import { renderBeatGame } from "../src/modules/beat-game.js";
import { renderCompositionWorkshop } from "../src/modules/composition-workshop.js";

test("beat patterns map 2/4 to strong-weak and 3/4 to strong-weak-weak", () => {
  assert.deepEqual(beatGame.sectionA.pattern, ["strong", "weak"]);
  assert.deepEqual(beatGame.sectionB.pattern, ["strong", "weak", "weak"]);
});

test("beat hit evaluation accepts correct zones without fixed tempo", () => {
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 0, zone: "center", offsetMs: 9999 }).result, "correct");
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 1, zone: "rim", offsetMs: -9999 }).result, "correct");
});

test("beat hit evaluation distinguishes reversed strong and weak zones", () => {
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 0, zone: "rim", offsetMs: 40 }).result, "wrong-zone");
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak"], beatIndex: 1, zone: "center", offsetMs: 420 }).result, "wrong-zone");
});

test("beat game screen does not reveal strong and weak answers", () => {
  const html = renderBeatGame({
    state: createInitialState(),
    setState: () => {},
    onReward: () => {}
  });
  const visibleText = html
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<[^>]+>/g, "");

  assert.match(html, /data-drum-surface/);
  assert.match(html, /data-beat-dot/);
  assert.doesNotMatch(visibleText, /强|弱|鼓心|鼓边/);
  assert.doesNotMatch(html, /aria-label="[^"]*(强|弱|鼓心|鼓边)[^"]*"/);
});

test("3/4 beat evaluation treats the third beat as weak", () => {
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak", "weak"], beatIndex: 2, zone: "rim", offsetMs: 40 }).result, "correct");
  assert.equal(evaluateBeatHit({ pattern: ["strong", "weak", "weak"], beatIndex: 2, zone: "center", offsetMs: 40 }).result, "wrong-third-beat");
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
  assert.equal(composition.activeBarIndex, 0);
  assert.equal(composition.isComplete, false);
  assert.equal(createInitialState().composition.bars.length, 4);
});

test("composition bars reject overfilled rhythm blocks", () => {
  const composition = createDefaultComposition({ meter: "2/4", bars: 4 });
  const afterHalf = addBlockToBar(composition, 0, "half-note");
  assert.equal(afterHalf.bars[0].filledBeats, 2);
  assert.equal(afterHalf.activeBarIndex, 1);
  assert.throws(() => addBlockToBar(afterHalf, 0, "quarter-note"), /放不下/);
});

test("composition advances one active bar at a time", () => {
  const start = createDefaultComposition({ meter: "2/4", bars: 2 });
  const first = addBlockToBar(start, 0, "quarter-note");
  assert.equal(first.activeBarIndex, 0);
  const second = addBlockToBar(first, 0, "quarter-note");
  assert.equal(second.activeBarIndex, 1);
  assert.equal(second.isComplete, false);
  const done = addBlockToBar(second, 1, "half-note");
  assert.equal(done.activeBarIndex, 1);
  assert.equal(done.isComplete, true);
});

test("composition bars can be replaced and cleared directly", () => {
  const start = createDefaultComposition({ meter: "2/4", bars: 4 });
  const filled = placeBlockInBar(start, 2, "half-note");
  assert.equal(filled.bars[2].status, "complete");
  assert.deepEqual(filled.bars[2].blocks, ["half-note"]);
  assert.equal(filled.activeBarIndex, 2);

  const replaced = placeBlockInBar(filled, 2, "quarter-note");
  assert.equal(replaced.bars[2].status, "partial");
  assert.equal(replaced.bars[2].filledBeats, 1);
  assert.deepEqual(replaced.bars[2].blocks, ["quarter-note"]);

  const cleared = clearCompositionBar(replaced, 2);
  assert.equal(cleared.bars[2].status, "empty");
  assert.equal(cleared.bars[2].filledBeats, 0);
  assert.deepEqual(cleared.bars[2].blocks, []);
});

test("composition allows 3/4 completion with a dotted half note", () => {
  const composition = createDefaultComposition({ meter: "3/4", bars: 4 });
  const next = addBlockToBar(composition, 0, "dotted-half-note");
  assert.equal(next.bars[0].status, "complete");
});

test("rhythm block playback expands internal hits", () => {
  assert.deepEqual(getPlaybackEvents("eighth-pair", 0), [
    { beat: 0, accent: true, sustainBeats: 0.18 },
    { beat: 0.5, accent: false, sustainBeats: 0.18 }
  ]);
  assert.deepEqual(getPlaybackEvents("sixteenth-run", 1), [
    { beat: 1, accent: true, sustainBeats: 0.12 },
    { beat: 1.25, accent: false, sustainBeats: 0.12 },
    { beat: 1.5, accent: false, sustainBeats: 0.12 },
    { beat: 1.75, accent: false, sustainBeats: 0.12 }
  ]);
  assert.deepEqual(getPlaybackEvents("eighth-sixteenth", 0), [
    { beat: 0, accent: true, sustainBeats: 0.16 },
    { beat: 0.5, accent: false, sustainBeats: 0.16 },
    { beat: 0.75, accent: false, sustainBeats: 0.16 }
  ]);
  assert.deepEqual(getPlaybackEvents("sixteenth-eighth", 0), [
    { beat: 0, accent: true, sustainBeats: 0.16 },
    { beat: 0.25, accent: false, sustainBeats: 0.16 },
    { beat: 0.5, accent: false, sustainBeats: 0.16 }
  ]);
  assert.deepEqual(getPlaybackEvents("quarter-note", 0), [
    { beat: 0, accent: true, sustainBeats: 0.85 }
  ]);
  assert.deepEqual(getPlaybackEvents("half-note", 0), [
    { beat: 0, accent: true, sustainBeats: 2 }
  ]);
  assert.deepEqual(getPlaybackEvents("dotted-half-note", 0), [
    { beat: 0, accent: true, sustainBeats: 3 }
  ]);
});

test("composition block filtering keeps oversized 3-beat blocks out of 2/4", () => {
  assert.equal(getAllowedBlocksForMeter("2/4").some((card) => card.id === "dotted-half-note"), false);
  assert.equal(getAllowedBlocksForMeter("3/4").some((card) => card.id === "dotted-half-note"), true);
});

test("composition workshop renders clear beat pits and rhythm-only cards", () => {
  const state = createInitialState();
  const html = renderCompositionWorkshop({ state });

  assert.match(html, /compose-game-shell/);
  assert.match(html, /data-compose-game-stage/);
  assert.match(html, /four-bar-board/);
  assert.match(html, /class="compose-bar-stage/);
  assert.equal((html.match(/class="compose-bar-stage/g) ?? []).length, 4);
  assert.match(html, /class="compose-beat-pit"/);
  assert.equal((html.match(/class="compose-beat-pit"/g) ?? []).length, 8);
  assert.equal((html.match(/data-clear-bar/g) ?? []).length, 4);
  assert.match(html, /data-clear-composition/);
  assert.match(html, /compose-action-dock/);
  assert.match(html, /data-play-composition/);
  assert.match(html, /compose-instrument-row/);
  assert.equal((html.match(/data-instrument=/g) ?? []).length, 4);
  assert.doesNotMatch(html, /compose-award/);
  assert.doesNotMatch(html, /<details class="compose-settings">/);
  assert.doesNotMatch(html, /闯关星标|真实音色|准备展示|把节奏块放进空坑|每小节刚好填满/);
  assert.match(html, /data-piece-beats="2"/);
  assert.match(html, /style="--tray-beats:2"/);
  const blockTray = html.match(/<div class="block-tray compose-main-tray">[\s\S]*?<\/div>\s*<\/section>/)?.[0] ?? "";
  assert.match(blockTray, /data-block-id="eighth-sixteenth"/);
  assert.match(blockTray, /data-block-id="sixteenth-eighth"/);
  assert.match(blockTray, /2 格/);
  assert.doesNotMatch(blockTray, /2 拍/);
  assert.doesNotMatch(blockTray, /ta-ka-di-mi|ta-ti|欢快|舒展|四分音符|二分音符|八分音符|十六分音符/);
});

test("composition workshop keeps instruments in the top strip", () => {
  const html = renderCompositionWorkshop({ state: createInitialState() });
  const topStrip = html.match(/<div class="compose-top-strip">[\s\S]*?<\/div>\s*<p class="feedback-pill/)?.[0] ?? "";

  assert.match(topStrip, /compose-instrument-row/);
  assert.equal((topStrip.match(/data-instrument=/g) ?? []).length, 4);
});

test("composition workshop edits bars without full rerender hooks", () => {
  const source = readFileSync("src/modules/composition-workshop.js", "utf8");
  const updateCompositionSource = source.match(/function updateComposition[\s\S]*?\n}\n\nexport function renderCompositionWorkshop/)?.[0] ?? "";
  const instrumentListenerSource = source.match(/root\.querySelectorAll\("\[data-instrument\]"[\s\S]*?\n  }\);/)?.[0] ?? "";

  assert.doesNotMatch(updateCompositionSource, /\brender\(\);/);
  assert.doesNotMatch(instrumentListenerSource, /\brender\(\);/);
});

test("composition playback passes note sustain to instruments", () => {
  const source = readFileSync("src/modules/composition-workshop.js", "utf8");
  assert.match(source, /sustainSeconds:\s*event\.sustainBeats \* beatMs \/ 1000/);
});

test("bottom navigation uses only page names", () => {
  const source = readFileSync("src/modules/navigation.js", "utf8");
  assert.doesNotMatch(source, /const icons|nav-icon|home:\s*"会"|beat:\s*"鼓"|rhythm:\s*"花"|compose:\s*"乐"|showcase:\s*"奖"/);
  assert.match(source, /button\.textContent = labels\[view\]/);
});

test("online classroom shell loads Phaser for the composition game stage", () => {
  const html = readFileSync("index.html", "utf8");
  assert.match(html, /phaser@3\.90\.0/);
});

test("app preserves the Phaser stage host when composition rerenders", () => {
  const appSource = readFileSync("src/app.js", "utf8");
  assert.match(appSource, /existingStage.*data-compose-game-stage/s);
  assert.match(appSource, /nextStage\.replaceWith\(existingStage\)/);
});

test("composition workshop exposes four classroom percussion instruments", () => {
  assert.deepEqual(compositionInstruments.map((instrument) => instrument.id), ["bass-drum", "triangle", "tambourine", "shaker"]);
  assert.deepEqual(compositionInstruments.map((instrument) => instrument.name), ["大鼓", "三角铁", "铃鼓", "沙锤"]);
});

test("instrument sample files exist for classroom playback", () => {
  for (const instrument of instruments) {
    assert.equal(existsSync(instrument.sample.strong.replace("./", "")), true, `${instrument.id} strong sample missing`);
    assert.equal(existsSync(instrument.sample.weak.replace("./", "")), true, `${instrument.id} weak sample missing`);
  }
});

test("composition bass drum and triangle use real recorded samples only", () => {
  const bassDrum = instruments.find((instrument) => instrument.id === "bass-drum");
  const triangle = instruments.find((instrument) => instrument.id === "triangle");
  assert.equal(bassDrum.sample.realOnly, true);
  assert.equal(triangle.sample.realOnly, true);
  assert.ok(statSync(bassDrum.sample.strong.replace("./", "")).size > 1_000_000);
  assert.ok(statSync(bassDrum.sample.weak.replace("./", "")).size > 1_000_000);
  assert.ok(statSync(triangle.sample.strong.replace("./", "")).size > 1_000_000);
  assert.ok(statSync(triangle.sample.weak.replace("./", "")).size > 1_000_000);
});

test("flower drum uses separate center and surface hit samples", () => {
  const handDrum = instruments.find((instrument) => instrument.id === "hand-drum");
  assert.equal(handDrum.sample.strong, "./assets/audio/percussion/hand-drum-strong.wav");
  assert.equal(handDrum.sample.weak, "./assets/audio/percussion/hand-drum-rim.wav");
  assert.notEqual(handDrum.sample.strong, handDrum.sample.weak);
});

test("old composition instruments migrate to the new classroom set", () => {
  const savedHandDrum = serializeState({ currentView: "compose", composition: { ...createDefaultComposition(), instrument: "hand-drum" } });
  const savedWoodblock = serializeState({ currentView: "compose", composition: { ...createDefaultComposition(), instrument: "woodblock" } });
  assert.equal(restoreState(savedHandDrum).composition.instrument, "bass-drum");
  assert.equal(restoreState(savedWoodblock).composition.instrument, "triangle");
});

test("state serialization round-trips current view and composition", () => {
  const composition = addBlockToBar(createDefaultComposition({ meter: "2/4", bars: 2 }), 0, "half-note");
  const saved = serializeState({ currentView: "compose", composition });
  const restored = restoreState(saved);
  assert.equal(restored.currentView, "compose");
  assert.equal(restored.composition.bars[0].status, "complete");
});
